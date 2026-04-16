const { DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");

function calculateSaleRewardPoints(saleAmount) {
  const normalizedSaleAmount = Math.max(0, Number(saleAmount) || 0);
  return {
    sellerPoints: Math.floor(normalizedSaleAmount / 100),
    buyerPoints: Math.floor(normalizedSaleAmount / 200),
  };
}

async function hasPriorCompletedTransactions(client, roleColumn, userId, excludeTransactionId) {
  const result = await client.query(
    {
      text: `
        SELECT 1
        FROM transactions
        WHERE ${roleColumn}::text = $1
          AND status = ANY($2::text[])
          AND transaction_id::text <> $3
        LIMIT 1
      `,
      values: [String(userId), ["completed", "success"], String(excludeTransactionId)],
      query_timeout: DB_QUERY_TIMEOUT_MS,
    },
  );
  return result.rows.length > 0;
}

module.exports = {
  calculateSaleRewardPoints,
  hasPriorCompletedTransactions,
};
