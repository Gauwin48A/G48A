/**
 * Zaruda Background Worker: Auto Escrow Settlement Engine
 * 
 * Auto-settles IN_APP escrow sales where the buyer has received the item
 * and 7 days have passed without any buyer dispute flags.
 */

const { pool } = require('../config/db');
const { emitNotification } = require('../services/notificationEmitter');
const logger = require('../utils/logger');

async function processEscrowSettlements() {
  logger.info('[Worker] Running auto escrow settlement check...');
  const client = await pool.connect();
  try {
    const query = `
      SELECT s.id AS sale_id, s.seller_id, s.buyer_id, s.agreed_price, s.post_id
      FROM sales s
      WHERE s.status = 'received'
        AND s.payment_mode = 'IN_APP'
        AND s.updated_at <= NOW() - INTERVAL '7 days'
      LIMIT 100;
    `;
    const res = await client.query(query);

    if (res.rows.length === 0) {
      logger.info('[Worker] No pending escrow settlements found.');
      return;
    }

    logger.info(`[Worker] Found ${res.rows.length} sales eligible for auto-settlement.`);

    for (const sale of res.rows) {
      await client.query('BEGIN');

      // Update sale status to settled
      await client.query(
        "UPDATE sales SET status = 'settled', updated_at = NOW() WHERE id = $1",
        [sale.sale_id]
      );

      // Send payout notification to seller
      await emitNotification(sale.seller_id, {
        title: 'Escrow Payment Settled 💰',
        body: `Payment of ₹${sale.agreed_price} for sale #${sale.sale_id} has been credited to your payout balance.`,
        data: {
          type: 'ESCROW_SETTLED',
          sale_id: String(sale.sale_id)
        }
      });

      await client.query('COMMIT');
      logger.info(`[Worker] Auto-settled sale #${sale.sale_id} (₹${sale.agreed_price}) for seller #${sale.seller_id}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[Worker] Error processing escrow settlements:', err);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  processEscrowSettlements()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}

module.exports = { processEscrowSettlements };
