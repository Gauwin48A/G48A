const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const TRUST_BASE_SCORE = 40;
const TRUST_MAX_SCORE = 100;

const MAX_TXN_BONUS = 25;
const MAX_AGE_BONUS = 15;
const MAX_COMPLAINT_PENALTY = 30;

const ACCOUNT_AGE_STEP_DAYS = 30;
const ACCOUNT_AGE_STEP_POINTS = 5;

const COMPLAINT_OPEN_STATUSES = new Set(["open", "triage", "investigating"]);

let cachedUserColumns = null;
let cachedUserColumnsAt = 0;
const USER_COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;

function isMissingTableError(err) {
  if (!err) return false;
  if (String(err.code || "") === "42P01") return true;
  return /does not exist/i.test(String(err.message || ""));
}

async function getUserColumns() {
  const now = Date.now();
  if (cachedUserColumns && now - cachedUserColumnsAt < USER_COLUMN_CACHE_TTL_MS) {
    return cachedUserColumns;
  }
  const result = await runQuery(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
  );
  cachedUserColumns = new Set(result.rows.map((row) => row.column_name));
  cachedUserColumnsAt = now;
  return cachedUserColumns;
}

async function safeQueryRow(query, params, fallback) {
  try {
    const result = await runQuery(query, params);
    return result.rows[0] || fallback;
  } catch (err) {
    if (isMissingTableError(err)) {
      logger?.warn?.("[TrustScore] Missing table for query", {
        message: err.message,
      });
      return fallback;
    }
    throw err;
  }
}

async function safeQueryRows(query, params, fallback) {
  try {
    const result = await runQuery(query, params);
    return Array.isArray(result.rows) ? result.rows : fallback;
  } catch (err) {
    if (isMissingTableError(err)) {
      logger?.warn?.("[TrustScore] Missing table for query", {
        message: err.message,
      });
      return fallback;
    }
    throw err;
  }
}

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(TRUST_MAX_SCORE, Math.round(value)));
}

function computeAgeBonus(days) {
  if (!Number.isFinite(days) || days <= 0) return 0;
  const steps = Math.floor(days / ACCOUNT_AGE_STEP_DAYS);
  return Math.min(MAX_AGE_BONUS, steps * ACCOUNT_AGE_STEP_POINTS);
}

function computeDeviceConsistencyBonus({ sessionCount, deviceCount, ipCount }) {
  if (!Number.isFinite(sessionCount) || sessionCount < 2) return 0;
  if (deviceCount <= 2 && ipCount <= 3) return 10;
  if (deviceCount <= 4 && ipCount <= 6) return 0;
  return -10;
}

function mapTrustBadge(score) {
  if (score >= 70) return { level: "verified", label: "Verified Seller" };
  if (score >= 40) return { level: "new", label: "New Seller" };
  return { level: "risky", label: "Risky Seller" };
}

async function computeTrustScore(userId) {
  if (!userId) return null;
  const userColumns = await getUserColumns();
  const selectParts = ["user_id"];
  if (userColumns.has("created_at")) selectParts.push("created_at");
  if (userColumns.has("isaadhaarverified")) {
    selectParts.push("isaadhaarverified AS aadhaar_verified");
  }
  if (userColumns.has("aadhaar_status")) {
    selectParts.push("aadhaar_status");
  }

  const userResult = await runQuery(
    `SELECT ${selectParts.join(", ")} FROM users WHERE user_id = $1`,
    [userId],
  );
  if (!userResult.rows.length) {
    return null;
  }

  const user = userResult.rows[0];
  const aadhaarVerified =
    user?.aadhaar_verified === true ||
    String(user?.aadhaar_status || "").trim().toLowerCase() === "verified";

  const [txnRow, complaintRows, sessionRow, reviewRow] = await Promise.all([
    safeQueryRow(
      "SELECT COUNT(*)::int AS count FROM transactions WHERE status = 'completed' AND (buyer_id = $1 OR seller_id = $1)",
      [userId],
      { count: 0 },
    ),
    safeQueryRows(
      "SELECT status, COUNT(*)::int AS count FROM complaints WHERE seller_id = $1 GROUP BY status",
      [userId],
      [],
    ),
    safeQueryRow(
      "SELECT COUNT(*)::int AS session_count, COUNT(DISTINCT NULLIF(device_fingerprint, ''))::int AS device_count, COUNT(DISTINCT NULLIF(ip_address, ''))::int AS ip_count FROM user_sessions WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'",
      [userId],
      { session_count: 0, device_count: 0, ip_count: 0 },
    ),
    safeQueryRow(
      // reviewee_id is provisioned by schemaGuard; safeQueryRow degrades gracefully if absent
      "SELECT COUNT(*)::int AS review_count, COALESCE(AVG(rating), 0) AS avg_rating FROM reviews WHERE reviewee_id::text = $1 AND COALESCE(is_hidden, false) = false",
      [userId],
      { review_count: 0, avg_rating: 0 },
    ),
  ]);

  const completedTransactions = Number(txnRow?.count || 0);
  let openComplaints = 0;
  let resolvedComplaints = 0;
  complaintRows.forEach((row) => {
    const status = String(row?.status || "").trim().toLowerCase();
    const count = Number(row?.count || 0);
    if (!Number.isFinite(count)) return;
    if (COMPLAINT_OPEN_STATUSES.has(status)) {
      openComplaints += count;
    } else if (status === "resolved") {
      resolvedComplaints += count;
    }
  });

  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const accountAgeDays =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

  const transactionBonus = Math.min(MAX_TXN_BONUS, completedTransactions * 5);
  const ageBonus = computeAgeBonus(accountAgeDays);
  const deviceBonus = computeDeviceConsistencyBonus({
    sessionCount: Number(sessionRow?.session_count || 0),
    deviceCount: Number(sessionRow?.device_count || 0),
    ipCount: Number(sessionRow?.ip_count || 0),
  });
  const complaintPenalty = Math.min(
    MAX_COMPLAINT_PENALTY,
    openComplaints * 10 + resolvedComplaints * 5,
  );

  // Review bonus: up to +15 based on review count and average rating
  const reviewCount = Number(reviewRow?.review_count || 0);
  const avgRating = Number(reviewRow?.avg_rating || 0);
  const reviewBonus = reviewCount > 0
    ? Math.min(15, Math.floor(reviewCount * (avgRating / 5) * 3))
    : 0;

  const rawScore =
    TRUST_BASE_SCORE +
    (aadhaarVerified ? 20 : 0) +
    transactionBonus +
    ageBonus +
    deviceBonus +
    reviewBonus -
    complaintPenalty;

  const score = clampScore(rawScore);
  const badge = mapTrustBadge(score);

  const payload = {
    user_id: userId,
    score,
    level: badge.level,
    badge: badge.label,
  };
  if (process.env.TRUST_SCORE_DEBUG === "true") {
    payload.factors = {
      aadhaarVerified,
      completedTransactions,
      openComplaints,
      resolvedComplaints,
      accountAgeDays,
      deviceCount: Number(sessionRow?.device_count || 0),
      ipCount: Number(sessionRow?.ip_count || 0),
      deviceConsistencyBonus: deviceBonus,
      reviewCount,
      avgRating: Number(avgRating.toFixed(1)),
      reviewBonus,
    };
  }
  return payload;
}

module.exports = {
  computeTrustScore,
};
