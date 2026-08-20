/**
 * Seed: All 4 categories, subcategories, and test posts per subcategory.
 * Usage: node scripts/seed-test-posts.js
 */
const { runQuery } = require('../src/utils/dbHelpers');

const SELLER = 'fe2570f5-f37e-4313-8974-ff2318a94377'; // Demo User

// ── Categories ──────────────────────────────────────────────────────
const CATS = [
  { id: '00000000-0000-0000-0000-000000000101', name: 'Electronics', group: 'electronics' },
  { id: '00000000-0000-0000-0000-000000000102', name: 'Fashion', group: 'fashion' },
  { id: '00000000-0000-0000-0000-000000000103', name: 'Vehicles', group: 'vehicles' },
  { id: '00000000-0000-0000-0000-000000000104', name: 'Others', group: 'others' },
];

// ── Subcategories ───────────────────────────────────────────────────
const SUBS = [
  // Electronics
  { id: '00000000-0000-0000-0000-000000000201', name: 'Phones', cat: '00000000-0000-0000-0000-000000000101', slug: 'phones' },
  { id: '00000000-0000-0000-0000-000000000202', name: 'Laptops', cat: '00000000-0000-0000-0000-000000000101', slug: 'laptops' },
  { id: '00000000-0000-0000-0000-000000000203', name: 'Tablets', cat: '00000000-0000-0000-0000-000000000101', slug: 'tablets' },
  { id: '00000000-0000-0000-0000-000000000204', name: 'Cameras', cat: '00000000-0000-0000-0000-000000000101', slug: 'cameras' },
  { id: '00000000-0000-0000-0000-000000000205', name: 'Gaming', cat: '00000000-0000-0000-0000-000000000101', slug: 'gaming' },
  // Fashion
  { id: '00000000-0000-0000-0000-000000000301', name: "Men's Clothing", cat: '00000000-0000-0000-0000-000000000102', slug: 'mens-clothing' },
  { id: '00000000-0000-0000-0000-000000000302', name: "Women's Clothing", cat: '00000000-0000-0000-0000-000000000102', slug: 'womens-clothing' },
  { id: '00000000-0000-0000-0000-000000000303', name: 'Shoes', cat: '00000000-0000-0000-0000-000000000102', slug: 'shoes' },
  { id: '00000000-0000-0000-0000-000000000304', name: 'Bags', cat: '00000000-0000-0000-0000-000000000102', slug: 'bags' },
  { id: '00000000-0000-0000-0000-000000000305', name: 'Watches', cat: '00000000-0000-0000-0000-000000000102', slug: 'watches' },
  // Vehicles
  { id: '00000000-0000-0000-0000-000000000401', name: 'Cars', cat: '00000000-0000-0000-0000-000000000103', slug: 'cars' },
  { id: '00000000-0000-0000-0000-000000000402', name: 'Motorcycles', cat: '00000000-0000-0000-0000-000000000103', slug: 'motorcycles' },
  { id: '00000000-0000-0000-0000-000000000403', name: 'Scooters', cat: '00000000-0000-0000-0000-000000000103', slug: 'scooters' },
  { id: '00000000-0000-0000-0000-000000000404', name: 'Bicycles', cat: '00000000-0000-0000-0000-000000000103', slug: 'bicycles' },
  { id: '00000000-0000-0000-0000-000000000405', name: 'Spare Parts', cat: '00000000-0000-0000-0000-000000000103', slug: 'spare-parts' },
  // Others
  { id: '00000000-0000-0000-0000-000000000501', name: 'Home & Furniture', cat: '00000000-0000-0000-0000-000000000104', slug: 'home-furniture' },
  { id: '00000000-0000-0000-0000-000000000502', name: 'Sports & Fitness', cat: '00000000-0000-0000-0000-000000000104', slug: 'sports-fitness' },
  { id: '00000000-0000-0000-0000-000000000503', name: 'Books & Education', cat: '00000000-0000-0000-0000-000000000104', slug: 'books-education' },
];

