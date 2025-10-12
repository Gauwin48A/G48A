// db.js - PostgreSQL connection pool for use with 'pg' library
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('✅ Connected to PostgreSQL (db.js)');
}).catch(err => {
  console.error('❌ DB connection error', err.stack);
});

pool.on('error', (err) => {
  console.error('❌ DB connection error', err.stack);
});

module.exports = pool;
