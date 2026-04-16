/**
 * Seed Sample Data Script
 * 
 * Runs the seed_sample_data.sql migration to populate the database
 * with categories, subcategories, and sample posts.
 * 
 * Usage: node scripts/seed-sample-data.js
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

// Use individual env vars or DATABASE_URL
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "mhub",
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      }
);

async function runSeedScript() {
  const client = await pool.connect();
  
  try {
    console.log("🚀 Starting sample data seed...\n");
    
    // First run the subcategories migration if not already done
    const subcategoriesMigrationPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "add_subcategories.sql"
    );
    
    if (fs.existsSync(subcategoriesMigrationPath)) {
      console.log("📦 Running subcategories migration...");
      const subcategoriesSql = fs.readFileSync(subcategoriesMigrationPath, "utf8");
      await client.query(subcategoriesSql);
      console.log("✅ Subcategories migration complete\n");
    }
    
    // Run the sample data seed
    const seedPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "seed_sample_data.sql"
    );
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedPath}`);
    }
    
    console.log("🌱 Running sample data seed...");
    const seedSql = fs.readFileSync(seedPath, "utf8");
    await client.query(seedSql);
    console.log("✅ Sample data seed complete\n");
    
    // Print summary
    const categoryCount = await client.query("SELECT COUNT(*) FROM categories");
    const subcategoryCount = await client.query(
      "SELECT COUNT(*) FROM subcategories WHERE is_active = TRUE"
    );
    const postCount = await client.query(
      "SELECT COUNT(*) FROM posts WHERE status = 'active'"
    );
    const userCount = await client.query("SELECT COUNT(*) FROM users");
    
    console.log("📊 Database Summary:");
    console.log(`   Categories: ${categoryCount.rows[0].count}`);
    console.log(`   Subcategories: ${subcategoryCount.rows[0].count}`);
    console.log(`   Active Posts: ${postCount.rows[0].count}`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log("\n🎉 Seed complete! The marketplace is ready.\n");
    
    // Show sample posts per category
    const postsByCategory = await client.query(`
      SELECT c.name, COUNT(p.post_id) as post_count
      FROM categories c
      LEFT JOIN posts p ON c.category_id = p.category_id AND p.status = 'active'
      GROUP BY c.category_id, c.name
      ORDER BY post_count DESC
    `);
    
    console.log("📝 Posts by Category:");
    postsByCategory.rows.forEach((row) => {
      console.log(`   ${row.name}: ${row.post_count} posts`);
    });
    
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeedScript().catch((err) => {
  console.error(err);
  process.exit(1);
});
