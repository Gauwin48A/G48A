const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const defaultMigration = path.join(
  __dirname,
  'database',
  'migrations',
  'fix_user_sessions_user_id_type.sql'
);

const inputPath = process.argv[2];
const migrationPath = inputPath
  ? (path.isAbsolute(inputPath) ? inputPath : path.join(__dirname, inputPath))
  : defaultMigration;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function run() {
  let exitCode = 0;
  try {
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log(`Migration applied successfully: ${migrationPath}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      // Ignore pool shutdown errors during migration script exit.
    }
    process.exit(exitCode);
  }
}

run();
