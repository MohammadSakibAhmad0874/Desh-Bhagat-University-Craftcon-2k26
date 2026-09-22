const { google } = require('googleapis');
const { db } = require('./db');
require('dotenv').config();

/**
 * CRAFTCON '26 GAMING ARENA — GOOGLE SHEETS EXPORT SERVICE
 * Primary Source of Truth: Turso DB.
 * Google Sheets: Admin / Reporting Copy.
 * Strictly Server-Side Integration via Google Service Account API.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const REGISTRATIONS_HEADERS = [
  'Registration ID',
  'Registration Date',
  'Category',
  'Game',
  'Registration Type',
  'Team Name',
  'College',
  'Captain Name',
  'Captain Email',
  'Captain Phone',
  'Player Count',
  'Amount',
  'Currency',
  'Payment Status',
  'Razorpay Order ID',
  'Razorpay Payment ID',
  'Registration Status',
  'Created At',
  'Confirmed At'
];

const PLAYERS_HEADERS = [
  'Registration ID',
  'Player ID',
  'Player Name',
  'In-Game Name',
  'Game UID',
  'Email',
  'Phone',
  'Role',
  'Game',
  'Created At'
];

/**
 * Get authenticated Google Sheets API client
 */
function getGoogleAuthClient() {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Support environment variable newline formats (\n in Vercel string vs real multiline)
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES
    });
    return auth;
  } catch (err) {
    console.error('❌ [GoogleSheets] Authentication client initialization error:', err.message);
    return null;
  }
}

/**
 * Gets Spreadsheet ID from environment
 */
function getSpreadsheetId() {
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
}

/**
 * Ensure worksheets and headers exist in Google Spreadsheet
 */
async function ensureWorksheetsAndHeaders(sheets, spreadsheetId) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties.title);

    const requests = [];
    if (!existingSheets.includes('Registrations')) {
      requests.push({ addSheet: { properties: { title: 'Registrations' } } });
    }
    if (!existingSheets.includes('Players')) {
      requests.push({ addSheet: { properties: { title: 'Players' } } });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      console.log('📄 [GoogleSheets] Created missing worksheets ("Registrations", "Players").');
    }

    // Verify and add header rows if missing
    const regHeaderRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Registrations!A1:S1'
    });

    if (!regHeaderRes.data.values || regHeaderRes.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Registrations!A1:S1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [REGISTRATIONS_HEADERS] }
      });
    }

    const playerHeaderRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A1:J1'
    });

    if (!playerHeaderRes.data.values || playerHeaderRes.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Players!A1:J1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [PLAYERS_HEADERS] }
      });
    }
  } catch (err) {
    console.warn('⚠️ [GoogleSheets] Worksheet header verification notice:', err.message);
  }
}

/**
 * Check if a Registration ID already exists in Google Sheets (Idempotency)
 */
async function findRegistrationRow(sheets, spreadsheetId, registrationId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Registrations!A:A'
    });

    const rows = res.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === registrationId) {
        return i + 1; // 1-based row index
      }
    }
    return -1;
  } catch (err) {
    console.warn('⚠️ [GoogleSheets] findRegistrationRow notice:', err.message);
    return -1;
  }
}

/**
 * Sync a single confirmed registration from Turso to Google Sheets
 */
