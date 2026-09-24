const { google } = require('googleapis');
const { db } = require('./db');
require('dotenv').config();

/**
 * CRAFTCON '26 — GOOGLE SHEETS EXPORT SERVICE
 * Dual-Mode Support:
 * Mode 1: Google Apps Script Web App URL (Zero-config, instantly connects to Google Sheet)
 * Mode 2: Google Cloud Service Account API (JWT authentication via googleapis)
 * 
 * Target Google Sheet: https://docs.google.com/spreadsheets/d/1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA/edit
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const HACKATHON_HEADERS = [
  'Registration ID', 'Timestamp', 'Category', 'Biome / Track',
  'Squad / Team Name', 'Squad Size',
  'Leader Name', 'Leader Email', 'Leader Phone', 'College / University',
  'Member 2', 'Member 3', 'Member 4',
  'Project Concept Brief', 'Portfolio / GitHub URL',
  'Payment Status', 'Razorpay Payment ID', 'Payment Done', 'Source'
];

const GAMING_HEADERS = [
  'Registration ID', 'Timestamp', 'Category', 'Game Arena', 'Registration Type',
  'Team / Squad Name', 'College / University',
  'Captain Name', 'Captain Email', 'Captain Phone', 'Captain In-Game ID',
  'Player 2 (Name/IGN)', 'Player 3 (Name/IGN)', 'Player 4 (Name/IGN)', 'Player 5 (Name/IGN)',
  'Total Players', 'Total Fee (INR)', 'UTR / Transaction ID', 'Payment Status',
  'Razorpay Payment ID', 'Payment Done', 'Source'
];

function getSpreadsheetId() {
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA').trim();
}

function getAppsScriptUrl() {
  return (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
}

function getGoogleAuthClient() {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

  if (!clientEmail || !privateKey) return null;
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES
    });
  } catch (err) {
    console.error('❌ [GoogleSheets] Service account auth error:', err.message);
    return null;
  }
}

/**
 * Send registration data directly to Google Apps Script Web App
 */
