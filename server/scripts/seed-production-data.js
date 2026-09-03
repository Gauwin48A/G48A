/**
 * Production Seed Data Runner
 * 
 * Safely populates all 36 tables with realistic Indian marketplace data.
 * Checks if data already exists before running to prevent duplicates.
 * 
 * Usage:
 *   node server/scripts/seed-production-data.js
 *   node server/scripts/seed-production-data.js --force   (skip safety check)
 */

const fs = require('fs');
const path = require('path');
const dbPool = require('../src/config/dbPool');

const SEED_FILE = path.join(__dirname, '../database/migrations/seed_production_data.sql');

async function run() {
    const force = process.argv.includes('--force');
    
    console.log('='.repeat(70));
    console.log('🌱 ZARUDA PLATFORM: PRODUCTION SEED DATA RUNNER');
    console.log(`Mode: ${force ? 'FORCED (skip safety check)' : 'SAFE (checks before seeding)'}`);
    console.log(`Target: ${SEED_FILE}`);
    console.log('='.repeat(70));

    if (!fs.existsSync(SEED_FILE)) {
        console.error(`❌ Error: Seed file not found at ${SEED_FILE}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(SEED_FILE, 'utf8');
    console.log(`📄 Loaded seed script (${sqlContent.length} bytes, ~${sqlContent.split('\n').length} lines).`);

    try {
        console.log('\n🔌 Connecting to PostgreSQL primary pool...');
        const client = await dbPool.connect();

        try {
            // Safety check: verify if data already exists
            if (!force) {
                const existingCheck = await client.query('SELECT COUNT(*) FROM categories WHERE name = $1', ['Electronics']);
                if (parseInt(existingCheck.rows[0].count) > 0) {
                    console.log('\n⚠️  Seed data already exists! Use --force to re-seed.');
                    console.log('   Note: The seed script uses ON CONFLICT DO NOTHING, so re-running is safe.');
                    console.log('   Existing data will NOT be overwritten.');
                    
                    // Show current counts
                    const counts = await client.query(`
                        SELECT 
                            (SELECT COUNT(*) FROM users WHERE email LIKE '%@zaruda.com') as users,
                            (SELECT COUNT(*) FROM categories) as categories,
                            (SELECT COUNT(*) FROM posts) as posts,
                            (SELECT COUNT(*) FROM channels) as channels
                    `);
                    const row = counts.rows[0];
                    console.log(`\n📊 Current seed data: ${row.users} users, ${row.categories} categories, ${row.posts} posts, ${row.channels} channels`);
                    console.log('   Run with --force to add more seed data.');
                    await client.release();
                    await dbPool.end();
                    return;
                }
            }

            console.log('⚡ Executing seed script in transaction block...');
            await client.query('BEGIN');
            await client.query(sqlContent);
            await client.query('COMMIT');
            console.log('✅ Seed data executed successfully!');

            // Verification
            console.log('\n📊 Verifying seeded data...');
            const result = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE email LIKE '%@zaruda.com') as users,
                    (SELECT COUNT(*) FROM categories) as categories,
                    (SELECT COUNT(*) FROM subcategories) as subcategories,
                    (SELECT COUNT(*) FROM tiers) as tiers,
                    (SELECT COUNT(*) FROM posts) as posts,
                    (SELECT COUNT(*) FROM profiles) as profiles,
                    (SELECT COUNT(*) FROM rewards) as rewards,
                    (SELECT COUNT(*) FROM wishlists) as wishlists,
                    (SELECT COUNT(*) FROM channels) as channels,
                    (SELECT COUNT(*) FROM feed_posts) as feed_posts,
                    (SELECT COUNT(*) FROM reviews) as reviews,
                    (SELECT COUNT(*) FROM offers) as offers,
                    (SELECT COUNT(*) FROM referrals) as referrals,
                    (SELECT COUNT(*) FROM notifications) as notifications,
                    (SELECT COUNT(*) FROM user_follows) as user_follows,
                    (SELECT COUNT(*) FROM promoted_posts) as promoted_posts,
                    (SELECT COUNT(*) FROM reports) as reports
            `);
            
            const row = result.rows[0];
            console.log('\n📋 Seeded Data Summary:');
            console.log(`  Users:           ${row.users}`);
            console.log(`  Categories:      ${row.categories}`);
            console.log(`  Subcategories:   ${row.subcategories}`);
            console.log(`  Tiers:           ${row.tiers}`);
            console.log(`  Posts:           ${row.posts}`);
            console.log(`  Profiles:        ${row.profiles}`);
            console.log(`  Rewards:         ${row.rewards}`);
            console.log(`  Wishlists:       ${row.wishlists}`);
            console.log(`  Channels:        ${row.channels}`);
            console.log(`  Feed Posts:      ${row.feed_posts}`);
            console.log(`  Reviews:         ${row.reviews}`);
            console.log(`  Offers:          ${row.offers}`);
            console.log(`  Referrals:       ${row.referrals}`);
            console.log(`  Notifications:   ${row.notifications}`);
            console.log(`  User Follows:    ${row.user_follows}`);
            console.log(`  Promoted Posts:  ${row.promoted_posts}`);
            console.log(`  Reports:         ${row.reports}`);
            
            console.log('\n🎉 Seed data loaded successfully!');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await dbPool.end();
    }
}

run();
