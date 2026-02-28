const pool = require('../config/db');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

const DEFAULT_LOG_LIMIT = 50;
const MAX_LOG_LIMIT = 200;
const REWARDS_PROFILE_CACHE_TTL_SECONDS = 60;
const REWARDS_LOG_CACHE_TTL_SECONDS = 30;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let usersLegacyIdColumnAvailablePromise = null;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalString(value);
  if (!normalized || !/^\d+$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function enforceUserAccess(req, res, { allowQueryOverride = false, allowParamOverride = false } = {}) {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;
  const requestedParamUserId = allowParamOverride
    ? parseOptionalString(req.params?.userId)
    : null;

  if ((requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) ||
      (requestedParamUserId && requestedParamUserId !== authenticatedUserId)) {
    res.status(403).json({ error: 'Cannot access another user rewards' });
    return null;
  }

  return authenticatedUserId;
}

async function hasUsersLegacyIdColumn() {
  if (!usersLegacyIdColumnAvailablePromise) {
    usersLegacyIdColumnAvailablePromise = runQuery(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'id'
        ) AS available
      `
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch(() => false);
  }

  return usersLegacyIdColumnAvailablePromise;
}

async function resolveCanonicalUserId(rawUserId) {
  const normalizedRawUserId = parseOptionalString(rawUserId);
  if (!normalizedRawUserId) return null;

  try {
    const usersHasLegacyId = await hasUsersLegacyIdColumn();
    const lookup = await runQuery(
      usersHasLegacyId
        ? `
          SELECT user_id::text AS user_id
          FROM users
          WHERE user_id::text = $1 OR id::text = $1
          LIMIT 1
        `
        : `
          SELECT user_id::text AS user_id
          FROM users
          WHERE user_id::text = $1
          LIMIT 1
        `,
      [normalizedRawUserId]
    );
    return parseOptionalString(lookup.rows[0]?.user_id) || normalizedRawUserId;
  } catch (err) {
    logger.warn('[Rewards] Failed to resolve canonical user ID, using raw identifier', {
      message: err.message
    });
    return normalizedRawUserId;
  }
}

// Generate unique referral code
const generateReferralCode = (userId, username) => {
  const prefix = (username || 'USR').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'U');
  const idPart = String(userId).replace(/[^A-Za-z0-9]/g, '').slice(-4).padStart(4, '0');
  const entropy = (hashString(`${userId}:${Date.now()}`) % 46656).toString(36).toUpperCase().padStart(3, '0');
  return `${prefix}${idPart}${entropy}`;
};

// Generate daily secret code (changes daily)
const generateDailySecretCode = (userId) => {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const hash = (hashString(`${userId}:${dateKey}`) % 9000) + 1000;
  return `SEC-${hash}`;
};

// Calculate referral chain points (A->B->C->D...)
// Direct referral (A->B): A gets 50 points
// Indirect referral (A->B->C): A gets 10 points for each person under B
const calculateChainPoints = async (userId) => {
  try {
    const chainRes = await runQuery(
      `
        WITH RECURSIVE referral_chain AS (
          SELECT u.user_id, u.username, u.referred_by, 1 as depth, u.created_at
          FROM users u
          WHERE u.referred_by::text = $1

          UNION ALL

          SELECT u.user_id, u.username, u.referred_by, rc.depth + 1, u.created_at
          FROM users u
          INNER JOIN referral_chain rc ON u.referred_by::text = rc.user_id::text
          WHERE rc.depth < 10
        )
        SELECT rc.user_id, rc.username, rc.depth, rc.created_at, p.full_name
        FROM referral_chain rc
        LEFT JOIN profiles p ON p.user_id::text = rc.user_id::text
        ORDER BY rc.depth, rc.created_at
      `,
      [userId]
    );

    const directReferrals = [];
    const indirectReferrals = [];
    for (const row of chainRes.rows) {
      const depth = toInt(row.depth, 0);
      if (depth === 1) directReferrals.push(row);
      else if (depth > 1) indirectReferrals.push(row);
    }
    const directPoints = directReferrals.length * 50;
    const indirectPoints = indirectReferrals.length * 10;

    return {
      directReferrals,
      indirectReferrals,
      directPoints,
      indirectPoints,
      totalChainPoints: directPoints + indirectPoints
    };
  } catch (err) {
    logger.error('Error calculating chain points:', err);
    return {
      directReferrals: [],
      indirectReferrals: [],
      directPoints: 0,
      indirectPoints: 0,
      totalChainPoints: 0
    };
  }
};

exports.getRewardsByUser = async (req, res) => {
  const userIdFromSession = enforceUserAccess(req, res, { allowQueryOverride: true, allowParamOverride: true });
  if (!userIdFromSession) return;

  try {
    const userId = await resolveCanonicalUserId(userIdFromSession);
    const cacheKey = `rewards:${userId}:profile`;
    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const [userRes, rewardsRes, chainData] = await Promise.all([
          runQuery(
            `
              SELECT u.user_id, u.username, u.referral_code, p.full_name
              FROM users u
              LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
              WHERE u.user_id::text = $1
              LIMIT 1
            `,
            [userId]
          ),
          runQuery(
            `SELECT points, tier FROM rewards WHERE user_id::text = $1 LIMIT 1`,
            [userId]
          ),
          calculateChainPoints(userId)
        ]);

        const user = userRes.rows[0] || { user_id: userId, username: 'Unknown', referral_code: null, full_name: null };
        const rewardsData = rewardsRes.rows[0] || { points: 0, tier: 'Bronze' };
        const displayName = user.full_name || user.username || 'Unknown User';

        const persistedPoints = Number(rewardsData.points || 0);
        const totalPoints = persistedPoints + chainData.totalChainPoints;

        let rank = 'Bronze';
        if (totalPoints >= 5000) rank = 'Platinum';
        else if (totalPoints >= 2000) rank = 'Gold';
        else if (totalPoints >= 500) rank = 'Silver';

        let referralCode = user.referral_code;
        if (!referralCode) {
          const generatedCode = generateReferralCode(userId, user.username);
          const updateRes = await runQuery(
            `
              UPDATE users
              SET referral_code = COALESCE(referral_code, $1)
              WHERE user_id::text = $2
              RETURNING referral_code
            `,
            [generatedCode, userId]
          );
          referralCode = updateRes.rows[0]?.referral_code || generatedCode;
        }

        const referralChain = [
          ...chainData.directReferrals.map((referral) => ({
            id: referral.user_id,
            name: referral.full_name || referral.username,
            coins: 50,
            type: 'direct',
            joinDate: new Date(referral.created_at).toLocaleDateString()
          })),
          ...chainData.indirectReferrals.map((referral) => ({
            id: referral.user_id,
            name: referral.full_name || referral.username,
            coins: 10,
            type: 'indirect',
            depth: referral.depth,
            joinDate: new Date(referral.created_at).toLocaleDateString()
          }))
        ];

        return {
          user: {
            id: user.user_id || userId,
            name: displayName,
            rank,
            level: Math.floor(totalPoints / 100) + 1,
            xpCurrent: totalPoints % 100,
            xpRequired: 100,
            referralCode,
            totalReferrals: chainData.directReferrals.length + chainData.indirectReferrals.length,
            directReferrals: chainData.directReferrals.length,
            indirectReferrals: chainData.indirectReferrals.length,
            dailySecretCode: generateDailySecretCode(userId),
            totalCoins: totalPoints,
            directPoints: chainData.directPoints,
            indirectPoints: chainData.indirectPoints,
            streak: 1,
            successfulRefs: chainData.directReferrals.length
          },
          referralChain
        };
      },
      REWARDS_PROFILE_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (err) {
    logger.error('Rewards Controller Error:', err);
    return res.status(200).json({
      user: { rank: 'Bronze', totalCoins: 0, name: 'Error Loading', referralCode: 'ERROR' },
      referralChain: []
    });
  }
};

// Alias for route compatibility
exports.getRewards = exports.getRewardsByUser;

// Reward log endpoint
exports.getRewardLog = async (req, res) => {
  const userIdFromSession = enforceUserAccess(req, res, { allowQueryOverride: true });
  const limit = parsePositiveInt(req.query?.limit, DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT);
  if (!userIdFromSession) return;

  try {
    const userId = await resolveCanonicalUserId(userIdFromSession);
    const cacheKey = `rewards:${userId}:log:${limit}`;
    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `
            SELECT
              user_id,
              action,
              points,
              description,
              created_at
            FROM reward_log
            WHERE user_id::text = $1
            ORDER BY created_at DESC
            LIMIT $2
          `,
          [userId, limit]
        );
        return result.rows;
      },
      REWARDS_LOG_CACHE_TTL_SECONDS
    );
    return res.json(payload);
  } catch (err) {
    return res.json([]);
  }
};
