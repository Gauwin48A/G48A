/**
 * Seed MORE test posts — aim for 5+ per subcategory.
 * Run: node scripts/seed-more-posts.js
 */
const { runQuery } = require('../src/utils/dbHelpers');

const SELLER = 'fe2570f5-f37e-4313-8974-ff2318a94377';

const POSTS = [
  // ── ELECTRONICS (need more in Tablets, Cameras) ──
  { sub: '00000000-0000-0000-0000-000000000201', title: 'Xiaomi Redmi Note 13 Pro 5G', desc: 'Xiaomi Redmi Note 13 Pro with 200MP camera, 120Hz AMOLED. Great value for money. 6GB/128GB.', price: 19999, brand: 'Xiaomi', model: 'Redmi Note 13 Pro', location: 'Hyderabad', condition: 'New', images: 'https://picsum.photos/seed/redmi/400/400' },
  { sub: '00000000-0000-0000-0000-000000000201', title: 'Samsung Galaxy A55 5G 128GB', desc: 'Mid-range Samsung with IP67, 50MP triple camera, 5000mAh battery. Used for 2 months. No scratches.', price: 28999, brand: 'Samsung', model: 'Galaxy A55', location: 'Delhi', condition: 'Like New', images: 'https://picsum.photos/seed/a55/400/400' },
  { sub: '00000000-0000-0000-0000-000000000202', title: 'HP Pavilion 15 i5 12th Gen 8GB/512GB', desc: 'HP Pavilion 15 with 12th gen Intel i5, 8GB RAM, 512GB SSD. FHD display. Great for students.', price: 48999, brand: 'HP', model: 'Pavilion 15', location: 'Mumbai', condition: 'Good', images: 'https://picsum.photos/seed/hp/400/400' },
  { sub: '00000000-0000-0000-0000-000000000203', title: 'Samsung Galaxy Tab A9+ WiFi 64GB', desc: 'Budget-friendly Samsung tablet with 11" display. Great for kids and media consumption. Includes case.', price: 18999, brand: 'Samsung', model: 'Galaxy Tab A9+', location: 'Pune', condition: 'Like New', images: 'https://picsum.photos/seed/taba9/400/400' },
  { sub: '00000000-0000-0000-0000-000000000203', title: 'Xiaomi Pad 6 128GB WiFi', desc: 'Xiaomi Pad 6 with 144Hz display, Snapdragon 870. Includes keyboard cover and stylus. Excellent condition.', price: 24999, brand: 'Xiaomi', model: 'Pad 6', location: 'Bangalore', condition: 'Excellent', images: 'https://picsum.photos/seed/xipad/400/400' },
  { sub: '00000000-0000-0000-0000-000000000204', title: 'Nikon Z50 II Mirrorless with 16-50mm', desc: 'Nikon Z50 II crop-sensor mirrorless with kit lens. 20.9MP, 4K30, eye-detect AF. Lightly used.', price: 82000, brand: 'Nikon', model: 'Z50 II', location: 'Chennai', condition: 'Excellent', images: 'https://picsum.photos/seed/nikon/400/400' },
  { sub: '00000000-0000-0000-0000-000000000204', title: 'GoPro Hero 12 Black', desc: 'GoPro Hero 12 with HyperSmooth 6.0, 5.3K video. Includes extra battery and mount kit.', price: 38000, brand: 'GoPro', model: 'Hero 12 Black', location: 'Mumbai', condition: 'Like New', images: 'https://picsum.photos/seed/gopro/400/400' },
  { sub: '00000000-0000-0000-0000-000000000205', title: 'Xbox Series X 1TB Console', desc: 'Microsoft Xbox Series X with 1TB SSD. Includes wireless controller. 4K gaming. 6 months old.', price: 46000, brand: 'Microsoft', model: 'Xbox Series X', location: 'Delhi', condition: 'Excellent', images: 'https://picsum.photos/seed/xbox/400/400' },
  { sub: '00000000-0000-0000-0000-000000000205', title: 'SteelSeries Arctis Nova Pro Wireless', desc: 'Premium wireless gaming headset with multi-system connectivity. Hi-Res audio, retractable mic.', price: 24999, brand: 'SteelSeries', model: 'Arctis Nova Pro', location: 'Bangalore', condition: 'New', images: 'https://picsum.photos/seed/steel/400/400' },

  // ── FASHION (need more in Women\'s, Shoes, Bags, Watches) ──
  { sub: '00000000-0000-0000-0000-000000000301', title: 'Mufti Slim Fit Chinos Olive', desc: 'Mufti olive chinos, size 32. Comfortable stretch fabric. Perfect for casual and semi-formal wear.', price: 1799, brand: 'Mufti', model: 'Slim Chinos', location: 'Bangalore', condition: 'New', images: 'https://picsum.photos/seed/mufti/400/400' },
  { sub: '00000000-0000-0000-0000-000000000301', title: 'Raymond Wool Blazer Charcoal', desc: 'Raymond premium wool blend blazer. Size 40R. Slim fit. Perfect for weddings and formal occasions.', price: 7999, brand: 'Raymond', model: 'Wool Blazer', location: 'Hyderabad', condition: 'New', images: 'https://picsum.photos/seed/raymond/400/400' },
  { sub: '00000000-0000-0000-0000-000000000302', title: 'Saree Silk Banarasi Art Silk', desc: 'Beautiful Banarasi art silk saree in royal blue with gold zari work. Comes with blouse piece. Worn once.', price: 4500, brand: 'Generic', model: 'Banarasi Saree', location: 'Chennai', condition: 'Like New', images: 'https://picsum.photos/seed/saree/400/400' },
  { sub: '00000000-0000-0000-0000-000000000302', title: 'Levi\'s Women\'s Classic Straight Jeans', desc: 'Levi\'s women\'s straight fit jeans. Size 28x30. Dark indigo wash. Classic five-pocket styling.', price: 2999, brand: 'Levi\'s', model: 'Straight Jeans', location: 'Mumbai', condition: 'New', images: 'https://picsum.photos/seed/levisw/400/400' },
  { sub: '00000000-0000-0000-0000-000000000302', title: 'FabAlley Wrap Dress Floral', desc: 'Floral print wrap dress from FabAlley. Size S. Knee-length. Perfect for brunch and parties.', price: 1899, brand: 'FabAlley', model: 'Wrap Dress', location: 'Delhi', condition: 'New', images: 'https://picsum.photos/seed/fab/400/400' },
  { sub: '00000000-0000-0000-0000-000000000303', title: 'Puma RS-X Sneakers Multi', desc: 'Puma RS-X Reinvention in multi-color. Size 9 UK. Chunky retro design. Barely worn.', price: 6999, brand: 'Puma', model: 'RS-X', location: 'Pune', condition: 'Like New', images: 'https://picsum.photos/seed/puma/400/400' },
  { sub: '00000000-0000-0000-0000-000000000303', title: 'Clarks Men\'s Formal Oxford Shoes', desc: 'Clarks synthetic leather oxford shoes. Size 9 UK. Tan brown. Perfect for office and events.', price: 5499, brand: 'Clarks', model: 'Oxford', location: 'Bangalore', condition: 'New', images: 'https://picsum.photos/seed/clarks/400/400' },
  { sub: '00000000-0000-0000-0000-000000000303', title: 'New Balance 574 Classic Grey', desc: 'New Balance 574 in classic grey. Size 10 UK. Suede and mesh upper. Everyday sneaker.', price: 7499, brand: 'New Balance', model: '574', location: 'Chennai', condition: 'Like New', images: 'https://picsum.photos/seed/nb574/400/400' },
  { sub: '00000000-0000-0000-0000-000000000304', title: 'Safari Pentagon Hardside Trolley Bag 55cm', desc: 'Safari Pentagon cabin trolley in black. TSA lock, 360° wheels. Scratch-resistant surface.', price: 3999, brand: 'Safari', model: 'Pentagon 55cm', location: 'Hyderabad', condition: 'New', images: 'https://picsum.photos/seed/safari/400/400' },
  { sub: '00000000-0000-0000-0000-000000000304', title: 'Hidesign Women\'s Leather Tote', desc: 'Hidesign genuine leather tote bag in tan. Spacious with inner pockets. Elegant design.', price: 5999, brand: 'Hidesign', model: 'Leather Tote', location: 'Delhi', condition: 'New', images: 'https://picsum.photos/seed/hidesign/400/400' },
  { sub: '00000000-0000-0000-0000-000000000305', title: 'Titan Raga Viva Analog Watch Women', desc: 'Titan Raga Viva with rose gold case, leather strap. Elegant floral dial. Minimal wear.', price: 4299, brand: 'Titan', model: 'Raga Viva', location: 'Mumbai', condition: 'Like New', images: 'https://picsum.photos/seed/titan/400/400' },
  { sub: '00000000-0000-0000-0000-000000000305', title: 'Fossil Gen 6 Hybrid Smartwatch', desc: 'Fossil Gen 6 hybrid with traditional watch hands + smart notifications. Heart rate, GPS.', price: 9999, brand: 'Fossil', model: 'Gen 6 Hybrid', location: 'Pune', condition: 'Excellent', images: 'https://picsum.photos/seed/fossilh/400/400' },

  // ── VEHICLES (need more in Cars, Bicycles, Scooters, Spare Parts) ──
  { sub: '00000000-0000-0000-0000-000000000401', title: 'Tata Nexon XZ+ Petrol 2023', desc: 'Tata Nexon XZ+ with sunroof, ventilated seats, 10.25" touchscreen. 15,000 km. Single owner.', price: 1150000, brand: 'Tata', model: 'Nexon XZ+', location: 'Delhi', condition: 'Excellent', images: 'https://picsum.photos/seed/nexon/400/400' },
  { sub: '00000000-0000-0000-0000-000000000401', title: 'Mahindra XUV700 AX7 Diesel 2023', desc: 'XUV700 top variant with ADAS, panoramic sunroof, Sony audio. 20,000 km. All service records.', price: 1950000, brand: 'Mahindra', model: 'XUV700 AX7', location: 'Mumbai', condition: 'Excellent', images: 'https://picsum.photos/seed/xuv700/400/400' },
  { sub: '00000000-0000-0000-0000-000000000402', title: 'Bajaj Pulsar NS200 2024', desc: 'Brand new Bajaj Pulsar NS200 in red. ABS, liquid-cooled. 2,000 km. Full warranty.', price: 145000, brand: 'Bajaj', model: 'Pulsar NS200', location: 'Bangalore', condition: 'Like New', images: 'https://picsum.photos/seed/ns200/400/400' },
  { sub: '00000000-0000-0000-0000-000000000403', title: 'TVS Jupiter 125 SmartXonnect 2024', desc: 'TVS Jupiter 125 with Bluetooth connectivity, USB charger. 1,500 km. First owner. White color.', price: 82000, brand: 'TVS', model: 'Jupiter 125', location: 'Chennai', condition: 'Like New', images: 'https://picsum.photos/seed/jupiter/400/400' },
  { sub: '00000000-0000-0000-0000-000000000404', title: 'Giant Escape 3 City Bicycle', desc: 'Giant Escape 3 city bike. Lightweight aluminium frame, 21-speed Shimano. Great for commuting.', price: 16000, brand: 'Giant', model: 'Escape 3', location: 'Hyderabad', condition: 'Good', images: 'https://picsum.photos/seed/giant/400/400' },
  { sub: '00000000-0000-0000-0000-000000000405', title: 'MRF Zapper Tyres Set of 4 (14 inch)', desc: 'MRF Zapper tubeless tyres, 14-inch set of 4. Brand new, manufactured 2025. For hatchbacks.', price: 12000, brand: 'MRF', model: 'Zapper 14"', location: 'Delhi', condition: 'New', images: 'https://picsum.photos/seed/mrf/400/400' },
  { sub: '00000000-0000-0000-0000-000000000405', title: 'Brembo Brake Pad Set Front', desc: 'Brembo ceramic brake pads for front axle. Compatible with most Indian sedans. Low dust, quiet.', price: 2800, brand: 'Brembo', model: 'Ceramic Pads', location: 'Pune', condition: 'New', images: 'https://picsum.photos/seed/brembo/400/400' },

  // ── OTHERS (need more in all) ──
  { sub: '00000000-0000-0000-0000-000000000501', title: 'Prestige Iris 750W Mixer Grinder', desc: 'Prestige Iris 750W mixer grinder with 3 jars. Stainless steel blades. Used for 6 months.', price: 2499, brand: 'Prestige', model: 'Iris 750W', location: 'Mumbai', condition: 'Good', images: 'https://picsum.photos/seed/prestige/400/400' },
  { sub: '00000000-0000-0000-0000-000000000501', title: 'Luminous Eco Volt Neo 1050VA Inverter', desc: 'Luminous inverter with 1 battery. 3 years old but works perfectly. Includes installation.', price: 8999, brand: 'Luminous', model: 'Eco Volt Neo', location: 'Delhi', condition: 'Good', images: 'https://picsum.photos/seed/lum/400/400' },
  { sub: '00000000-0000-0000-0000-000000000502', title: 'Yonex Mavis 350 Nylon Shuttlecocks (12 pcs)', desc: 'Yonex Mavis 350 nylon shuttlecocks. Speed 77. Yellow. For indoor play. Sealed tube.', price: 850, brand: 'Yonex', model: 'Mavis 350', location: 'Hyderabad', condition: 'New', images: 'https://picsum.photos/seed/yonex/400/400' },
  { sub: '00000000-0000-0000-0000-000000000502', title: 'Nivia Storm Football Size 5', desc: 'Nivia Storm hand-stitched football. Size 5. FIFA approved quality. Suitable for turf and grass.', price: 799, brand: 'Nivia', model: 'Storm', location: 'Bangalore', condition: 'New', images: 'https://picsum.photos/seed/nivia/400/400' },
  { sub: '00000000-0000-0000-0000-000000000502', title: 'Strauss Adjustable Dumbbells 20kg Set', desc: 'Strauss vinyl-coated adjustable dumbbells. 20kg total (2x10kg). Chrome handle. Great for home gym.', price: 3499, brand: 'Strauss', model: 'Dumbbells 20kg', location: 'Chennai', condition: 'New', images: 'https://picsum.photos/seed/strauss/400/400' },
  { sub: '00000000-0000-0000-0000-000000000503', title: 'Wren & Martin English Grammar Book', desc: 'Classic Wren & Martin grammar book with answer key. Revised edition. Essential for competitive exams.', price: 450, brand: 'Wren & Martin', model: 'Grammar', location: 'Delhi', condition: 'Like New', images: 'https://picsum.photos/seed/wren/400/400' },
  { sub: '00000000-0000-0000-0000-000000000503', title: 'Oswaal CBSE Question Bank Class 10 (5 subjects)', desc: 'Complete Oswaal question bank for CBSE Class 10 — Maths, Science, English, Social, Hindi.', price: 1200, brand: 'Oswaal', model: 'CBSE Class 10', location: 'Pune', condition: 'New', images: 'https://picsum.photos/seed/oswaal/400/400' },
  { sub: '00000000-0000-0000-0000-000000000503', title: 'Think and Grow Rich by Napoleon Hill (Hardcover)', desc: 'Classic self-help book in premium hardcover edition. Gift-worthy condition. Never opened.', price: 599, brand: 'Napoleon Hill', model: 'Think and Grow Rich', location: 'Mumbai', condition: 'New', images: 'https://picsum.photos/seed/think/400/400' },
];

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const CATS = [
  { id: '00000000-0000-0000-0000-000000000101', subs: ['00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000204','00000000-0000-0000-0000-000000000205'] },
  { id: '00000000-0000-0000-0000-000000000102', subs: ['00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000304','00000000-0000-0000-0000-000000000305'] },
  { id: '00000000-0000-0000-0000-000000000103', subs: ['00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000405'] },
  { id: '00000000-0000-0000-0000-000000000104', subs: ['00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000503'] },
];

function getCatId(subId) {
  for (const cat of CATS) {
    if (cat.subs.includes(subId)) return cat.id;
  }
  return null;
}

async function main() {
  let created = 0;
  const cities = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'];
  for (const post of POSTS) {
    const postId = uuid();
    const city = cities[Math.floor(Math.random() * cities.length)];
    const catId = getCatId(post.sub);
    const imageArr = JSON.stringify([post.images]);
    try {
      await runQuery(
        `INSERT INTO posts (post_id, user_id, category_id, subcategory_id, title, description, price, location, city, status, "condition", brand, model, images, image_url, post_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13::jsonb, $14, 'marketplace', NOW(), NOW())`,
        [postId, SELLER, catId, post.sub, post.title, post.desc, post.price, post.location || city, city, post.condition, post.brand, post.model, imageArr, post.images]
      );
      created++;
    } catch (e) {
      console.error(`  ❌ ${post.title}: ${e.message.substring(0,60)}`);
    }
  }
  console.log(`✅ ${created}/${POSTS.length} additional posts created`);

  const count = await runQuery('SELECT COUNT(*) as total FROM posts WHERE status = $1', ['active']);
  console.log(`📊 Total active posts: ${count.rows[0].total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
