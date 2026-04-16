/**
 * Shared parsing and validation utility functions.
 * Eliminates duplicate parse functions across controllers.
 */

/**
 * Parse a value to trimmed string, returning null for empty/falsy.
 * @param {*} value
 * @returns {string|null}
 */
function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

/**
 * Parse to positive integer with fallback and optional max.
 * @param {*} value
 * @param {number} fallback
 * @param {number} [max=Number.MAX_SAFE_INTEGER]
 * @returns {number}
 */
function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/**
 * Parse to bounded integer with min/max constraints.
 * @param {*} value
 * @param {number} fallback
 * @param {{ min?: number, max?: number }} options
 * @returns {number}
 */
function parseBoundedInt(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Parse to positive float with fallback and optional max.
 * @param {*} value
 * @param {number} fallback
 * @param {number} [max=Number.MAX_SAFE_INTEGER]
 * @returns {number}
 */
function parsePositiveNumber(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalString(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

/**
 * Parse a value to float or return null.
 * @param {*} value
 * @returns {number|null}
 */
function parseNumberOrNull(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Safely parse a boolean from env or query string.
 * @param {*} rawValue
 * @param {boolean} fallback
 * @returns {boolean}
 */
function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

/**
 * Parse star rating (1-5).
 * @param {*} value
 * @returns {number|null}
 */
function parseRating(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

/**
 * Get scalar value from potentially array query param.
 * @param {*} value
 * @returns {*}
 */
function getScalarQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Validate and constrain a period string to safe SQL interval.
 * Prevents SQL injection from user-supplied interval strings.
 * @param {string} period - User-supplied period like "7d", "30d", "90d"
 * @param {string} [fallback="7 days"]
 * @returns {string} Safe SQL interval string
 */
function parseSafeInterval(period, fallback = "7 days") {
  const intervalMap = {
    "1d": "1 day",
    "7d": "7 days",
    "14d": "14 days",
    "30d": "30 days",
    "60d": "60 days",
    "90d": "90 days",
    "180d": "180 days",
    "365d": "365 days",
    all: "10 years",
  };
  return intervalMap[String(period || "").toLowerCase()] || fallback;
}

/**
 * Deduplicate a text list.
 * @param {string[]} arr
 * @returns {string[]}
 */
function dedupeTextList(arr) {
  return [...new Set(arr.filter(Boolean).map(s => String(s).trim()))];
}

module.exports = {
  parseOptionalString,
  parsePositiveInt,
  parseBoundedInt,
  parsePositiveNumber,
  parseNumberOrNull,
  parseBoolean,
  parseRating,
  getScalarQueryValue,
  parseSafeInterval,
  dedupeTextList,
};
