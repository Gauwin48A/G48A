const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..", "..");
require("dotenv").config({ path: path.join(serverRoot, ".env") });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    const sqlPath = path.join(
      serverRoot,
      "database",
      "migrations",
      "migration_security.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    await pool.query(sql);
    console.log("Security schema updated successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Security migration failed:", err);
    process.exit(1);
  }
}

run();
