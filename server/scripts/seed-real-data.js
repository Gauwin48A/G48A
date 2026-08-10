/**
 * seed-real-data.js
 * ----------------------------------------------------------------------------
 * Seeds the LOCAL dev database with REAL, schema-compatible content:
 *   • categories  (with slug — current schema requires it)
 *   • subcategories (matching the client's ForYou preference list)
 *   • users        (a few realistic sellers; demo@mhub.app / phone 9876543210
 *                   works with password "Test@12345" via the auth bypass)
 *   • posts        (realistic listings, category_id / subcategory_id = UUIDs,
 *                   so the API join returns real category/subcategory names)
 *
 * Also deletes leftover e2e/test posts so they stop polluting AllPosts/Feed.
 *
 * Usage: node scripts/seed-real-data.js
 * ----------------------------------------------------------------------------
 */
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://mhub:password@localhost:5432/mhub" });

const CATEGORIES = [
  ["Electronics", "electronics", "Gadgets, phones, and peripherals", "📱"],
  ["Fashion", "fashion", "Clothes, shoes, and accessories", "👕"],
  ["Vehicles", "vehicles", "Cars, bikes, and scooters", "🚗"],
  ["Others", "others", "Home, services, jobs & more", "📦"],
  ["Properties", "properties", "Rentals, plots, and houses", "🏠"],
  ["Furniture", "furniture", "Sofas, beds, and tables", "🪑"],
  ["Books", "books", "Textbooks, novels, and comics", "📚"],
  ["Services", "services", "Repairs, cleaning, and movers", "🛠️"],
  ["Jobs", "jobs", "Part-time and full-time roles", "💼"],
  ["Pets", "pets", "Adoption and pet supplies", "🐶"],
];

// (subcategory name, parent category name, emoji)
const SUBCATEGORIES = [
  // Electronics
  ["Phones", "Electronics", "📱"], ["Laptops", "Electronics", "💻"], ["Tablets", "Electronics", "📟"],
  ["Cameras", "Electronics", "📷"], ["Gaming", "Electronics", "🎮"], ["Accessories", "Electronics", "🔌"],
  ["Audio", "Electronics", "🎧"], ["Televisions", "Electronics", "📺"],
  // Fashion
  ["Men's Clothing", "Fashion", "👔"], ["Women's Clothing", "Fashion", "👗"], ["Shoes", "Fashion", "👟"],
  ["Bags", "Fashion", "👜"], ["Watches", "Fashion", "⌚"], ["Jewellery", "Fashion", "💍"],
  // Vehicles
  ["Cars", "Vehicles", "🚙"], ["Motorcycles", "Vehicles", "🏍️"], ["Scooters", "Vehicles", "🛵"],
  ["Bicycles", "Vehicles", "🚲"], ["Spare Parts", "Vehicles", "🔧"],
  // Others
  ["Home & Furniture", "Others", "🛋️"], ["Sports & Fitness", "Others", "🏋️"],
  ["Books & Education", "Others", "📚"], ["Health & Beauty", "Others", "💄"],
  ["Agriculture", "Others", "🌾"], ["Real Estate", "Others", "🏘️"],
  // Furniture
  ["Sofas", "Furniture", "🛋️"], ["Beds", "Furniture", "🛏️"], ["Tables", "Furniture", "🪑"],
  ["Office Furniture", "Furniture", "💺"],
  // Properties
  ["Residential Rent", "Properties", "🏠"], ["Commercial", "Properties", "🏢"], ["Plots", "Properties", "🗺️"],
  // Books
  ["Textbooks", "Books", "📖"], ["Novels", "Books", "📕"], ["Competitive Exams", "Books", "📗"],
  // Services
  ["Repairs", "Services", "🔧"], ["Cleaning", "Services", "🧹"], ["Moving & Packing", "Services", "📦"],
  // Jobs
  ["Full-time", "Jobs", "💼"], ["Part-time", "Jobs", "⏰"], ["Freelance", "Jobs", "🧑‍💻"],
  // Pets
  ["Dogs", "Pets", "🐕"], ["Cats", "Pets", "🐈"], ["Pet Supplies", "Pets", "🦴"],
];

