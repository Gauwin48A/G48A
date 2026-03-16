const { pool, runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const { subscribeToRewardUpdates } = require("../services/rewardsRealtimeService");
const {
  getChainRewardForDepth,
  getChainRewardRules,
} = require("../services/referralChainRewards");

const DEFAULT_LOG_LIMIT = 50;
const MAX_LOG_LIMIT = 200;
const REWARDS_PROFILE_CACHE_TTL_SECONDS = 60;
const REWARDS_LOG_CACHE_TTL_SECONDS = 30;
const COMPLETED_TRANSACTION_STATUSES = ["completed", "success"];
const IST_OFFSET_MINUTES = 330;

let usersLegacyIdColumnAvailablePromise = null;

function isUndefinedTableError(error) {
  return String(error?.code || "").toUpperCase() === "42P01";
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getNextIstMidnightIso(now = new Date()) {
  const istNow = addMinutes(now, IST_OFFSET_MINUTES);
  const nextIstMidnight = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 0, 0, 0),
  );
  const nextUtc = addMinutes(nextIstMidnight, -IST_OFFSET_MINUTES);
  return nextUtc.toISOString();
}

function getNextWeeklyLeaderboardPayoutIso(now = new Date()) {
  const istNow = addMinutes(now, IST_OFFSET_MINUTES);
  const istDay = istNow.getUTCDay(); // 0=Sun, 1=Mon
  let daysUntilMonday = (8 - istDay) % 7;
  const target = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 10, 0),
  );
  if (daysUntilMonday === 0 && istNow > target) {
    daysUntilMonday = 7;
  }
  target.setUTCDate(target.getUTCDate() + daysUntilMonday);
  const nextUtc = addMinutes(target, -IST_OFFSET_MINUTES);
  return nextUtc.toISOString();
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function enforceUserAccess(
  req,
  res,
  { allowQueryOverride = false, allowParamOverride = false } = {},
) {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;
  const requestedParamUserId = allowParamOverride
    ? parseOptionalString(req.params?.userId)
    : null;

  if (
    (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) ||
    (requestedParamUserId && requestedParamUserId !== authenticatedUserId)
  ) {
    res.status(403).json({ error: "Cannot access another user rewards" });
    return null;
  }

  return authenticatedUserId;
}

async function hasUsersLegacyIdColumn() {
  if (!usersLegacyIdColumnAvailablePromise) {
    usersLegacyIdColumnAvailablePromise = runQuery(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'id'
      ) AS available
    `)
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
      [normalizedRawUserId],
    );

    return parseOptionalString(lookup.rows[0]?.user_id) || normalizedRawUserId;
  } catch (error) {
    logger.warn("[Rewards] Failed to resolve canonical user ID, using raw identifier", {
      message: error.message,
    });
    return normalizedRawUserId;
  }
}

async function getStreakSnapshot(userId) {
  try {
    const result = await runQuery(
      `
        SELECT visit_streak, post_streak
        FROM user_streaks
        WHERE user_id::text = $1
        LIMIT 1
      `,
      [userId],
    );
    return result.rows[0] || null;
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return null;
    }
    logger.warn("[Rewards] Failed to fetch streak snapshot", { message: error.message });
    return null;
  }
}

async function getTransactionVerificationSchema() {
  try {
    const result = await runQuery(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name IN ('otp_hash', 'secret_otp')
      `,
    );
    const columns = new Set((result.rows || []).map((row) => String(row.column_name || "").toLowerCase()));
    return {
      otpHash: columns.has("otp_hash"),
      secretOtp: columns.has("secret_otp"),
    };
  } catch (error) {
    logger.warn("[Rewards] Failed to inspect transaction verification columns", { message: error.message });
    return { otpHash: false, secretOtp: false };
  }
}

function buildVerifiedTransactionClause(schema, alias = "t") {
  if (!schema?.otpHash && !schema?.secretOtp) {
    return "";
  }
  return `AND (${alias}.otp_hash IS NOT NULL OR ${alias}.secret_otp IS NOT NULL)`;
}

