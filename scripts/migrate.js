const { initDb, testDbConnection } = require('../db');

async function runMigration() {
  console.log('🚀 Running database schema initialization & migrations...');
  const success = await initDb();
  if (success) {
    const isAlive = await testDbConnection();
    if (isAlive) {
      console.log('🎉 Database migration completed successfully and connection is HEALTHY!');
      process.exit(0);
    }
  }
  console.error('❌ Database migration failed.');
  process.exit(1);
}

runMigration();
