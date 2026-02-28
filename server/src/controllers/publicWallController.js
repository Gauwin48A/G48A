const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rankForIndex(index) {
  if (index === 0) return 'Gold';
  if (index === 1) return 'Silver';
  if (index === 2) return 'Bronze';
  return 'Rising';
}

async function safeQuery(sql, params = []) {
  try {
    const result = await pool.query({
      text: sql,
      values: params,
      query_timeout: DB_QUERY_TIMEOUT_MS
    });
    return result.rows || [];
  } catch (error) {
    logger.warn('publicwall query failed:', error.message);
    return [];
  }
}

exports.getPublicWall = async (req, res) => {
  const topSellersPromise = safeQuery(`
    SELECT
      u.user_id::text AS id,
      COALESCE(p.full_name, u.username, split_part(u.email, '@', 1), 'User') AS name,
      COALESCE(u.rating, 0) AS rating,
      COUNT(post.post_id) FILTER (WHERE post.status = 'sold')::int AS sales
    FROM users u
    LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
    LEFT JOIN posts post ON post.user_id::text = u.user_id::text
    GROUP BY u.user_id, p.full_name, u.username, u.email, u.rating
    ORDER BY sales DESC, u.user_id
    LIMIT 5
  `);

  const topBuyersPromise = safeQuery(`
    SELECT
      u.user_id::text AS id,
      COALESCE(p.full_name, u.username, split_part(u.email, '@', 1), 'User') AS name,
      COALESCE(u.rating, 0) AS rating,
      COUNT(t.transaction_id)::int AS purchases
    FROM users u
    LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
    LEFT JOIN transactions t ON t.buyer_id::text = u.user_id::text
    GROUP BY u.user_id, p.full_name, u.username, u.email, u.rating
    ORDER BY purchases DESC, u.user_id
    LIMIT 5
  `);

  const topUsersPromise = safeQuery(`
    SELECT
      u.user_id::text AS id,
      COALESCE(p.full_name, u.username, split_part(u.email, '@', 1), 'User') AS name,
      COALESCE(r.points, 0)::int AS total_coins,
      COALESCE(r.tier, 'Bronze') AS badge
    FROM users u
    LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
    LEFT JOIN rewards r ON r.user_id::text = u.user_id::text
    ORDER BY total_coins DESC, u.user_id
    LIMIT 5
  `);

  const [sellerRows, buyerRows, userRows] = await Promise.all([
    topSellersPromise,
    topBuyersPromise,
    topUsersPromise
  ]);

  const topSellers = sellerRows.map((row, index) => ({
    id: row.id,
    name: row.name,
    rank: rankForIndex(index),
    rating: Number(toNumber(row.rating, 0)).toFixed(1),
    sales: toNumber(row.sales, 0),
    coins: toNumber(row.sales, 0) * 10,
    verified: false
  }));

  const topBuyers = buyerRows.map((row, index) => ({
    id: row.id,
    name: row.name,
    rank: rankForIndex(index),
    rating: Number(toNumber(row.rating, 0)).toFixed(1),
    purchases: toNumber(row.purchases, 0),
    coins: toNumber(row.purchases, 0) * 5,
    verified: false
  }));

  const topUsers = userRows.map((row) => {
    const totalCoins = toNumber(row.total_coins, 0);
    return {
      id: row.id,
      name: row.name,
      totalCoins,
      level: Math.max(1, Math.floor(totalCoins / 100) + 1),
      badge: row.badge
    };
  });

  return res.json({
    topSellers,
    topBuyers,
    topUsers
  });
};
