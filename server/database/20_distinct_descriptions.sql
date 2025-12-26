-- =====================================================
-- MHub Post Descriptions Update - DISTINCT DESCRIPTIONS
-- Run this to give each post a unique, realistic description
-- =====================================================

-- Update posts with unique descriptions based on post_id
UPDATE posts SET description = CASE post_id
  -- Mobiles
  WHEN 1 THEN 'Premium smartphone with stunning AMOLED display. 128GB storage, 8GB RAM. Comes with original charger and box. Screen protector applied since day one. No scratches or dents.'
  WHEN 2 THEN 'Flagship phone with incredible camera quality. Brand new condition, barely used for 2 months. Includes fast charger and protective case. Battery health at 98%.'
  WHEN 3 THEN 'Budget-friendly smartphone perfect for students. Dual SIM support, expandable storage. All sensors working flawlessly. Original accessories included.'
  
  -- Electronics
  WHEN 4 THEN 'Professional-grade laptop with M-series chip. 16GB RAM, 512GB SSD. Perfect for coding and design work. Comes with original charger and documentation.'
  WHEN 5 THEN 'Wireless noise-cancelling headphones with 30-hour battery life. Crystal clear audio quality. Includes carrying case and charging cable.'
  WHEN 6 THEN 'Next-gen gaming console with 2 controllers. Includes 5 popular games. All original packaging. Perfect for family entertainment.'
  WHEN 7 THEN '4K Smart TV with built-in streaming apps. Vibrant colors and slim design. Wall mount included. Energy efficient and quiet operation.'
  WHEN 8 THEN 'Portable Bluetooth speaker with waterproof design. 12-hour playtime. Perfect for outdoor parties and beach trips. Like new condition.'
  
  -- Fashion
  WHEN 9 THEN 'Elegant designer outfit perfect for weddings and celebrations. Size M, worn once. Premium fabric with beautiful embroidery. Dry cleaned and ready.'
  WHEN 10 THEN 'Authentic leather boots, European style. Size 9 UK. Comfortable for all-day wear. Minor sole wear, upper in excellent condition.'
  WHEN 11 THEN 'Vintage silk scarf from Paris. Timeless design that complements any outfit. Perfect gift for someone special. Comes in original box.'
  WHEN 12 THEN 'Premium cotton formal shirts set of 5. Size L, various colors. Machine washable and wrinkle-resistant. Perfect for office wear.'
  WHEN 13 THEN 'Designer handbag with authentic certification. Multiple compartments for organization. Barely used, no scratches. Comes with dust bag.'
  
  -- Furniture
  WHEN 14 THEN 'Solid wood dining table with 6 chairs. Handcrafted teak finish. Minor surface marks add character. Easy to transport, can be disassembled.'
  WHEN 15 THEN 'Ergonomic office chair with adjustable lumbar support. Perfect for work-from-home setup. Breathable mesh back. Height adjustable.'
  WHEN 16 THEN 'Memory foam king-size mattress, 8-inch thickness. Hypoallergenic and dust-mite resistant. Barely used, spotless condition.'
  WHEN 17 THEN 'Modern bookshelf with 5 tiers. Industrial design with metal frame. Sturdy construction holds heavy books. Easy assembly.'
  
  -- Vehicles
  WHEN 18 THEN 'Well-maintained sedan with complete service history. Single owner, accident-free. All documents ready for transfer. Recently serviced.'
  WHEN 19 THEN 'Sports bike in excellent condition. Low mileage, regularly serviced. Modified exhaust for better sound. Helmet and gloves included.'
  WHEN 20 THEN 'Electric scooter with 80km range. Ideal for city commute. Charging cable and accessories included. Battery health at 95%.'
  
  -- Books
  WHEN 21 THEN 'Complete collection of bestselling novels. All in pristine condition with no markings. Perfect for book lovers and collectors.'
  WHEN 22 THEN 'Academic textbooks for engineering. Latest editions with solutions manual. Some highlighting for easy revision. Great value bundle.'
  WHEN 23 THEN 'Rare vintage books collection from 1950s. Collectors items in good condition. Some yellowing due to age but well preserved.'
  
  -- Sports
  WHEN 24 THEN 'Professional grade badminton racket. Lightweight frame for quick shots. Strung at 28 lbs tension. Includes cover and extra grip.'
  WHEN 25 THEN 'Complete gym equipment set for home workout. Dumbbells, resistance bands, yoga mat included. Perfect for beginners.'
  WHEN 26 THEN 'Carbon fiber racing bicycle. 21-speed gears, disc brakes. Performance wheels for speed. Minor scratches on frame.'
  
  -- Home Appliances
  WHEN 27 THEN 'Efficient split AC with inverter technology. 5-star energy rating. Cools large rooms quickly. 3-year warranty remaining.'
  WHEN 28 THEN 'Smart washing machine with multiple wash programs. Front-load, 7kg capacity. Steam wash feature. Works perfectly.'
  WHEN 29 THEN 'Premium blender with powerful motor. Multiple attachments for grinding and juicing. Stainless steel blades. Quiet operation.'
  
  -- Beauty
  WHEN 30 THEN 'Professional hair styling kit with dryer and straightener. Ceramic technology for smooth results. Includes heat protection spray.'
  WHEN 31 THEN 'Luxury skincare set from premium brand. Unopened and sealed. Perfect for gifting. Expiry date is 2026.'
  
  -- Kids
  WHEN 32 THEN 'Educational toys set for ages 3-6. STEM-based learning. Non-toxic materials, all safety certified. Develops motor skills.'
  WHEN 33 THEN 'Baby stroller with car seat combo. Lightweight and easy to fold. Multiple recline positions. Excellent condition.'
  
  ELSE 'Quality item in excellent condition. Well maintained and carefully used. Contact for more details and additional photos. Reasonable offers welcome.'