async function syncConfirmedRegistration(registrationId) {
  if (!registrationId) {
    return { success: false, error: 'Registration ID required.' };
  }

  try {
    // 1. Fetch confirmed registration from Turso DB
    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [registrationId]
    });

    if (!regRes.rows || regRes.rows.length === 0) {
      console.warn(`⚠️ [GoogleSheets] Registration ${registrationId} not found in Turso.`);
      return { success: false, error: 'Registration not found in database.' };
    }

    const reg = regRes.rows[0];

    // Only export VERIFIED / CONFIRMED registrations with paid status
    if (reg.registration_status !== 'CONFIRMED' && reg.payment_status !== 'PAID' && reg.payment_status !== 'CAPTURED') {
      console.log(`ℹ️ [GoogleSheets] Skipping sync for unconfirmed registration ${registrationId} (${reg.registration_status}/${reg.payment_status})`);
      return { success: false, error: 'Registration is not confirmed.' };
    }

    // Fetch players roster from Turso
    const playersRes = await db.execute({
      sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
      args: [registrationId]
    });
    const players = playersRes.rows || [];

    // 2. Check Google Credentials
    const auth = getGoogleAuthClient();
    const spreadsheetId = getSpreadsheetId();

    if (!auth || !spreadsheetId) {
      const missingReason = !spreadsheetId ? 'Missing GOOGLE_SHEETS_SPREADSHEET_ID' : 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY';
      console.warn(`⚠️ [GoogleSheets] Cannot sync ${registrationId}: ${missingReason}. Registration remains CONFIRMED in Turso.`);
      
      await db.execute({
        sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
        args: ['PENDING', missingReason, registrationId]
      });

      return { success: false, error: missingReason, status: 'PENDING' };
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // 3. Ensure Worksheets & Headers exist
    await ensureWorksheetsAndHeaders(sheets, spreadsheetId);

    // 4. Idempotency Check: Check if registration already exists in Sheets
    const existingRowIndex = await findRegistrationRow(sheets, spreadsheetId, registrationId);

    const regDate = reg.confirmed_at 
      ? String(reg.confirmed_at).split('T')[0] 
      : (reg.created_at ? String(reg.created_at).split('T')[0] : new Date().toISOString().split('T')[0]);

    const registrationRow = [
      reg.registration_id,
      regDate,
      reg.category || 'Online',
      reg.game || 'BGMI',
      reg.registration_type || 'Squad',
      reg.team_name || '',
      reg.college || '',
      reg.captain_name || '',
      reg.captain_email || '',
      reg.captain_phone || '',
      reg.player_count || 4,
      reg.total_amount || reg.amount || 200,
      reg.currency || 'INR',
      reg.payment_status || 'CAPTURED',
      reg.razorpay_order_id || reg.order_id || '',
      reg.razorpay_payment_id || reg.payment_id || '',
      reg.registration_status || 'CONFIRMED',
      String(reg.created_at || new Date().toISOString()),
      String(reg.confirmed_at || new Date().toISOString())
    ];

    if (existingRowIndex > 0) {
      console.log(`ℹ️ [GoogleSheets] Registration ${registrationId} already exists in Sheets at row ${existingRowIndex}. Updating row...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registrations!A${existingRowIndex}:S${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [registrationRow] }
      });
    } else {
      console.log(`➕ [GoogleSheets] Appending new registration ${registrationId} to Registrations sheet...`);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Registrations!A:S',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [registrationRow] }
      });

      // Append Players Roster if new registration
      if (players.length > 0) {
        const playerRows = players.map((p, idx) => [
          registrationId,
          `P${p.player_index || idx + 1}`,
          p.full_name || p.name || '',
          p.in_game_name || 'N/A',
          p.game_uid || 'N/A',
          p.email || reg.captain_email || '',
          p.phone || reg.captain_phone || '',
          p.role || (idx === 0 ? 'Captain' : 'Player'),
          reg.game || 'BGMI',
          String(p.created_at || new Date().toISOString())
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Players!A:J',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: playerRows }
        });
      }
    }

    // 5. Update Turso DB status to SYNCED
    await db.execute({
      sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_synced_at = CURRENT_TIMESTAMP, google_sheets_sync_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
      args: ['SYNCED', registrationId]
    });

    console.log(`✅ [GoogleSheets] Registration ${registrationId} successfully synced to Google Sheets.`);
    return { success: true, registrationId, status: 'SYNCED' };

  } catch (err) {
    console.error(`❌ [GoogleSheets Error] Failed to sync registration ${registrationId}:`, err.message);

    // Record failure in Turso DB without throwing (database remains confirmed)
    try {
      await db.execute({
        sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
        args: ['FAILED', err.message, registrationId]
      });
    } catch (dbErr) {
      console.warn('DB update sync error notice:', dbErr.message);
    }

    return { success: false, error: err.message, status: 'FAILED' };
  }
}

/**
 * Retry syncing all pending or failed registrations from Turso DB to Google Sheets
 */
async function syncAllPendingRegistrations() {
  try {
    const pendingRes = await db.execute(`
      SELECT registration_id FROM registrations 
      WHERE registration_status = 'CONFIRMED' 
        AND (google_sheets_sync_status = 'PENDING' OR google_sheets_sync_status = 'FAILED' OR google_sheets_sync_status IS NULL)
    `);

    const rows = pendingRes.rows || [];
    console.log(`🔄 [GoogleSheets Sync Retry] Found ${rows.length} confirmed registrations to sync...`);

    const results = [];
    for (const row of rows) {
      const res = await syncConfirmedRegistration(row.registration_id);
      results.push({ registrationId: row.registration_id, result: res });
    }

    return { success: true, total: rows.length, results };
  } catch (err) {
    console.error('❌ [GoogleSheets Retry Error]:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getGoogleAuthClient,
  getSpreadsheetId,
  syncConfirmedRegistration,
  syncAllPendingRegistrations
};