// (email, full_name, phone, username, bio)
const USERS = [
  ["demo@mhub.app", "Arjun Reddy", "9876543210", "arjun_tech", "Tech enthusiast. I upgrade my gadgets every year."],
  ["priya.cars@yahoo.com", "Priya Motors", "9876543211", "priya_motors", "Verified used car dealer. All cars are inspected."],
  ["sneha.interiors@design.com", "Sneha Designs", "9876543212", "sneha_designs", "Interior designer selling pre-loved furniture."],
  ["rahul.student@college.edu", "Rahul S.", "9876543213", "rahul_books", "Student at IIIT. Selling books and dorm stuff."],
  ["vikram.estates@realestate.in", "Vikram Estates", "9876543214", "vikram_estates", "Premium property listings with no brokerage."],
  ["karthik.gamer@gmail.com", "Karthik G.", "9876543215", "karthik_gamer", "Hardcore gamer. Selling stuff to buy PS6."],
];

// (title, categoryName, subcategoryName, price, description, location, lat, lng, image, tier)
const POSTS = [
  ["iPhone 14 Pro - Deep Purple - 128GB", "Electronics", "Phones", 78500,
    "Selling my 1 year old iPhone 14 Pro. Battery health 92%. Always used with case and screen guard. Comes with original box and cable.", "Banjara Hills, Hyderabad", 17.4126, 78.4399,
    "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=600", 3],
  ["PS5 Disc Edition + God of War Ragnarok", "Electronics", "Gaming", 42000,
    "PlayStation 5 Disc version, 6 months old, pristine condition. Includes God of War Ragnarok disc free.", "Kondapur, Hyderabad", 17.4611, 78.3690,
    "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=600", 1],
  ["Nothing Phone (2) - White - 12/256", "Electronics", "Phones", 32000,
    "Used for 2 months as secondary phone. Looks brand new. Bill and box available, warranty valid.", "Jubilee Hills, Hyderabad", 17.4290, 78.4110,
    "https://images.unsplash.com/photo-1691238326262-43666d483868?auto=format&fit=crop&w=500", 3],
  ["MacBook Air M2 - 8/256 Midnight", "Electronics", "Laptops", 65000,
    "MacBook Air M2, 3 months old, 8/256. Battery cycle count 14. Selling to switch to a Windows work setup.", "Madhapur, Hyderabad", 17.4483, 78.3915,
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600", 3],
  ["Sony WH-1000XM5 Headphones", "Electronics", "Audio", 18500,
    "Flagship noise cancelling headphones. 6 months old, like new. Comes with all ear tips and case.", "Gachibowli, Hyderabad", 17.4401, 78.3489,
    "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=600", 2],
  ["Hyundai Creta SX 2021 - 42k km", "Vehicles", "Cars", 1120000,
    "Single owner, Hyderabad registered. Odometer 42,000 km. Insurance valid, tires 80% life. Showroom condition.", "Madhapur, Hyderabad", 17.4483, 78.3915,
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600", 3],
  ["Royal Enfield Classic 350 - 2022", "Vehicles", "Motorcycles", 155000,
    "Classic 350, 2022 model, 8000 km. Single owner, always serviced at RE showroom. All papers clear.", "Kukatpally, Hyderabad", 17.4948, 78.4014,
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600", 2],
  ["Activa 6G 2023 - 4000 km", "Vehicles", "Scooters", 75000,
    "Honda Activa 6G, 2023, mint condition. 4000 km only. Selling as moving out of city.", "Manikonda, Hyderabad", 17.3926, 78.3802,
    "https://images.unsplash.com/photo-1558980664-10e7170f3b0e?auto=format&fit=crop&w=600", 1],
  ["Teak Wood Dining Table (6 Seater)", "Furniture", "Tables", 18000,
    "Solid teak wood 6-seater dining table with 6 chairs. 2 years old, excellent condition.", "Manikonda, Hyderabad", 17.3926, 78.3802,
    "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600", 2],
  ["Study Table and Office Chair Combo", "Furniture", "Office Furniture", 6500,
    "Engineered wood table (Amazon Solimo) and revolving mesh chair. Great for WFH. Table has minor water marks.", "Gachibowli, Hyderabad", 17.4401, 78.3489,
    "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=600", 1],
  ["Nike Air Jordan 1 High - Size 9", "Fashion", "Shoes", 9500,
    "Genuine Air Jordan 1 High, size 9 US. Worn 3 times, box included.", "Banjara Hills, Hyderabad", 17.4126, 78.4399,
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600", 2],
  ["Levi's Denim Jacket - Men's M", "Fashion", "Men's Clothing", 1800,
    "Classic Levi's denim jacket, size M. Worn a handful of times, great condition.", "Kondapur, Hyderabad", 17.4611, 78.3690,
    "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=600", 1],
  ["Titan Raga Watch - Women's", "Fashion", "Watches", 4500,
    "Titan Raga, rose gold dial, women's. Box and papers available. Selling as I received a new one as a gift.", "Jubilee Hills, Hyderabad", 17.4290, 78.4110,
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600", 1],
  ["CAT Exam Preparation Books (Arun Sharma)", "Books", "Competitive Exams", 1500,
    "Complete set of Arun Sharma Quantitative Aptitude, Verbal, Data Interpretation. 2024 edition.", "Gachibowli, Hyderabad", 17.4401, 78.3489,
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600", 1],
  ["Harry Potter Complete Box Set", "Books", "Novels", 2200,
    "All 7 books in pristine condition. Paperback box set.", "Kukatpally, Hyderabad", 17.4948, 78.4014,
    "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?auto=format&fit=crop&w=600", 1],
  ["3BHK Furnished Apartment - Financial District", "Properties", "Residential Rent", 35000,
    "1800 sft, West Facing, 15th Floor. Modular kitchen, ACs in all bedrooms, 2 car parkings. Rent includes maintenance.", "Financial District, Hyderabad", 17.4239, 78.3436,
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600", 3],
  ["2BHK Semi-furnished - Hitech City", "Properties", "Residential Rent", 25000,
    "2BHK semi-furnished near Hitech City metro. Gated community with pool and gym.", "Hitech City, Hyderabad", 17.4486, 78.3797,
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600", 2],
  ["Dumbbell Set 20kg with Stand", "Others", "Sports & Fitness", 3000,
    "Rubber-coated dumbbell set with stand. Bought during lockdown, barely used.", "Madhapur, Hyderabad", 17.4483, 78.3915,
    "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&w=600", 1],
  ["Golden Retriever Puppy - 2 months", "Pets", "Dogs", 12000,
    "Healthy golden retriever puppy, 2 months old, vaccinated. Looking for a loving home.", "Banjara Hills, Hyderabad", 17.4126, 78.4399,
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600", 2],
];

async function q(text, params) {
  return pool.query(text, params);
}

async function upsertCategory(name, slug, description, icon) {
  const r = await q(
    `INSERT INTO categories (name, slug, description, icon_url, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon_url = EXCLUDED.icon_url
     RETURNING category_id::text AS id`,
    [name, slug, description, icon]
  );
  return r.rows[0].id;
}

async function upsertSubcategory(name, categoryId, icon) {
  await q(
    `INSERT INTO subcategories (category_id, name, slug, icon_url, is_active, display_order)
     VALUES ($1, $2, $3, $4, TRUE, 0)
     ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name, icon_url = EXCLUDED.icon_url`,
    [categoryId, name, name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), icon]
  );
}

async function upsertUser(email, fullName, phone, username, bio) {
  const existing = await q(`SELECT user_id FROM users WHERE email = $1`, [email]);
  if (existing.rows.length) return existing.rows[0].user_id;
  const r = await q(
    `INSERT INTO users (email, username, full_name, name, phone_number, phone, password_hash, two_fa_enabled, is_active, kyc_status)
     VALUES ($1, $2, $3, $3, $4, $4, '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', FALSE, TRUE, 'VERIFIED')
     RETURNING user_id`,
    [email, username, fullName, phone]
  );
  const uid = r.rows[0].user_id;
  await q(
    `INSERT INTO profiles (user_id, full_name, phone, bio, verified)
     VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (user_id) DO NOTHING`,
    [uid, fullName, phone, bio]
  );
  return uid;
}

async function insertPost(p, sellerEmail) {
  const [title, catName, subName, price, desc, location, lat, lng, image, tier] = p;
  const seller = await q(`SELECT user_id FROM users WHERE email = $1`, [sellerEmail]);
  if (!seller.rows.length) {
    console.log("  ⚠ skip (no seller):", title);
    return;
  }
  const cat = await q(`SELECT category_id FROM categories WHERE name = $1`, [catName]);
  if (!cat.rows.length) {
    console.log("  ⚠ skip (no category):", title);
    return;
  }
  const sub = await q(`SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2`, [subName, cat.rows[0].category_id]);
  if (!sub.rows.length) {
    console.log("  ⚠ skip (no subcategory):", title);
    return;
  }
  await q(
    `INSERT INTO posts (user_id, category_id, subcategory_id, title, description, price, location, latitude, longitude, images, status, post_type, tier_priority, is_negotiable, is_flash_sale, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'active', 'product', $11, TRUE, FALSE, NOW() - INTERVAL '1 hour' * $12, NOW() + INTERVAL '30 days')
     ON CONFLICT DO NOTHING`,
    [seller.rows[0].user_id, cat.rows[0].category_id, sub.rows[0].subcategory_id, title, desc, price, location, lat, lng,
      JSON.stringify([image]), tier, Math.floor(Math.random() * 48) + 1]
  );
}

/** Deterministically assign a seller to each post so content is spread across users. */
function sellerForPost(index) {
  const perUser = [0, 0, 1, 0, 3, 4, 1, 1, 2, 2, 3, 3, 0, 4, 4, 5, 5, 0, 2];
  const idx = perUser[index % perUser.length] ?? 0;
  return USERS[idx][0];
}

async function deleteE2EPosts() {
  const del = await q(
    `DELETE FROM posts
     WHERE post_id::text IN ('999101','999102','999103','999104','999105')
        OR title ILIKE 'Test Product%'
        OR user_id::text IN (SELECT user_id::text FROM users WHERE username ILIKE 'e2e_%' OR email ILIKE '%e2e.com')`
  );
  console.log(`  🧹 Removed ${del.rowCount} e2e/test post(s)`);
}

async function main() {
  console.log("🌱 Seeding real data...\n");

  console.log("── Categories ──");
  const catIds = {};
  for (const [name, slug, desc, icon] of CATEGORIES) {
    catIds[name] = await upsertCategory(name, slug, desc, icon);
  }
  console.log(`  ✅ ${CATEGORIES.length} categories`);

  console.log("── Subcategories ──");
  for (const [name, catName, icon] of SUBCATEGORIES) {
    await upsertSubcategory(name, catIds[catName], icon);
  }
  console.log(`  ✅ ${SUBCATEGORIES.length} subcategories`);

  console.log("── Users ──");
  for (const u of USERS) await upsertUser(u[0], u[1], u[2], u[3], u[4]);
  console.log(`  ✅ ${USERS.length} users (demo@mhub.app / 9876543210 / password Test@12345)`);

  console.log("── Posts ──");
  for (let i = 0; i < POSTS.length; i++) {
    await insertPost(POSTS[i], sellerForPost(i));
  }
  console.log(`  ✅ ${POSTS.length} listings`);

  console.log("── Cleanup ──");
  await deleteE2EPosts();

  console.log("\n✅ Seed complete.");
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
