const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const os = require('os');
const fs = require('fs');

let DB_PATH = path.join(__dirname, 'craftcon_gaming.db');

// Handle Vercel Serverless environment where root filesystem is read-only
if (process.env.VERCEL) {
  const tmpPath = path.join(os.tmpdir(), 'craftcon_gaming.db');
  if (!fs.existsSync(tmpPath)) {
    if (fs.existsSync(DB_PATH)) {
      try {
        fs.copyFileSync(DB_PATH, tmpPath);
      } catch (e) {
        console.warn('Could not copy initial DB to /tmp:', e.message);
      }
    }
  }
  DB_PATH = tmpPath;
}

let db;
try {
  db = new DatabaseSync(DB_PATH);
  console.log(`⚡ Connected to SQLite database: ${DB_PATH}`);
} catch (err) {
  console.error('❌ Failed to open SQLite database:', err.message);
  throw err;
}

// Enable Foreign Keys
db.exec('PRAGMA foreign_keys = ON;');

// 1. REGISTRATIONS TABLE
db.exec(`
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
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT NOT NULL,
    player_index INTEGER NOT NULL,
    name TEXT NOT NULL,
    in_game_name TEXT,
    game_uid TEXT,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'PLAYER',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations (registration_id) ON DELETE CASCADE
  );
`);

// 3. PAYMENTS TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT NOT NULL,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    order_id TEXT,
    payment_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'CREATED',
    method TEXT DEFAULT 'RAZORPAY',
    provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    FOREIGN KEY (registration_id) REFERENCES registrations (registration_id) ON DELETE CASCADE
  );
`);

// Safe Migration Helper for adding missing columns to existing databases
function ensureColumnExists(tableName, columnName, columnDef) {
  try {
    const pragmaStmt = db.prepare(`PRAGMA table_info(${tableName})`);
    const columns = pragmaStmt.all();
    const hasColumn = columns.some(col => col.name === columnName);
    if (!hasColumn) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
      console.log(`➕ Added missing column '${columnName}' to '${tableName}' table.`);
    }
  } catch (e) {
    console.warn(`Migration check warning for ${tableName}.${columnName}:`, e.message);
  }
}

// Run migrations for any existing database tables
ensureColumnExists('registrations', 'currency', "TEXT DEFAULT 'INR'");
ensureColumnExists('registrations', 'razorpay_order_id', 'TEXT');
ensureColumnExists('registrations', 'razorpay_payment_id', 'TEXT');
ensureColumnExists('registrations', 'email_status', "TEXT DEFAULT 'PENDING'");
ensureColumnExists('registrations', 'email_sent_at', 'DATETIME');
ensureColumnExists('registrations', 'email_attempts', 'INTEGER DEFAULT 0');
ensureColumnExists('registrations', 'last_email_error', 'TEXT');
ensureColumnExists('registrations', 'updated_at', 'DATETIME');
ensureColumnExists('registrations', 'confirmed_at', 'DATETIME');

ensureColumnExists('payments', 'razorpay_order_id', 'TEXT');
ensureColumnExists('payments', 'razorpay_payment_id', 'TEXT');
ensureColumnExists('payments', 'razorpay_signature', 'TEXT');
ensureColumnExists('payments', 'method', "TEXT DEFAULT 'RAZORPAY'");

console.log('✅ SQLite Schema initialized & verified successfully (registrations, players, payments).');

module.exports = db;