async function countQualifiedDirectReferrals(userId, directReferralIds, txSchema) {
  if (!directReferralIds?.length) return 0;
  try {
    const verifiedClause = buildVerifiedTransactionClause(txSchema, "t");
    const result = await runQuery(
      `
        SELECT COUNT(DISTINCT user_id)::int AS qualified
        FROM (
          SELECT t.seller_id::text AS user_id
          FROM transactions t
          WHERE t.seller_id::text = ANY($1::text[])
            AND t.status = ANY($2::text[])
            ${verifiedClause}
          UNION
          SELECT t.buyer_id::text AS user_id
          FROM transactions t
          WHERE t.buyer_id::text = ANY($1::text[])
            AND t.status = ANY($2::text[])
            ${verifiedClause}
        ) qualified_users
      `,
      [directReferralIds.map(String), COMPLETED_TRANSACTION_STATUSES],
    );
    return toInt(result.rows[0]?.qualified, 0);
  } catch (error) {
    logger.warn("[Rewards] Failed to count qualified referrals", { message: error.message });
    return 0;
  }
}

async function getChainEarnedPoints(userId) {
  try {
    const result = await runQuery(
      `
        SELECT COALESCE(SUM(points), 0)::int AS total
        FROM reward_log
        WHERE user_id::text = $1
          AND action LIKE 'referral_chain_%'
      `,
      [userId],
    );
    return toInt(result.rows[0]?.total, 0);
  } catch (error) {
    logger.warn("[Rewards] Failed to load chain earned points", { message: error.message });
    return 0;
  }
}

async function getReferralLedgerSnapshot(userId) {
  try {
    const result = await runQuery(
      `
        SELECT
          COUNT(*) FILTER (WHERE action = 'qualified_referral_bonus')::int AS qualified_bonus_entries,
          COUNT(*) FILTER (WHERE action LIKE 'referral_chain_%')::int AS chain_reward_entries,
          MAX(created_at) FILTER (
            WHERE action = 'qualified_referral_bonus' OR action LIKE 'referral_chain_%'
          ) AS last_referral_reward_at
        FROM reward_log
        WHERE user_id::text = $1
      `,
      [userId],
    );

    const row = result.rows[0] || {};
    return {
      qualifiedBonusEntries: toInt(row.qualified_bonus_entries, 0),
      chainRewardEntries: toInt(row.chain_reward_entries, 0),
      lastReferralRewardAt: row.last_referral_reward_at || null,
      hasError: false,
    };
  } catch (error) {
    logger.warn("[Rewards] Failed to load referral ledger snapshot", { message: error.message });
    return {
      qualifiedBonusEntries: 0,
      chainRewardEntries: 0,
      lastReferralRewardAt: null,
      hasError: true,
    };
  }
}

