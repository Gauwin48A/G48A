const { Pool } = require("pg");
require("dotenv").config();

/**
 * Parse a raw environment value into a boolean.
 * @param {string|undefined|null} rawValue - The raw value to parse.
 * @param {boolean} fallback - Default value when rawValue is empty or unrecognised.
 * @returns {boolean} The parsed boolean or the fallback.
 */
function parseBoolean(rawValue, fallback) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

/**
 * Parse a raw environment value into a bounded integer.
 * @param {string|undefined|null} rawValue - The raw value to parse.
 * @param {number} fallback - Default value when parsing fails or is out of range.
 * @param {object} [bounds] - Optional min/max constraints.
 * @param {number} [bounds.min=Number.MIN_SAFE_INTEGER] - Minimum allowed value.
 * @param {number} [bounds.max=Number.MAX_SAFE_INTEGER] - Maximum allowed value.
 * @returns {number} The parsed integer or the fallback.
 */
function parseInteger(rawValue, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

/**
 * Read a trimmed environment variable, returning a fallback when absent or blank.
 * @param {string} name - Environment variable name.
 * @param {string} [fallback=undefined] - Value returned when the variable is missing/blank.
 * @returns {string|undefined} The trimmed env value or the fallback.
 */
function readEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
}

// ---------------------------------------------------------------------------
// Resolve database configuration from environment variables
// ---------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === "production";

const dbUser = readEnv("DB_USER", isProduction ? undefined : "postgres");
const dbHost = readEnv("DB_HOST", isProduction ? undefined : "localhost");
const dbName = readEnv("DB_NAME", isProduction ? undefined : "mhub_db");
const dbPassword = readEnv("DB_PASSWORD", isProduction ? undefined : "password");
const dbPort = parseInteger(process.env.DB_PORT, 5432, { min: 1, max: 65535 });

// In production every database variable is mandatory
if (isProduction) {
  const missing = [];
  if (!dbUser) missing.push("DB_USER");
  if (!dbHost) missing.push("DB_HOST");
  if (!dbName) missing.push("DB_NAME");
  if (!dbPassword) missing.push("DB_PASSWORD");
  if (missing.length > 0) {
    throw new Error(`Missing required production database env vars: ${missing.join(", ")}`);
  }
}

// Enforce least-privilege DB user in production unless explicitly allowed.
if (isProduction) {
  const elevatedUsers = new Set(["postgres", "admin", "root", "superuser"]);
  const allowElevated = parseBoolean(process.env.DB_ALLOW_SUPERUSER, false);
  if (elevatedUsers.has(String(dbUser || "").toLowerCase()) && !allowElevated) {
    throw new Error(
      "[DB] Refusing to start with elevated DB_USER in production. " +
      "Provision a least-privilege account or set DB_ALLOW_SUPERUSER=true to override."
    );
  }
}

const sslEnabled = parseBoolean(process.env.DB_SSL, isProduction);
const sslRejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);

// ---------------------------------------------------------------------------
// Create the connection pool
// ---------------------------------------------------------------------------
const pool = new Pool({
  user: dbUser,
  host: dbHost,
  database: dbName,
  password: dbPassword,
  port: dbPort,
  max: parseInteger(process.env.DB_POOL_MAX, 20, { min: 1, max: 200 }),
  idleTimeoutMillis: parseInteger(process.env.DB_IDLE_TIMEOUT_MS, 3e4, { min: 1e3 }),
  connectionTimeoutMillis: parseInteger(process.env.DB_CONNECT_TIMEOUT_MS, 5e3, { min: 1e3 }),
  ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : false,
});

pool.on("connect", () => {
  console.log("[DB] Connected");
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected idle client error", err);
  console.warn("[DB] Pool will attempt to recover automatically");
});

// Pool health monitoring — log stats every 60s in production
if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    const { totalCount, idleCount, waitingCount } = pool;
    console.log(`[DB Pool] total=${totalCount} idle=${idleCount} waiting=${waitingCount}`);
  }, 60_000).unref();
}

module.exports = pool;
