require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function main() {
  try {
    const userIdType = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id'"
    );
    console.log('users.user_id type:', JSON.stringify(userIdType.rows));

    const notifCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position"
    );
    console.log('notifications columns:', JSON.stringify(notifCols.rows));

    const rvCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'recently_viewed' ORDER BY ordinal_position"
    );
    console.log('recently_viewed columns:', JSON.stringify(rvCols.rows));

    const wlCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wishlists' ORDER BY ordinal_position"
    );
    console.log('wishlists columns:', JSON.stringify(wlCols.rows));

    const cartCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cart_items' ORDER BY ordinal_position"
    );
    console.log('cart_items columns:', JSON.stringify(cartCols.rows));

    const extraTables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('notification_preferences','cart_items','cart_promotions') AND table_schema='public'"
    );
    console.log('extra tables:', JSON.stringify(extraTables.rows));

    // Check channel-related tables
    const channelCols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'channels' ORDER BY ordinal_position"
    );
    console.log('channels columns:', JSON.stringify(channelCols.rows));

    const followerTable = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('channel_followers','channel_members') AND table_schema='public'"
    );
    console.log('follower tables:', JSON.stringify(followerTable.rows));

    // Quick data counts
    const counts = await pool.query(`
      SELECT 'notifications' as t, COUNT(*) as c FROM notifications
      UNION ALL SELECT 'recently_viewed', COUNT(*) FROM recently_viewed
      UNION ALL SELECT 'wishlists', COUNT(*) FROM wishlists
    `);
    console.log('row counts:', JSON.stringify(counts.rows));

  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

main();
