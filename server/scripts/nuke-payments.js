const pool = require('../src/config/db');

const nukePayments = async () => {
    console.log('💥 Nuking Legacy Payment Tables...');
    try {
        await pool.query('DROP VIEW IF EXISTS v_pending_payments CASCADE');
        await pool.query('DROP VIEW IF EXISTS v_active_posts CASCADE');
        await pool.query('DROP TABLE IF EXISTS payments CASCADE');
        await pool.query('DROP TABLE IF EXISTS user_subscriptions CASCADE');
        await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
        console.log('✅ Tables Dropped.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Nuke Failed:', err);
        process.exit(1);
    }
};

nukePayments();
