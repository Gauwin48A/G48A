const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

let tierColumnsReady = false;
let tierColumnsPromise = null;

async function ensureUserTierColumns() {
  if (tierColumnsReady) {
    return;
  }
  if (tierColumnsPromise) {
    return tierColumnsPromise;
  }

  tierColumnsPromise = (async () => {
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'`);
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ`);
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INT DEFAULT 1`);
    await runQuery(`
      UPDATE users
      SET tier = COALESCE(tier, 'basic'),
          post_credits = COALESCE(post_credits, 1)
      WHERE tier IS NULL OR post_credits IS NULL
    `);
    tierColumnsReady = true;
    logger.info('[SchemaGuard] User tier columns verified');
  })()
    .finally(() => {
      tierColumnsPromise = null;
    });

  return tierColumnsPromise;
}

module.exports = {
  ensureUserTierColumns
};
