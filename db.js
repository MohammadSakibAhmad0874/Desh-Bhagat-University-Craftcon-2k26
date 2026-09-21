const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

/**
 * CRAFTCON '26 GAMING ARENA — TURSO / libSQL DATABASE CLIENT
 * Supports Turso Cloud (process.env.TURSO_DATABASE_URL) & Local file mode (file:craftcon_gaming.db)
 */

const rawUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

// Fallback to local libSQL file if no Turso URL provided
const url = rawUrl && rawUrl.trim() ? rawUrl.trim() : `file:${path.join(__dirname, 'craftcon_gaming.db')}`;

let db;
try {
  db = createClient({
    url,
    ...(authToken ? { authToken } : {})
  });
  console.log(`⚡ Initialized libSQL client (${url.startsWith('file:') ? 'Local SQLite File' : 'Turso Cloud Database'})`);
} catch (err) {
  console.error('❌ Failed to initialize libSQL database client:', err.message);
}

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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME,
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
          updated_at DATETIME
        );
      `);

      // Run Column Migrations for Existing Tables
      await ensureColumnExists('registrations', 'amount', 'REAL');
      await ensureColumnExists('registrations', 'currency', "TEXT DEFAULT 'INR'");
      await ensureColumnExists('players', 'full_name', 'TEXT');
      await ensureColumnExists('payments', 'signature', 'TEXT');
      await ensureColumnExists('payments', 'updated_at', 'DATETIME');

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
 * Health Check Helper
 */
async function testDbConnection() {
  try {
    if (!db) return false;
    const res = await db.execute('SELECT 1 as alive');
    return res && res.rows && res.rows.length > 0;
  } catch (err) {
    console.error('Database health check failed:', err.message);
    return false;
  }
}

module.exports = {
  db,
  initDb,
  testDbConnection
};
