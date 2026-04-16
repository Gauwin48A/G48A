const pool = require('../src/config/db');
const readline = require('readline');

const nukePayments = async () => {
    // Safety guard: block execution in production
    if (process.env.NODE_ENV === 'production') {
        console.error('BLOCKED: This script cannot run in production. Set NODE_ENV to something else to proceed.');
        process.exit(1);
    }

    // Require explicit confirmation
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
        rl.question('WARNING: This will DROP payments, user_subscriptions, and notifications tables. Type "CONFIRM" to proceed: ', resolve);
    });
    rl.close();

    if (answer !== 'CONFIRM') {
        console.log('Aborted.');
        process.exit(0);
    }

    console.log('Dropping legacy payment tables...');
    try {
        await pool.query('DROP VIEW IF EXISTS v_pending_payments CASCADE');
        await pool.query('DROP VIEW IF EXISTS v_active_posts CASCADE');
        await pool.query('DROP TABLE IF EXISTS payments CASCADE');
        await pool.query('DROP TABLE IF EXISTS user_subscriptions CASCADE');
        await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
        console.log('Tables dropped.');
        process.exit(0);
    } catch (err) {
        console.error('Nuke failed:', err);
        process.exit(1);
    }
};

nukePayments();
