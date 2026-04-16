const pool = require("../../src/config/db");

async function seedProfiles() {
  try {
    const users = await pool.query("SELECT user_id, username, email FROM users");
    console.log(`Found ${users.rows.length} users`);

    for (const user of users.rows) {
      const existing = await pool.query(
        "SELECT * FROM profiles WHERE user_id = $1",
        [user.user_id],
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.user_id, user.username, "9876543210", "India", "MHub User", true],
        );
        console.log(`Created profile for: ${user.email}`);
      } else {
        console.log(`Profile exists for: ${user.email}`);
      }
    }

    for (const user of users.rows) {
      const existingPref = await pool.query(
        "SELECT * FROM preferences WHERE user_id = $1",
        [user.user_id],
      );

      if (existingPref.rows.length === 0) {
        try {
          await pool.query(
            `INSERT INTO preferences (user_id, location, min_price, max_price)
             VALUES ($1, $2, $3, $4)`,
            [user.user_id, "Mumbai", 0, 100000],
          );
          console.log(`Created preferences for: ${user.email}`);
        } catch (error) {
          if (error.code === "42P01") {
            console.log("preferences table does not exist, skipping");
            break;
          }
          throw error;
        }
      }
    }

    console.log("\nProfile seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("Profile seeding failed:", error.message);
    process.exit(1);
  }
}

seedProfiles();