async function syncViaAppsScript(reg, players = []) {
  const scriptUrl = getAppsScriptUrl();
  if (!scriptUrl) return { success: false, error: 'NO_APPS_SCRIPT_URL' };

  const isHackathon = reg.category === 'HACKATHON' || reg.game === 'HACKATHON';
  const payId = reg.razorpay_payment_id || reg.payment_id || '';
  const isPaid = reg.payment_status === 'PAID' || reg.payment_status === 'VERIFIED' || !!payId;

  // If already paid and we have a payment ID, attempt direct RAZORPAY_UPDATE first
  if (isPaid && payId) {
    try {
      const updatePayload = {
        type: 'RAZORPAY_UPDATE',
        registration_id: reg.registration_id,
        payment_id: payId,
        category: isHackathon ? 'HACKATHON' : 'GAMING'
      };
      const updateRes = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      const updateText = await updateRes.text();
      let updateData = {};
      try { updateData = JSON.parse(updateText); } catch (_) { updateData = { raw: updateText }; }

      if (updateData && updateData.success) {
        console.log(`✅ [GoogleSheets AppsScript] Updated payment status in sheet for ${reg.registration_id} (Razorpay ID: ${payId})`);
        return { success: true, method: 'APPS_SCRIPT_UPDATE', data: updateData };
      }
    } catch (e) {
      console.warn('⚠️ [GoogleSheets AppsScript Update notice]:', e.message);
    }
  }
  
  let payload = {};
  if (isHackathon) {
    payload = {
      type: 'HACKATHON',
      registration_id: reg.registration_id,
      leader_name: reg.captain_name,
      leader_email: reg.captain_email,
      leader_phone: reg.captain_phone,
      college_name: reg.college,
      team_name: reg.team_name,
      team_size: reg.player_count || players.length || 1,
      primary_track: reg.track || reg.game || 'Open Sandbox & Civic Innovation',
      member2: players[1] ? players[1].name : '',
      member3: players[2] ? players[2].name : '',
      member4: players[3] ? players[3].name : '',
      concept_brief: reg.concept_brief || '',
      portfolio_url: reg.portfolio_url || '',
      payment_status: isPaid ? 'PAID' : (reg.payment_status || 'PENDING'),
      razorpay_payment_id: payId,
      payment_done: isPaid ? 'YES' : 'NO',
      source: 'CRAFTCON 2026 Portal'
    };
  } else {
    payload = {
      type: 'GAMING',
      registration_id: reg.registration_id,
      captain_name: reg.captain_name,
      captain_email: reg.captain_email,
      captain_phone: reg.captain_phone,
      captain_ign: players[0] ? (players[0].in_game_name || players[0].game_uid || '') : '',
      college_name: reg.college,
      game: reg.game,
      team_name: reg.team_name,
      registration_type: reg.registration_type || (players.length > 1 ? 'SQUAD' : 'SOLO'),
      player_count: reg.player_count || players.length || 1,
      total_amount: reg.total_amount || reg.amount || 0,
      utr: reg.utr_transaction_id || payId || '',
      payment_status: isPaid ? 'PAID' : (reg.payment_status || 'PENDING'),
      razorpay_payment_id: payId,
      payment_done: isPaid ? 'YES' : 'NO',
      player2: players[1] ? `${players[1].name} (${players[1].in_game_name || ''})` : '',
      player3: players[2] ? `${players[2].name} (${players[2].in_game_name || ''})` : '',
      player4: players[3] ? `${players[3].name} (${players[3].in_game_name || ''})` : '',
      player5: players[4] ? `${players[4].name} (${players[4].in_game_name || ''})` : '',
      players: players,
      source: 'CRAFTCON 2026 Portal'
    };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

    console.log(`✅ [GoogleSheets AppsScript] Pushed registration ${reg.registration_id} to sheet:`, data.message || 'Success');
    return { success: true, method: 'APPS_SCRIPT', data };
  } catch (err) {
    console.error(`❌ [GoogleSheets AppsScript] Failed to push to script URL:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Ensure worksheets and headers exist via Google Sheets API v4
 */
async function ensureWorksheetsAndHeaders(sheets, spreadsheetId) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties.title);

    const requests = [];
    if (!existingSheets.includes('Hackathon_Registrations')) {
      requests.push({ addSheet: { properties: { title: 'Hackathon_Registrations' } } });
    }
    if (!existingSheets.includes('Gaming_Registrations')) {
      requests.push({ addSheet: { properties: { title: 'Gaming_Registrations' } } });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      console.log('📄 [GoogleSheets] Created missing worksheets ("Hackathon_Registrations", "Gaming_Registrations").');
    }

    // Set headers if sheets are newly created
    try {
      const hCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Hackathon_Registrations!A1:Q1' });
      if (!hCheck.data.values || hCheck.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Hackathon_Registrations!A1:Q1',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [HACKATHON_HEADERS] }
        });
      }
    } catch (_) {}

    try {
      const gCheck = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Gaming_Registrations!A1:T1' });
      if (!gCheck.data.values || gCheck.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Gaming_Registrations!A1:T1',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [GAMING_HEADERS] }
        });
      }
    } catch (_) {}

  } catch (err) {
    console.warn('⚠️ [GoogleSheets] Worksheet header verification notice:', err.message);
  }
}

/**
 * Sync a single confirmed registration to Google Sheets
 */
async function syncConfirmedRegistration(registrationId) {
  if (!registrationId) {
    return { success: false, error: 'Registration ID required.' };
  }

  try {
    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [registrationId]
    });

    if (!regRes.rows || regRes.rows.length === 0) {
      console.warn(`⚠️ [GoogleSheets] Registration ${registrationId} not found in database.`);
      return { success: false, error: 'Registration not found in database.' };
    }

    const reg = regRes.rows[0];
    if (reg.registration_status === 'CANCELLED') {
      return { success: false, error: 'Registration is cancelled.' };
    }

    const playersRes = await db.execute({
      sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
      args: [registrationId]
    });
    const players = playersRes.rows || [];

    // Method 1: Try Google Apps Script URL if configured
    if (getAppsScriptUrl()) {
      const asRes = await syncViaAppsScript(reg, players);
      if (asRes.success) {
        await db.execute({
          sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_synced_at = CURRENT_TIMESTAMP, google_sheets_sync_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
          args: ['SYNCED', registrationId]
        });
        return { success: true, registrationId, status: 'SYNCED', method: 'APPS_SCRIPT' };
      }
    }

    // Method 2: Try Google Service Account API client
    const auth = getGoogleAuthClient();
    const spreadsheetId = getSpreadsheetId();

    if (!auth) {
      const infoMsg = getAppsScriptUrl()
        ? 'Apps Script sync returned error'
        : 'Connect Google Sheet by deploying code.gs as Web App and adding GOOGLE_APPS_SCRIPT_URL to .env (Target Sheet: 1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA)';
      
      console.info(`ℹ️ [GoogleSheets] Registration ${registrationId} saved locally in Turso DB. (${infoMsg})`);

      await db.execute({
        sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
        args: ['PENDING', infoMsg, registrationId]
      });

      return { success: true, status: 'PENDING_SHEETS_CONFIG', message: infoMsg };
    }

    const sheets = google.sheets({ version: 'v4', auth });
    await ensureWorksheetsAndHeaders(sheets, spreadsheetId);

    const isHackathon = reg.category === 'HACKATHON' || reg.game === 'HACKATHON';
    const sheetName = isHackathon ? 'Hackathon_Registrations' : 'Gaming_Registrations';

    const timestamp = reg.created_at || new Date().toISOString();
    let rowData = [];

    const payId = reg.razorpay_payment_id || reg.payment_id || '';
    const isPaid = reg.payment_status === 'PAID' || reg.payment_status === 'VERIFIED' || !!payId;

    if (isHackathon) {
      rowData = [
        reg.registration_id,
        timestamp,
        'HACKATHON',
        reg.track || reg.game || 'Open Sandbox',
        reg.team_name || `Team ${reg.captain_name}`,
        String(reg.player_count || players.length || 1),
        reg.captain_name || '',
        reg.captain_email || '',
        reg.captain_phone || '',
        reg.college || '',
        players[1] ? players[1].name : '',
        players[2] ? players[2].name : '',
        players[3] ? players[3].name : '',
        reg.concept_brief || '',
        reg.portfolio_url || '',
        isPaid ? 'PAID' : (reg.payment_status || 'PENDING'),
        payId,
        isPaid ? 'YES' : 'NO',
        'CRAFTCON Portal'
      ];
    } else {
      rowData = [
        reg.registration_id,
        timestamp,
        'GAMING',
        reg.game || 'BGMI',
        reg.registration_type || 'SQUAD',
        reg.team_name || `Team ${reg.captain_name}`,
        reg.college || '',
        reg.captain_name || '',
        reg.captain_email || '',
        reg.captain_phone || '',
        players[0] ? (players[0].in_game_name || players[0].game_uid || 'N/A') : 'N/A',
        players[1] ? `${players[1].name} (${players[1].in_game_name || 'N/A'})` : '',
        players[2] ? `${players[2].name} (${players[2].in_game_name || 'N/A'})` : '',
        players[3] ? `${players[3].name} (${players[3].in_game_name || 'N/A'})` : '',
        players[4] ? `${players[4].name} (${players[4].in_game_name || 'N/A'})` : '',
        String(reg.player_count || players.length || 1),
        String(reg.total_amount || reg.amount || 0),
        reg.utr_transaction_id || payId || 'PENDING',
        isPaid ? 'PAID' : (reg.payment_status || 'PENDING'),
        payId,
        isPaid ? 'YES' : 'NO',
        'CRAFTCON Gaming Portal'
      ];
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:T`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowData] }
    });

    await db.execute({
      sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_synced_at = CURRENT_TIMESTAMP, google_sheets_sync_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
      args: ['SYNCED', registrationId]
    });

    console.log(`✅ [GoogleSheets API] Registration ${registrationId} successfully appended to ${sheetName}.`);
    return { success: true, registrationId, status: 'SYNCED', method: 'API_V4' };

  } catch (err) {
    console.error(`❌ [GoogleSheets Error] Failed to sync registration ${registrationId}:`, err.message);

    try {
      await db.execute({
        sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
        args: ['FAILED', err.message, registrationId]
      });
    } catch (_) {}

    return { success: false, error: err.message, status: 'FAILED' };
  }
}

