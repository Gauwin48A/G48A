const { runQuery } = require("../utils/dbHelpers");
const pool = require("../config/db");
const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const TOP_LIMIT = 5;
const COMPLETED_STATUSES = ["completed", "success"];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rankForIndex(index) {
  if (index === 0) return "Gold";
  if (index === 1) return "Silver";
  if (index === 2) return "Bronze";
  return "Rising";
}

async function safeQuery(sql, params = []) {
  try {
    const result = await pool.query({ text: sql, values: params, query_timeout: DB_QUERY_TIMEOUT_MS });
    return result.rows || [];
  } catch (error) {
    logger.warn("publicwall query failed:", error.message);
    return [];
  }
}

async function getTransactionsSchema() {
  const rows = await safeQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'transactions'
    `,
  );
  const columns = new Set(rows.map((row) => String(row.column_name || "").toLowerCase()));
  return {
    agreedPrice: columns.has("agreed_price"),
    amount: columns.has("amount"),
    otpHash: columns.has("otp_hash"),
    secretOtp: columns.has("secret_otp"),
  };
}

function resolvePriceColumn(schema) {
  if (schema?.agreedPrice) return "agreed_price";
  if (schema?.amount) return "amount";
  return null;
}

function buildVerifiedClause(schema, alias = "t") {
  if (!schema?.otpHash && !schema?.secretOtp) {
    return "";
  }
  return `AND (${alias}.otp_hash IS NOT NULL OR ${alias}.secret_otp IS NOT NULL)`;
}

exports.getPublicWall = async (req, res) => {
  try {
    const cached = cacheService.get("publicwall:data");
    if (cached) return res.json(cached);

    const schema = await getTransactionsSchema();
  const priceColumn = resolvePriceColumn(schema);
  const verifiedClause = buildVerifiedClause(schema, "t");
  const priceExpr = priceColumn
    ? `COALESCE(SUM(t.${priceColumn}) FILTER (WHERE t.status = ANY($1::text[]) ${verifiedClause}), 0)::numeric AS total_value`
    : "0::numeric AS total_value";

  const topSellersPromise = safeQuery(
    `
      SELECT
        u.user_id::text AS id,
        COALESCE(p.full_name, u.username, split_part(u.email, '@', 1), 'User') AS name,
        COALESCE(u.rating, 0) AS rating,
        COUNT(t.transaction_id) FILTER (WHERE t.status = ANY($1::text[]) ${verifiedClause})::int AS sales,
        ${priceExpr}
      FROM users u
      LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
      LEFT JOIN transactions t ON t.seller_id::text = u.user_id::text
      GROUP BY u.user_id, p.full_name, u.username, u.email, u.rating
      ORDER BY sales DESC, total_value DESC, u.user_id
      LIMIT $2
    `,
    [COMPLETED_STATUSES, TOP_LIMIT],
  );

  const topBuyersPromise = safeQuery(
    `
      SELECT
        u.user_id::text AS id,
        COALESCE(p.full_name, u.username, split_part(u.email, '@', 1), 'User') AS name,
        COALESCE(u.rating, 0) AS rating,
        COUNT(t.transaction_id) FILTER (WHERE t.status = ANY($1::text[]) ${verifiedClause})::int AS purchases,
        ${priceExpr}
      FROM users u
      LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
      LEFT JOIN transactions t ON t.buyer_id::text = u.user_id::text
      GROUP BY u.user_id, p.full_name, u.username, u.email, u.rating
      ORDER BY purchases DESC, total_value DESC, u.user_id
      LIMIT $2
    `,
    [COMPLETED_STATUSES, TOP_LIMIT],
  );

  const topUsersPromise = safeQuery(
    `
      SELECT
        u.user_id::text AS id,
        COALESCE(p.full_name, u.username, split_part(u.email, '@', 1), 'User') AS name,
        COALESCE(r.points, 0)::int AS total_coins,
        COALESCE(r.tier, 'Bronze') AS badge
      FROM users u
      LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
      LEFT JOIN rewards r ON r.user_id::text = u.user_id::text
      ORDER BY total_coins DESC, u.user_id
      LIMIT $1
    `,
    [TOP_LIMIT],
  );

  const [sellerRows, buyerRows, userRows] = await Promise.all([
    topSellersPromise,
    topBuyersPromise,
    topUsersPromise,
  ]);

  const topSellers = sellerRows.map((row, index) => {
    const totalValue = toNumber(row.total_value, 0);
    const sales = toNumber(row.sales, 0);
    const coins = totalValue > 0 ? Math.floor(totalValue / 100) : sales * 10;
    return {
      id: row.id,
      name: row.name,
      rank: rankForIndex(index),
      rating: Number(toNumber(row.rating, 0)).toFixed(1),
      sales,
      coins,
      verified: false,
    };
  });

  const topBuyers = buyerRows.map((row, index) => {
    const totalValue = toNumber(row.total_value, 0);
    const purchases = toNumber(row.purchases, 0);
    const coins = totalValue > 0 ? Math.floor(totalValue / 200) : purchases * 5;
    return {
      id: row.id,
      name: row.name,
      rank: rankForIndex(index),
      rating: Number(toNumber(row.rating, 0)).toFixed(1),
      purchases,
      coins,
      verified: false,
    };
  });

  const topUsers = userRows.map((row) => {
    const totalCoins = toNumber(row.total_coins, 0);
    return {
      id: row.id,
      name: row.name,
      totalCoins,
      level: Math.max(1, Math.floor(totalCoins / 100) + 1),
      badge: row.badge,
    };
  });

  const result = { topSellers, topBuyers, topUsers };
  cacheService.set("publicwall:data", result, 120); // cache 2 minutes
  return res.json(result);
  } catch (err) {
    logger.error("PublicWall error:", err.message);
    return res.status(500).json({ error: "Failed to load public wall" });
  }
};