async function getLeaderboardHistory(userId, limit = 5) {
  try {
    const result = await runQuery(
      `
        SELECT action, points, description, created_at
        FROM reward_log
        WHERE user_id::text = $1
          AND action IN ('leaderboard_top_seller', 'leaderboard_top_buyer')
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userId, limit],
    );
    return result.rows || [];
  } catch (error) {
    logger.warn("[Rewards] Failed to load leaderboard history", { message: error.message });
    return [];
  }
}

function generateReferralCode(userId, username) {
  const prefix = (username || "USR")
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "U");
  const idPart = String(userId)
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-4)
    .padStart(4, "0");
  const entropy = (hashString(`${userId}:${Date.now()}`) % 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");

  return `${prefix}${idPart}${entropy}`;
}

function generateDailySecretCode(userId) {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const hash = (hashString(`${userId}:${dateKey}`) % 9000) + 1000;
  return `SEC-${hash}`;
}

function toJoinDate(value) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}

function buildReferralTree(referralChain, rootUser) {
  const rootId = parseOptionalString(rootUser?.id) || "root";
  const rootNode = {
    id: rootId,
    name: rootUser?.name || "You",
    depth: 0,
    type: "root",
    coins: 0,
    joinDate: "",
    children: [],
  };

  const byId = new Map([[rootId, rootNode]]);

  referralChain.forEach((item, index) => {
    const id = parseOptionalString(item.id) || `node-${index}`;
    if (!id || id === rootId) return;

    byId.set(id, {
      ...item,
      id,
      parentId: parseOptionalString(item.parentId) || rootId,
      children: [],
    });
  });

  Array.from(byId.values()).forEach((node) => {
    if (node.id === rootId) return;

    const safeParentId = node.parentId === node.id ? rootId : node.parentId;
    const parent = byId.get(safeParentId) || rootNode;
    parent.children.push(node);
  });

  const sortNodes = (node) => {
    node.children.sort((left, right) => {
      const leftDepth = Number(left.depth || 0);
      const rightDepth = Number(right.depth || 0);
      if (leftDepth !== rightDepth) return leftDepth - rightDepth;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
    node.children.forEach(sortNodes);
  };

  sortNodes(rootNode);
  return rootNode;
}

async function calculateChainPoints(userId) {
  try {
    const chainResult = await runQuery(
      `
        WITH RECURSIVE referral_chain AS (
          SELECT
            u.user_id::text AS user_id,
            u.username,
            u.referred_by::text AS parent_user_id,
            1 AS depth,
            u.created_at
          FROM users u
          WHERE u.referred_by::text = $1

          UNION ALL

          SELECT
            child.user_id::text AS user_id,
            child.username,
            child.referred_by::text AS parent_user_id,
            chain.depth + 1 AS depth,
            child.created_at
          FROM users child
          INNER JOIN referral_chain chain
            ON child.referred_by::text = chain.user_id
          WHERE chain.depth < 12
        )
        SELECT
          chain.user_id,
          chain.username,
          chain.parent_user_id,
          chain.depth,
          chain.created_at,
          profile.full_name
        FROM referral_chain chain
        LEFT JOIN profiles profile
          ON profile.user_id::text = chain.user_id
        ORDER BY chain.depth ASC, chain.created_at ASC
      `,
      [userId],
    );

    const rows = Array.isArray(chainResult.rows) ? chainResult.rows : [];
    const directReferrals = [];
    const indirectReferrals = [];

    rows.forEach((row) => {
      const depth = toInt(row.depth, 0);
      if (depth === 1) {
        directReferrals.push(row);
      } else if (depth > 1) {
        indirectReferrals.push(row);
      }
    });

    const directPoints = directReferrals.reduce(
      (total, row) => total + getChainRewardForDepth(toInt(row.depth, 1)),
      0,
    );
    const indirectPoints = indirectReferrals.reduce(
      (total, row) => total + getChainRewardForDepth(toInt(row.depth, 2)),
      0,
    );

    return {
      rows,
      directReferrals,
      indirectReferrals,
      directPoints,
      indirectPoints,
      totalChainPoints: directPoints + indirectPoints,
    };
  } catch (error) {
    logger.error("Error calculating chain points:", error);
    return {
      rows: [],
      directReferrals: [],
      indirectReferrals: [],
      directPoints: 0,
      indirectPoints: 0,
      totalChainPoints: 0,
    };
  }
}

exports.getRewardsByUser = async (req, res) => {
  const userIdFromSession = enforceUserAccess(req, res, {
    allowQueryOverride: true,
    allowParamOverride: true,
  });
  if (!userIdFromSession) return;

  try {
    const userId = await resolveCanonicalUserId(userIdFromSession);
    const cacheKey = `rewards:${userId}:profile`;

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const [userResult, rewardsResult, chainData, activityResult, streakSnapshot, profileResult, postsCountResult] =
          await Promise.all([
          runQuery(
            `
              SELECT u.user_id, u.username, u.referral_code, p.full_name
              FROM users u
              LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
              WHERE u.user_id::text = $1
              LIMIT 1
            `,
            [userId],
          ),
          runQuery(
            `
              SELECT points, tier FROM rewards
              WHERE user_id::text = $1
              LIMIT 1
            `,
            [userId],
          ),
          calculateChainPoints(userId),
          runQuery(
            `
              SELECT
                COUNT(*) FILTER (WHERE action = 'sale_completed')::int AS sales_count,
                COUNT(*) FILTER (WHERE action = 'purchase_completed')::int AS purchases_count,
                COUNT(*) FILTER (
                  WHERE action IN ('referral_bonus', 'qualified_referral_bonus')
                )::int AS referrals_count,
                COUNT(*) FILTER (WHERE action = 'post_daily')::int AS posts_count,
                COUNT(*) FILTER (WHERE action = 'visit_daily')::int AS visits_count,
                COUNT(*) FILTER (
                  WHERE action = 'sale_completed'
                    AND created_at >= NOW() - INTERVAL '1 day'
                )::int AS sales_today,
                COUNT(*) FILTER (
                  WHERE action = 'purchase_completed'
                    AND created_at >= NOW() - INTERVAL '1 day'
                )::int AS purchases_today,
                COUNT(*) FILTER (
                  WHERE action IN ('referral_bonus', 'qualified_referral_bonus')
                    AND created_at >= NOW() - INTERVAL '1 day'
                )::int AS referrals_today
                ,
                COUNT(*) FILTER (
                  WHERE action = 'post_daily'
                    AND created_at >= NOW() - INTERVAL '1 day'
                )::int AS posts_today,
                COUNT(*) FILTER (
                  WHERE action = 'visit_daily'
                    AND created_at >= NOW() - INTERVAL '1 day'
                )::int AS visits_today
              FROM reward_log
              WHERE user_id::text = $1
            `,
            [userId],
          ),
          getStreakSnapshot(userId),
          runQuery(
            `
              SELECT full_name, phone, address, avatar_url
              FROM profiles
              WHERE user_id::text = $1
              LIMIT 1
            `,
            [userId],
          ),
          runQuery(
            `
              SELECT COUNT(*)::int AS total
              FROM posts
              WHERE user_id::text = $1
            `,
            [userId],
          ),
        ]);

        const userRow = userResult.rows[0] || {
          user_id: userId,
          username: "Unknown",
          referral_code: null,
          full_name: null,
        };

        const rewardsRow = rewardsResult.rows[0] || {
          points: 0,
          tier: "Bronze",
        };

        const displayName = userRow.full_name || userRow.username || "Unknown User";
        const totalPoints = Number(rewardsRow.points || 0);
        const activityRow = activityResult.rows[0] || {};
        const activityStats = {
          salesCount: toInt(activityRow.sales_count, 0),
          purchasesCount: toInt(activityRow.purchases_count, 0),
          referralsCount: Math.max(chainData.directReferrals.length, toInt(activityRow.referrals_count, 0)),
          postsCount: toInt(activityRow.posts_count, 0),
          visitsCount: toInt(activityRow.visits_count, 0),
          salesToday: toInt(activityRow.sales_today, 0),
          purchasesToday: toInt(activityRow.purchases_today, 0),
          referralsToday: toInt(activityRow.referrals_today, 0),
          postsToday: toInt(activityRow.posts_today, 0),
          visitsToday: toInt(activityRow.visits_today, 0),
        };

        let rank = "Bronze";
        if (totalPoints >= 5000) rank = "Platinum";
        else if (totalPoints >= 2000) rank = "Gold";
        else if (totalPoints >= 500) rank = "Silver";

        let referralCode = userRow.referral_code;
        if (!referralCode) {
          const generatedCode = generateReferralCode(userId, userRow.username);
          const updateResult = await runQuery(
            `
              UPDATE users
              SET referral_code = COALESCE(referral_code, $1)
              WHERE user_id::text = $2
              RETURNING referral_code
            `,
            [generatedCode, userId],
          );
          referralCode = updateResult.rows[0]?.referral_code || generatedCode;
        }

        const referralChain = chainData.rows.map((row) => {
          const depth = toInt(row.depth, 1);
          return {
            id: row.user_id,
            parentId: parseOptionalString(row.parent_user_id) || userId,
            name: row.full_name || row.username || "User",
            depth,
            type: depth === 1 ? "direct" : "indirect",
            coins: getChainRewardForDepth(depth),
            joinDate: toJoinDate(row.created_at),
          };
        });

        const visitStreak = toInt(streakSnapshot?.visit_streak, 0);
        const postStreak = toInt(streakSnapshot?.post_streak, 0);
        const txSchema = await getTransactionVerificationSchema();
        const qualifiedDirectReferrals = await countQualifiedDirectReferrals(
          userId,
          chainData.directReferrals.map((row) => row.user_id),
          txSchema,
        );
        const [chainEarnedPoints, leaderboardHistory, referralLedgerSnapshot] = await Promise.all([
          getChainEarnedPoints(userId),
          getLeaderboardHistory(userId, 5),
          getReferralLedgerSnapshot(userId),
        ]);
        const nextLeaderboardPayoutAt = getNextWeeklyLeaderboardPayoutIso();
        const lastLeaderboardPayoutAt = leaderboardHistory[0]?.created_at || null;
        const profileRow = profileResult?.rows?.[0] || {};
        const profileComplete = Boolean(
          parseOptionalString(profileRow.full_name) &&
            parseOptionalString(profileRow.phone) &&
            parseOptionalString(profileRow.address) &&
            parseOptionalString(profileRow.avatar_url),
        );
        const hasPosted = Number(postsCountResult?.rows?.[0]?.total || 0) > 0;
        const referralLedgerMatches =
          referralLedgerSnapshot.qualifiedBonusEntries === qualifiedDirectReferrals;
        const referralLedgerStatus = referralLedgerSnapshot.hasError
          ? "unavailable"
          : referralLedgerMatches
            ? "ok"
            : "mismatch";

        const userPayload = {
          id: userRow.user_id || userId,
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
          potentialReferralPoints: chainData.totalChainPoints,
          streak: visitStreak,
          visitStreak,
          postStreak,
          profileComplete,
          hasPosted,
          qualifiedReferrals: qualifiedDirectReferrals,
          chainEarnedPoints,
          successfulRefs: qualifiedDirectReferrals,
          activityStats,
          leaderboard: {
            nextPayoutAt: nextLeaderboardPayoutAt,
            lastPayoutAt: lastLeaderboardPayoutAt,
            history: leaderboardHistory,
          },
          referralLedger: {
            qualifiedReferralCount: qualifiedDirectReferrals,
            qualifiedBonusEntries: referralLedgerSnapshot.qualifiedBonusEntries,
            chainRewardEntries: referralLedgerSnapshot.chainRewardEntries,
            lastReferralRewardAt: referralLedgerSnapshot.lastReferralRewardAt,
            matchesQualifiedReferrals: referralLedgerMatches,
            status: referralLedgerStatus,
          },
          dailySecretCodeExpiresAt: getNextIstMidnightIso(),
        };

        return {
          user: userPayload,
          referralChain,
          referralTree: buildReferralTree(referralChain, userPayload),
          chainRules: getChainRewardRules(),
        };
      },
      REWARDS_PROFILE_CACHE_TTL_SECONDS,
    );

    return res.json(payload);
  } catch (error) {
    logger.error("Rewards Controller Error:", error);
    return res.status(200).json({
      user: {
        rank: "Bronze",
        totalCoins: 0,
        name: "Error Loading",
        referralCode: "ERROR",
      },
      referralChain: [],
      referralTree: null,
    });
  }
};

exports.getRewards = exports.getRewardsByUser;

exports.getRewardLog = async (req, res) => {
  const userIdFromSession = enforceUserAccess(req, res, {
    allowQueryOverride: true,
  });
  if (!userIdFromSession) return;

  const limit = parsePositiveInt(req.query?.limit, DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT);

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
          [userId, limit],
        );

        return result.rows;
      },
      REWARDS_LOG_CACHE_TTL_SECONDS,
    );

    return res.json(payload);
  } catch (error) {
    logger.warn("[Rewards] Failed to fetch reward log", { message: error.message });
    return res.json([]);
  }
};

exports.streamRewardUpdates = async (req, res) => {
  const userIdFromSession = getAuthenticatedUserId(req);
  if (!userIdFromSession) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userId = await resolveCanonicalUserId(userIdFromSession);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write("retry: 5000\n\n");

  const writeEvent = (eventName, payload) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    if (typeof res.flush === "function") {
      res.flush();
    }
  };

  writeEvent("connected", {
    userId,
    connectedAt: new Date().toISOString(),
  });

  const unsubscribe = subscribeToRewardUpdates(userId, (payload) => {
    writeEvent("reward_update", payload);
  });

  const keepAliveTimer = setInterval(() => {
    writeEvent("keepalive", { ts: new Date().toISOString() });
  }, 25000);

  if (typeof keepAliveTimer.unref === "function") {
    keepAliveTimer.unref();
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(keepAliveTimer);
    unsubscribe();
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);
  res.on("close", cleanup);
};