// ── Test Posts per subcategory ───────────────────────────────────────
const POSTS = [
  // ── ELECTRONICS ──
  { sub: '00000000-0000-0000-0000-000000000201', title: 'Samsung Galaxy S24 Ultra 512GB', desc: 'Flagship Samsung phone in mint condition. Used for 3 months. Comes with original box, charger, and warranty card. No scratches or dents.', price: 89999, brand: 'Samsung', model: 'Galaxy S24 Ultra', location: 'Hyderabad', condition: 'Like New', images: 'https://picsum.photos/seed/s24/400/400' },
  { sub: '00000000-0000-0000-0000-000000000201', title: 'iPhone 15 Pro Max 256GB Natural Titanium', desc: 'Apple iPhone 15 Pro Max with AppleCare+ until 2026. Battery health 98%. Perfect for buyers who want premium build quality.', price: 115000, brand: 'Apple', model: 'iPhone 15 Pro Max', location: 'Mumbai', condition: 'Excellent', images: 'https://picsum.photos/seed/ip15/400/400' },
  { sub: '00000000-0000-0000-0000-000000000201', title: 'OnePlus 12 16GB/256GB', desc: 'OnePlus 12 with Snapdragon 8 Gen 3. Super fast charging, AMOLED display. Minor wear on edges. Battery backup is excellent.', price: 52999, brand: 'OnePlus', model: 'OnePlus 12', location: 'Bangalore', condition: 'Good', images: 'https://picsum.photos/seed/op12/400/400' },
  { sub: '00000000-0000-0000-0000-000000000201', title: 'Google Pixel 8 Pro 128GB', desc: 'Pure Android experience with the best camera in the market. AI features are incredible. Used for 6 months.', price: 64999, brand: 'Google', model: 'Pixel 8 Pro', location: 'Delhi', condition: 'Like New', images: 'https://picsum.photos/seed/pixel8/400/400' },

  { sub: '00000000-0000-0000-0000-000000000202', title: 'MacBook Air M3 15-inch 16GB/512GB', desc: 'Apple MacBook Air M3 in Space Grey. Perfect for students and professionals. 18-hour battery life. AppleCare valid.', price: 142000, brand: 'Apple', model: 'MacBook Air M3', location: 'Chennai', condition: 'Excellent', images: 'https://picsum.photos/seed/mba/400/400' },
  { sub: '00000000-0000-0000-0000-000000000202', title: 'Dell XPS 15 i7 13th Gen 16GB/1TB', desc: 'Dell XPS 15 OLED touchscreen. Stunning display, perfect for creative professionals. Comes with original charger.', price: 98000, brand: 'Dell', model: 'XPS 15', location: 'Pune', condition: 'Good', images: 'https://picsum.photos/seed/dell/400/400' },
  { sub: '00000000-0000-0000-0000-000000000202', title: 'Lenovo Legion 5 Pro RTX 4060', desc: 'Gaming laptop with RTX 4060, Ryzen 7, 16GB RAM, 1TB SSD. 165Hz QHD display. Used for 8 months.', price: 89000, brand: 'Lenovo', model: 'Legion 5 Pro', location: 'Hyderabad', condition: 'Good', images: 'https://picsum.photos/seed/legion/400/400' },

  { sub: '00000000-0000-0000-0000-000000000203', title: 'iPad Pro M4 11-inch 256GB WiFi', desc: 'Latest iPad Pro with M4 chip. Ultra-thin design, Tandem OLED display. Perfect for drawing and note-taking.', price: 99900, brand: 'Apple', model: 'iPad Pro M4', location: 'Mumbai', condition: 'New', images: 'https://picsum.photos/seed/ipadp/400/400' },
  { sub: '00000000-0000-0000-0000-000000000203', title: 'Samsung Galaxy Tab S9 FE', desc: 'Samsung Galaxy Tab S9 FE with S Pen. Great for media consumption and light productivity. 128GB storage.', price: 32999, brand: 'Samsung', model: 'Galaxy Tab S9 FE', location: 'Delhi', condition: 'Like New', images: 'https://picsum.photos/seed/tabs9/400/400' },

  { sub: '00000000-0000-0000-0000-000000000204', title: 'Sony Alpha A7 IV Mirrorless Camera', desc: 'Professional mirrorless camera with 33MP full-frame sensor. 4K 60fps video. Includes 28-70mm kit lens.', price: 185000, brand: 'Sony', model: 'Alpha A7 IV', location: 'Bangalore', condition: 'Excellent', images: 'https://picsum.photos/seed/sonya7/400/400' },
  { sub: '00000000-0000-0000-0000-000000000204', title: 'Canon EOS R6 Mark II Body', desc: 'Canon R6 II with 24.2MP sensor, 40fps burst, 4K 60p. Used for wedding photography. Includes 2 extra batteries.', price: 165000, brand: 'Canon', model: 'EOS R6 II', location: 'Chennai', condition: 'Good', images: 'https://picsum.photos/seed/canonr6/400/400' },

  { sub: '00000000-0000-0000-0000-000000000205', title: 'PlayStation 5 Slim Digital Edition', desc: 'Sony PS5 Slim Digital Edition with 1TB SSD. Includes DualSense controller. PS Plus subscription not included.', price: 42000, brand: 'Sony', model: 'PS5 Slim', location: 'Hyderabad', condition: 'Like New', images: 'https://picsum.photos/seed/ps5/400/400' },
  { sub: '00000000-0000-0000-0000-000000000205', title: 'Nintendo Switch OLED Mario Edition', desc: 'Nintendo Switch OLED with Mario Red Joy-Cons. Includes dock, charger, and carrying case. Games sold separately.', price: 28000, brand: 'Nintendo', model: 'Switch OLED', location: 'Mumbai', condition: 'Excellent', images: 'https://picsum.photos/seed/switch/400/400' },
  { sub: '00000000-0000-0000-0000-000000000205', title: 'Razer BlackWidow V4 Pro Keyboard', desc: 'Mechanical gaming keyboard with Razer Green switches. RGB Chroma lighting. USB passthrough. Includes wrist rest.', price: 18999, brand: 'Razer', model: 'BlackWidow V4 Pro', location: 'Delhi', condition: 'New', images: 'https://picsum.photos/seed/razer/400/400' },

  // ── FASHION ──
  { sub: '00000000-0000-0000-0000-000000000301', title: 'Levi\'s 511 Slim Fit Jeans Blue', desc: 'Classic Levi\'s 511 slim fit jeans in dark wash. Size 32x32. Worn 3 times. No fading or wear.', price: 2499, brand: 'Levi\'s', model: '511 Slim', location: 'Delhi', condition: 'Like New', images: 'https://picsum.photos/seed/levis/400/400' },
  { sub: '00000000-0000-0000-0000-000000000301', title: 'Allen Solly Formal Shirt Pack of 3', desc: 'Three formal shirts from Allen Solly — white, light blue, and pink. Size L. Premium cotton. Perfect for office.', price: 3999, brand: 'Allen Solly', model: 'Formal Shirt', location: 'Mumbai', condition: 'New', images: 'https://picsum.photos/seed/allensolly/400/400' },
  { sub: '00000000-0000-0000-0000-000000000301', title: 'Peter England Blazer Navy Blue', desc: 'Slim-fit navy blazer from Peter England. Size 42R. Ideal for interviews and formal events. Linen blend fabric.', price: 4999, brand: 'Peter England', model: 'Slim Blazer', location: 'Chennai', condition: 'New', images: 'https://picsum.photos/seed/blazer/400/400' },

  { sub: '00000000-0000-0000-0000-000000000302', title: 'Zara Floral Midi Dress', desc: 'Beautiful floral print midi dress from Zara. Size M. Perfect for summer outings. No stains or damage.', price: 3499, brand: 'Zara', model: 'Floral Midi', location: 'Mumbai', condition: 'Like New', images: 'https://picsum.photos/seed/zara/400/400' },
  { sub: '00000000-0000-0000-0000-000000000302', title: 'H&M Denim Jacket Oversized', desc: 'Oversized denim jacket from H&M. Size S. Light wash. Great layering piece for fall/winter.', price: 2799, brand: 'H&M', model: 'Denim Jacket', location: 'Bangalore', condition: 'New', images: 'https://picsum.photos/seed/hm/400/400' },

  { sub: '00000000-0000-0000-0000-000000000303', title: 'Nike Air Max 270 React', desc: 'Nike Air Max 270 React in black/white. Size 10 UK. Used for casual walks. Sole has plenty of grip left.', price: 8999, brand: 'Nike', model: 'Air Max 270', location: 'Hyderabad', condition: 'Good', images: 'https://picsum.photos/seed/nike270/400/400' },
  { sub: '00000000-0000-0000-0000-000000000303', title: 'Adidas Ultraboost 23 Running Shoes', desc: 'Adidas Ultraboost 23 in cloud white. Size 9 UK. Excellent for running and daily wear. Boost cushioning is still responsive.', price: 12999, brand: 'Adidas', model: 'Ultraboost 23', location: 'Delhi', condition: 'Excellent', images: 'https://picsum.photos/seed/ub23/400/400' },

  { sub: '00000000-0000-0000-0000-000000000304', title: 'Fastrack Voyager Backpack', desc: 'Fastrack 30L laptop backpack with USB charging port. Water-resistant. Multiple compartments. Perfect for college.', price: 1799, brand: 'Fastrack', model: 'Voyager', location: 'Pune', condition: 'New', images: 'https://picsum.photos/seed/bp1/400/400' },
  { sub: '00000000-0000-0000-0000-000000000304', title: 'Wildcraft Laptop Messenger Bag', desc: 'Premium messenger bag from Wildcraft. Fits 15.6" laptop. Genuine leather accents. Brown color.', price: 3499, brand: 'Wildcraft', model: 'Messenger', location: 'Chennai', condition: 'Like New', images: 'https://picsum.photos/seed/wild/400/400' },

  { sub: '00000000-0000-0000-0000-000000000305', title: 'Casio G-Shock GA-2100', desc: 'Casio G-Shock GA-2100 "CasiOak" in matte black. Japanese quartz movement. 200m water resistance. Scratch-free.', price: 8499, brand: 'Casio', model: 'GA-2100', location: 'Mumbai', condition: 'Excellent', images: 'https://picsum.photos/seed/gshock/400/400' },
  { sub: '00000000-0000-0000-0000-000000000305', title: 'Fossil Gen 6 Smartwatch', desc: 'Fossil Gen 6 touchscreen smartwatch with heart rate, SpO2, GPS. WearOS. Comes with extra straps.', price: 11999, brand: 'Fossil', model: 'Gen 6', location: 'Hyderabad', condition: 'Good', images: 'https://picsum.photos/seed/fossil/400/400' },

  // ── VEHICLES ──
  { sub: '00000000-0000-0000-0000-000000000401', title: 'Maruti Suzuki Swift VXi 2022', desc: 'Maruti Swift VXi in pearl white. 18,000 km driven. Single owner. Insurance valid until Dec 2026. Well-maintained.', price: 650000, brand: 'Maruti Suzuki', model: 'Swift VXi', location: 'Delhi', condition: 'Good', images: 'https://picsum.photos/seed/swift/400/400' },
  { sub: '00000000-0000-0000-0000-000000000401', title: 'Hyundai Creta SX(O) 2023', desc: 'Hyundai Creta top variant with sunroof, ventilated seats, ADAS. 12,000 km. Pearl white. All service records available.', price: 1450000, brand: 'Hyundai', model: 'Creta SX(O)', location: 'Hyderabad', condition: 'Excellent', images: 'https://picsum.photos/seed/creta/400/400' },

  { sub: '00000000-0000-0000-0000-000000000402', title: 'Royal Enfield Classic 350 2023', desc: 'Royal Enfield Classic 350 in Halcyon Green. 5,000 km. First owner. Includes touring seat and exhaust.', price: 165000, brand: 'Royal Enfield', model: 'Classic 350', location: 'Chennai', condition: 'Excellent', images: 'https://picsum.photos/seed/re350/400/400' },
  { sub: '00000000-0000-0000-0000-000000000402', title: 'KTM Duke 390 2024', desc: 'Brand new KTM Duke 390 with ride-by-wire, TFT display. Only 500 km. Still under full warranty.', price: 320000, brand: 'KTM', model: 'Duke 390', location: 'Pune', condition: 'Like New', images: 'https://picsum.photos/seed/ktm390/400/400' },

  { sub: '00000000-0000-0000-0000-000000000403', title: 'Honda Activa 6G 2023', desc: 'Honda Activa 6G in pearl white. 3,000 km. First owner. Excellent for daily commute. All papers up to date.', price: 72000, brand: 'Honda', model: 'Activa 6G', location: 'Mumbai', condition: 'Good', images: 'https://picsum.photos/seed/activa/400/400' },

  { sub: '00000000-0000-0000-0000-000000000404', title: 'Firefox Rapide 27.5 Mountain Bike', desc: 'Firefox Rapide 27.5" alloy frame mountain bike with 21-speed Shimano gears. Disc brakes. Suitable for trails.', price: 22000, brand: 'Firefox', model: 'Rapide 27.5', location: 'Bangalore', condition: 'Good', images: 'https://picsum.photos/seed/ffbike/400/400' },

  { sub: '00000000-0000-0000-0000-000000000405', title: 'Bosch Spark Plug Set (4 pcs)', desc: 'Genuine Bosch spark plugs for petrol cars. Compatible with most hatchbacks and sedans. Iridium tip.', price: 1200, brand: 'Bosch', model: 'Spark Plug Set', location: 'Delhi', condition: 'New', images: 'https://picsum.photos/seed/bosch/400/400' },
  { sub: '00000000-0000-0000-0000-000000000405', title: 'Mobil 1 Synthetic Engine Oil 5W-30 (4L)', desc: 'Mobil 1 fully synthetic engine oil. 4 litre bottle. Excellent for high-performance engines. Sealed and new.', price: 3800, brand: 'Mobil', model: 'Mobil 1 5W-30', location: 'Chennai', condition: 'New', images: 'https://picsum.photos/seed/mobil/400/400' },

  // ── OTHERS ──
  { sub: '00000000-0000-0000-0000-000000000501', title: 'IKEA KALLAX Shelf Unit 4x4 White', desc: 'IKEA KALLAX 4x4 shelf unit in white. Great for books, records, or storage bins. Some minor scratches on bottom.', price: 8999, brand: 'IKEA', model: 'KALLAX 4x4', location: 'Hyderabad', condition: 'Good', images: 'https://picsum.photos/seed/ikea/400/400' },
  { sub: '00000000-0000-0000-0000-000000000501', title: 'Wakefit Orthopaedic Memory Foam Mattress Queen', desc: 'Wakefit 6-inch queen-size memory foam mattress. Medium firm. Includes zip cover. Used for 6 months.', price: 12999, brand: 'Wakefit', model: 'Ortho Mattress', location: 'Bangalore', condition: 'Good', images: 'https://picsum.photos/seed/mattress/400/400' },

  { sub: '00000000-0000-0000-0000-000000000502', title: 'Cosco Cricket Bat Kashmir Willow', desc: 'Cosco cricket bat made of Kashmir willow. Size SH. Comes with grip and cover. Great for beginners and net practice.', price: 1800, brand: 'Cosco', model: 'Cricket Bat', location: 'Mumbai', condition: 'New', images: 'https://picsum.photos/seed/cricket/400/400' },
  { sub: '00000000-0000-0000-0000-000000000502', title: 'Yoga Mat Extra Thick 8mm TPE', desc: 'Premium TPE yoga mat, 8mm thick, non-slip both sides. 183x61cm. Includes carrying strap. Light purple color.', price: 1299, brand: 'Generic', model: 'Yoga Mat 8mm', location: 'Delhi', condition: 'New', images: 'https://picsum.photos/seed/yoga/400/400' },

  { sub: '00000000-0000-0000-0000-000000000503', title: 'NCERT Class 12 Physics Textbook Set', desc: 'Complete NCERT Class 12 Physics textbook set with exemplar problems. All chapters highlighted with notes. Good for JEE/NEET prep.', price: 600, brand: 'NCERT', model: 'Class 12 Physics', location: 'Pune', condition: 'Good', images: 'https://picsum.photos/seed/ncert/400/400' },
  { sub: '00000000-0000-0000-0000-000000000503', title: 'Atomic Habits by James Clear (Paperback)', desc: 'Bestselling self-help book. Read once, pages are crisp. No highlighting or damage. Perfect for personal development.', price: 350, brand: 'James Clear', model: 'Atomic Habits', location: 'Chennai', condition: 'Excellent', images: 'https://picsum.photos/seed/atomic/400/400' },
];

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function main() {
  let created = 0;

  // 1. Upsert categories
  for (const cat of CATS) {
    await runQuery(
      `INSERT INTO categories (category_id, name, category_group, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, NOW(), NOW())
       ON CONFLICT (category_id) DO UPDATE SET name = EXCLUDED.name, category_group = EXCLUDED.category_group`,
      [cat.id, cat.name, cat.group, CATS.indexOf(cat)]
    );
  }
  console.log(`✅ ${CATS.length} categories upserted`);

  // 2. Upsert subcategories
  for (const sub of SUBS) {
    await runQuery(
      `INSERT INTO categories (category_id, name, parent_id, category_group, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
       ON CONFLICT (category_id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id`,
      [sub.id, sub.name, sub.cat, sub.slug, SUBS.indexOf(sub)]
    );
  }
  console.log(`✅ ${SUBS.length} subcategories upserted`);

  // 3. Create test posts
  const cities = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Kolkata'];
  for (const post of POSTS) {
    const postId = uuid();
    const city = cities[Math.floor(Math.random() * cities.length)];
    try {
      const imageArr = JSON.stringify([post.images]);
      await runQuery(
        `INSERT INTO posts (post_id, user_id, category_id, subcategory_id, title, description, price, location, city, status, \"condition\", brand, model, images, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13::jsonb, $14, NOW(), NOW())`,
        [postId, SELLER, CATS.find(c => SUBS.find(s => s.id === post.sub)?.cat === c.id)?.id, post.sub,
         post.title, post.desc, post.price, post.location || city, city,
         post.condition, post.brand, post.model, imageArr, post.images]
      );
      created++;
    } catch (e) {
      console.error(`  ❌ ${post.title}: ${e.message}`);
    }
  }
  console.log(`✅ ${created}/${POSTS.length} test posts created`);

  // 4. Summary
  const count = await runQuery('SELECT COUNT(*) as total FROM posts WHERE status = \'active\'');
  console.log(`\n📊 Total active posts in DB: ${count.rows[0].total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