END
WHERE post_id <= 33;

-- For remaining posts, create varied descriptions using modulo
UPDATE posts SET description = CASE (post_id % 10)
  WHEN 0 THEN 'Exceptional quality product at an unbeatable price. Thoroughly tested and working perfectly. Original packaging available. Quick sale needed.'
  WHEN 1 THEN 'Gently used item in mint condition. All original accessories included with box. Pet-free, smoke-free home. Negotiable for serious buyers.'
  WHEN 2 THEN 'Premium product with warranty remaining. Purchased 6 months ago from authorized dealer. Bills and documentation available.'
  WHEN 3 THEN 'Like-new condition with minimal usage signs. Perfect working order verified. Includes all standard accessories. Best offer wins.'
  WHEN 4 THEN 'Excellent value for money. Regular maintenance done. Clean and sanitized. Ready for immediate pickup or delivery.'
  WHEN 5 THEN 'High-quality item from reputed brand. Original purchase receipt available. No defects or issues. Selling due to upgrade.'
  WHEN 6 THEN 'Well-maintained product with care. All features working flawlessly. Includes user manual. Great for first-time buyers.'
  WHEN 7 THEN 'Authentic product with certification. Barely used, practically new. Original MSRP was much higher. Steal deal!'
  WHEN 8 THEN 'Reliable product for daily use. Tested before listing. Honest seller with good ratings. Can demonstrate before sale.'
  WHEN 9 THEN 'Feature-rich item at fraction of retail price. Regular updates and maintenance done. Ideal upgrade opportunity.'
  ELSE 'Quality assured item. Contact for more information and photos. Flexible on price for genuine buyers.'
END
WHERE post_id > 33;

-- Add some variety by appending location-based text
UPDATE posts SET description = description || ' Located in ' || location || '.' WHERE location IS NOT NULL AND location != '';

-- Verification
SELECT 'Distinct descriptions applied to ' || COUNT(DISTINCT description) || ' posts out of ' || COUNT(*) || ' total' as status FROM posts;
