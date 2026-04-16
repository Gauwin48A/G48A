const { pool, DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const {
  applyRewardDeltaInTransaction,
  afterCommitRewardMutation,
} = require("./rewardsLedgerService");
const TOP_SELLER_REWARDS = [500, 300, 150];
const TOP_BUYER_REWARDS = [300, 150, 75];
const PERIOD_DAYS = 7;

function getIsoWeekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = Math.round(
    ((target.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7 + 1,
  );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function getTransactionSchema() {
  const result = await pool.query({
    text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'transactions'
    `,
    values: [],
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });

  const columns = new Set((result.rows || []).map((row) => String(row.column_name || "").toLowerCase()));
  return {
    amount: columns.has("amount"),
    agreedPrice: columns.has("agreed_price"),
    completedAt: columns.has("completed_at"),
    createdAt: columns.has("created_at"),
    otpHash: columns.has("otp_hash"),
    secretOtp: columns.has("secret_otp"),
  };
}

function resolvePriceColumn(schema) {
  if (schema.agreedPrice) return "agreed_price";
  if (schema.amount) return "amount";
  return null;
}

function resolveTimeColumn(schema) {
  if (schema.completedAt) return "completed_at";
  if (schema.createdAt) return "created_at";
  return "created_at";
}

function buildVerifiedClause(schema, alias = "t") {
  if (!schema?.otpHash && !schema?.secretOtp) {
    return "";
  }
  return `AND (${alias}.otp_hash IS NOT NULL OR ${alias}.secret_otp IS NOT NULL)`;
}

async function fetchTopPerformers({ roleColumn, periodDays, limit, schema }) {
  const priceColumn = resolvePriceColumn(schema);
  const timeColumn = resolveTimeColumn(schema);
  const valueExpr = priceColumn ? `COALESCE(SUM(t.${priceColumn}), 0)::numeric` : "0::numeric";
  const verifiedClause = buildVerifiedClause(schema, "t");

  const result = await pool.query({
    text: `
      SELECT
        t.${roleColumn}::text AS user_id,
        COUNT(*)::int AS tx_count,
        ${valueExpr} AS total_value
      FROM transactions t
      WHERE t.status = ANY($1::text[])
        ${verifiedClause}
        AND t.${timeColumn} >= NOW() - INTERVAL '1 day' * $3
      GROUP BY t.${roleColumn}
      ORDER BY tx_count DESC, total_value DESC
      LIMIT $2
    `,
    values: [["completed", "success"], limit, periodDays],
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });

  return result.rows || [];
}

async function awardWeeklySalesLeaderRewards() {
  const periodKey = getIsoWeekKey(new Date());
  const client = await pool.connect();
  const rewardChanges = [];

  try {
    await client.query("BEGIN");
    const schema = await getTransactionSchema();
    const [topSellers, topBuyers] = await Promise.all([
      fetchTopPerformers({ roleColumn: "seller_id", periodDays: PERIOD_DAYS, limit: TOP_SELLER_REWARDS.length, schema }),
      fetchTopPerformers({ roleColumn: "buyer_id", periodDays: PERIOD_DAYS, limit: TOP_BUYER_REWARDS.length, schema }),
    ]);

    for (let i = 0; i < topSellers.length; i += 1) {
      const points = TOP_SELLER_REWARDS[i] || 0;
      if (!points) continue;
      const change = await applyRewardDeltaInTransaction({
        client,
        userId: topSellers[i].user_id,
        pointsDelta: points,
        action: "leaderboard_top_seller",
        description: `Top seller rank #${i + 1} (${periodKey})`,
        idempotencyKey: `leaderboard:${periodKey}:seller:${i + 1}`,
      });
      if (change?.applied) rewardChanges.push(change);
    }

    for (let i = 0; i < topBuyers.length; i += 1) {
      const points = TOP_BUYER_REWARDS[i] || 0;
      if (!points) continue;
      const change = await applyRewardDeltaInTransaction({
        client,
        userId: topBuyers[i].user_id,
        pointsDelta: points,
        action: "leaderboard_top_buyer",
        description: `Top buyer rank #${i + 1} (${periodKey})`,
        idempotencyKey: `leaderboard:${periodKey}:buyer:${i + 1}`,
      });
      if (change?.applied) rewardChanges.push(change);
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    logger.warn("[LeaderboardRewards] Failed to award weekly rewards", { message: error.message });
    return { awarded: 0, periodKey };
  } finally {
    client.release();
  }

  rewardChanges.forEach((change) => {
    if (change?.applied) {
      afterCommitRewardMutation(change);
    }
  });

  return { awarded: rewardChanges.length, periodKey };
}

module.exports = {
  awardWeeklySalesLeaderRewards,
};
