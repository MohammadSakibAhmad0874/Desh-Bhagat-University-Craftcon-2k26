const { createClient } = require('@libsql/client');
require('dotenv').config();

/**
 * CRAFTCON '26 GAMING ARENA — CENTRALIZED TURSO / libSQL DATABASE CLIENT
 * Connects directly to Turso Cloud (process.env.TURSO_DATABASE_URL)
 */

const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim();
const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim() || undefined;

if (!tursoUrl && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
  console.warn('⚠️ [Turso] TURSO_DATABASE_URL environment variable is missing in production deployment!');
}

const db = createClient({
  url: tursoUrl || 'file:craftcon_gaming.db',
  ...(tursoToken ? { authToken: tursoToken } : {})
});

console.log(`⚡ Initialized Turso/libSQL client (${tursoUrl ? 'Turso Cloud: ' + tursoUrl : 'Local File Mode'})`);

let isInitialized = false;
let initPromise = null;

async function ensureColumnExists(tableName, columnName, columnDef) {
  try {
    const pragmaRes = await db.execute(`PRAGMA table_info(${tableName})`);
    const columns = pragmaRes.rows || [];
    const hasColumn = columns.some(col => (col.name || col[1]) === columnName);
    if (!hasColumn) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
      console.log(`➕ Added missing column '${columnName}' to '${tableName}' table.`);
    }
  } catch (e) {
    console.warn(`Migration check warning for ${tableName}.${columnName}:`, e.message);
  }
}

/**
 * Initializes Database Tables & Migration Columns
 */
async function initDb() {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!db) {
        throw new Error('Database client is not initialized.');
      }

      // 1. REGISTRATIONS TABLE
      await db.execute(`
        CREATE TABLE IF NOT EXISTS registrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL,
          game TEXT NOT NULL,
          registration_type TEXT NOT NULL,
          team_name TEXT,
          college TEXT NOT NULL,
          captain_name TEXT NOT NULL,
          captain_email TEXT NOT NULL,
          captain_phone TEXT NOT NULL,
          player_count INTEGER NOT NULL,
          total_amount REAL NOT NULL,
          amount REAL,
          fee_per_person REAL NOT NULL DEFAULT 50,
          currency TEXT DEFAULT 'INR',
          payment_status TEXT NOT NULL DEFAULT 'PENDING',
          registration_status TEXT NOT NULL DEFAULT 'PENDING',
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          order_id TEXT,
          payment_id TEXT,
          email_status TEXT DEFAULT 'PENDING',
          email_sent_at DATETIME,
          email_attempts INTEGER DEFAULT 0,
          last_email_error TEXT,
          google_sheets_sync_status TEXT DEFAULT 'PENDING',
          google_sheets_synced_at DATETIME,
          google_sheets_sync_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          confirmed_at DATETIME
        );
      `);

      // 2. PLAYERS TABLE
      await db.execute(`
        CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT NOT NULL,
          player_index INTEGER NOT NULL,
          name TEXT NOT NULL,
          full_name TEXT,
          in_game_name TEXT,
          game_uid TEXT,
          email TEXT,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'PLAYER',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. PAYMENTS TABLE
      await db.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT NOT NULL,
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          razorpay_signature TEXT,
          signature TEXT,
          order_id TEXT,
          payment_id TEXT,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'CREATED',
          method TEXT DEFAULT 'RAZORPAY',
          provider TEXT NOT NULL DEFAULT 'RAZORPAY',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          verified_at DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Run Column Migrations for Existing Tables
      await ensureColumnExists('registrations', 'amount', 'REAL');
      await ensureColumnExists('registrations', 'currency', "TEXT DEFAULT 'INR'");
      await ensureColumnExists('registrations', 'updated_at', 'DATETIME');
      await ensureColumnExists('registrations', 'google_sheets_sync_status', "TEXT DEFAULT 'PENDING'");
      await ensureColumnExists('registrations', 'google_sheets_synced_at', 'DATETIME');
      await ensureColumnExists('registrations', 'google_sheets_sync_error', 'TEXT');
      await ensureColumnExists('players', 'full_name', 'TEXT');
      await ensureColumnExists('payments', 'signature', 'TEXT');
      await ensureColumnExists('payments', 'updated_at', 'DATETIME');

      // Create Idempotency Unique Indexes
      try {
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_rzp_pay ON registrations(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;");
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_rzp_pay ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;");
      } catch (idxErr) {
        console.warn('Index creation notice:', idxErr.message);
      }

      isInitialized = true;
      console.log('✅ Turso/libSQL Schema initialized successfully (registrations, players, payments).');
      return true;
    } catch (err) {
      console.error('⚠️ Database schema initialization warning:', err.message);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Health Check Helper - Performs a live SELECT 1 against Turso
 */
async function testDbConnection() {
  try {
    if (!db) return false;
    const res = await db.execute('SELECT 1 as alive');
    return res && res.rows && res.rows.length > 0;
  } catch (err) {
    console.error('Database health check error:', err.message);
    return false;
  }
}

module.exports = {
  db,
  initDb,
  testDbConnection
};
