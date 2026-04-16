/**
 * Shared database and authentication helper functions.
 * Eliminates duplicate code across 70+ controllers and services.
 */
const pool = require("../config/db");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

/**
 * Run a parameterized query with timeout.
 * @param {string} text - SQL query text
 * @param {Array} values - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
function runQuery(text, values = []) {
  return pool.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });
}

/**
 * Extract authenticated user ID from request object.
 * Handles all the different places user ID might be stored.
 * @param {Request} req - Express request
 * @returns {string|null}
 */
function getAuthUserId(req) {
  const id = req.user?.userId || req.user?.id || req.user?.user_id;
  return id ? String(id).trim() : null;
}

/**
 * Parse a value to string, trimming whitespace, returning null for empty/falsy.
 * @param {*} value
 * @returns {string|null}
 */
function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

/**
 * Parse to positive integer with fallback.
 * @param {*} value
 * @param {number} fallback
 * @param {number} max
 * @returns {number}
 */
function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/**
 * Check if request user is admin.
 * @param {Request} req
 * @returns {boolean}
 */
function isAdmin(req) {
  const role = String(req.user?.role || req.user?.userRole || "").trim().toLowerCase();
  return role === "admin" || role === "super_admin" || role === "superadmin";
}

module.exports = {
  pool,
  runQuery,
  getAuthUserId,
  parseOptionalString,
  parsePositiveInt,
  isAdmin,
  DB_QUERY_TIMEOUT_MS,
};