/**
 * Retry syncing all pending registrations
 */
async function syncAllPendingRegistrations() {
  try {
    const pendingRes = await db.execute(`
      SELECT registration_id FROM registrations 
      WHERE (google_sheets_sync_status = 'PENDING' OR google_sheets_sync_status = 'FAILED' OR google_sheets_sync_status IS NULL)
    `);

    const rows = pendingRes.rows || [];
    console.log(`🔄 [GoogleSheets Sync Retry] Found ${rows.length} registrations to sync...`);

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

/**
 * Harmless Diagnostic Test Endpoint Function for Google Sheets Integration
 */
async function testGoogleSheetsConnection() {
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const spreadsheetId = getSpreadsheetId();
  const appsScriptUrl = getAppsScriptUrl();

  const hasEmail = Boolean(clientEmail);
  const hasKey = Boolean(rawPrivateKey);
  const hasScriptUrl = Boolean(appsScriptUrl);

  const diagnostic = {
    timestamp: new Date().toISOString(),
    spreadsheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    appsScript: {
      configured: hasScriptUrl,
      url: hasScriptUrl ? appsScriptUrl.substring(0, 35) + '...' : 'Not configured'
    },
    serviceAccount: {
      clientEmailConfigured: hasEmail,
      clientEmail: hasEmail ? clientEmail : 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL',
      privateKeyConfigured: hasKey,
      privateKeyStatus: hasKey ? 'Configured' : 'Missing GOOGLE_PRIVATE_KEY'
    },
    status: hasScriptUrl || (hasEmail && hasKey) ? 'READY' : 'SETUP_REQUIRED',
    setupInstructions: 'Deploy code.gs in Google Sheets (Extensions -> Apps Script -> Deploy as Web App) and set GOOGLE_APPS_SCRIPT_URL in .env'
  };

  return diagnostic;
}

module.exports = {
  syncConfirmedRegistration,
  syncAllPendingRegistrations,
  testGoogleSheetsConnection,
  getSpreadsheetId,
  getAppsScriptUrl
};
