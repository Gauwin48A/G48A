// Seed profiles for all users
const pool = require('./src/config/db');

async function seedProfiles() {
    try {
        // Get all users
        const users = await pool.query('SELECT user_id, username, email FROM users');
        console.log(`Found ${users.rows.length} users`);

        for (const user of users.rows) {
            // Check if profile exists
            const existing = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [user.user_id]);

            if (existing.rows.length === 0) {
                // Create profile
                await pool.query(
                    `INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        user.user_id,
                        user.username, // Use username as full_name
                        '9876543210',  // Default phone
                        'India',       // Default address
                        'MHub User',   // Default bio
                        true           // Verified
                    ]
                );
                console.log(`Created profile for: ${user.email}`);
            } else {
                console.log(`Profile exists for: ${user.email}`);
            }
        }

        // Check preferences table and seed if needed
        for (const user of users.rows) {
            const existingPref = await pool.query('SELECT * FROM preferences WHERE user_id = $1', [user.user_id]);
            if (existingPref.rows.length === 0) {
                // Check if preferences table exists first
                try {
                    await pool.query(
                        `INSERT INTO preferences (user_id, location, min_price, max_price)
             VALUES ($1, $2, $3, $4)`,
                        [user.user_id, 'Mumbai', 0, 100000]
                    );
                    console.log(`Created preferences for: ${user.email}`);
                } catch (e) {
                    if (e.code === '42P01') { // Table doesn't exist
                        console.log('preferences table does not exist, skipping');
                        break;
                    }
                }
            }
        }

        console.log('\n✅ Profile seeding complete');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

seedProfiles();
