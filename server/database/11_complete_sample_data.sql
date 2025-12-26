-- =====================================================
-- MHUB COMPLETE SAMPLE DATA SCRIPT
-- Run this AFTER 00_master_setup.sql to get rich sample data
-- Run: \i 'C:/Users/laksh/GITHUB/AG/Mhub/server/database/11_complete_sample_data.sql'
-- =====================================================

-- ===========================================
-- STEP 1: UPDATE ALL POSTS WITH DETAILED DESCRIPTIONS
-- ===========================================
UPDATE posts SET description = CASE 
  WHEN category_id = 1 THEN 'High-quality electronics in excellent condition. All accessories included. Original box available. Thoroughly tested and working perfectly. Pet-free, smoke-free home. Serious buyers only. Price negotiable for quick sale.'
  WHEN category_id = 2 THEN 'Premium mobile device with original charger and accessories. Screen protector applied from day one. Battery health above 90%. No scratches or dents. All features working flawlessly. Bill and warranty card available.'
  WHEN category_id = 3 THEN 'Trendy fashion item in pristine condition. Worn only 1-2 times for special occasions. No stains, tears, or fading. Original tags available. Perfect fit and comfortable. Makes a great gift!'
  WHEN category_id = 4 THEN 'Sturdy and elegant furniture piece. Solid construction with premium materials. No wobbles or squeaks. Minor usage marks that add character. Easy to assemble/disassemble for transport.'
  WHEN category_id = 5 THEN 'Well-maintained vehicle with complete service history. All documents up to date including insurance and PUC. Regular servicing done at authorized centers. New tires and battery. AC working perfectly.'
  WHEN category_id = 6 THEN 'Educational material in excellent condition. No markings or highlights. Perfect for students and competitive exam preparation. Covers complete syllabus. Quick revision notes included.'
  WHEN category_id = 7 THEN 'Professional-grade sports equipment. Used by serious athletes. Excellent grip and performance. Cleaned and sanitized. Great for beginners and intermediate players alike.'
  WHEN category_id = 8 THEN 'Energy-efficient home appliance with amazing performance. Still under warranty. All original accessories included. User manual available. Saves electricity and works quietly.'
  WHEN category_id = 9 THEN 'Premium beauty product that works wonders! Unopened and sealed with authenticity guaranteed. Perfect for gifting. Expiry date is far away. Store in a cool, dry place.'
  WHEN category_id = 10 THEN 'Safe and educational kids item that brings joy! Age-appropriate and non-toxic materials. Stimulates creativity and learning. Great for birthday gifts. Comes with original packaging.'
  ELSE 'Quality item in great condition. Contact for more details and photos. Price is negotiable for serious buyers. Available for immediate pickup or can arrange delivery.'
END;

-- ===========================================
-- STEP 2: ADD MORE DIVERSE POSTS WITH RICH DATA
-- ===========================================
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, latitude, longitude, status, condition, views_count, images, discount_percentage, created_at) VALUES
-- MOBILES
(1, 2, 3, 'iPhone 15 Pro Max 256GB - Natural Titanium', 'Brand new iPhone 15 Pro Max with AppleCare+. Bought 2 months ago from Apple Store with original bill. Includes MagSafe charger, original box, all documentation. Battery health 100%. No scratches, always used with case and screen protector.', 134900, 'Hyderabad, Banjara Hills', 17.4123, 78.4401, 'active', 'new', 245, '["https://images.unsplash.com/photo-1695048133142-1a20484d2569"]', 5, NOW() - INTERVAL '2 days'),
(2, 2, 2, 'Samsung Galaxy S24 Ultra 512GB - Titanium Black', 'Flagship Samsung phone with S Pen included. 200MP camera takes stunning photos. 100x Space Zoom tested and working. Under Samsung warranty till Dec 2025. Original accessories included.', 119999, 'Mumbai, Andheri', 19.1136, 72.8697, 'active', 'like_new', 189, '["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf"]', 0, NOW() - INTERVAL '5 days'),
(3, 2, 1, 'OnePlus 12R 256GB - Iron Gray', 'Power-packed OnePlus flagship at mid-range price. 5500mAh battery lasts 2 days. 100W fast charging. Perfect for gaming and daily use. Minor scratches on back, screen perfect.', 42999, 'Delhi, Connaught Place', 28.6315, 77.2167, 'active', 'good', 156, '["https://images.unsplash.com/photo-1598327105666-5b89351aff97"]', 10, NOW() - INTERVAL '1 week'),

-- ELECTRONICS
(4, 1, 4, 'MacBook Pro 14" M3 Pro 18GB/512GB', 'Professional-grade laptop for developers and creators. M3 Pro chip handles everything smoothly. 14-hour battery life. Retina XDR display is stunning. AppleCare+ valid till 2026.', 189900, 'Bangalore, Koramangala', 12.9352, 77.6245, 'active', 'like_new', 312, '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8"]', 0, NOW() - INTERVAL '3 days'),
(5, 1, 2, 'Sony WH-1000XM5 Wireless Headphones', 'Industry-leading noise cancellation. Multipoint connection for 2 devices. 30-hour battery life. Speak-to-Chat feature. Includes carrying case and cables.', 24990, 'Chennai, T Nagar', 13.0382, 80.2332, 'active', 'new', 178, '["https://images.unsplash.com/photo-1546435770-a3e426bf472b"]', 8, NOW() - INTERVAL '4 days'),
(6, 1, 3, 'PlayStation 5 Slim 1TB + 2 Controllers + 5 Games', 'Complete gaming bundle! Includes Spider-Man 2, God of War Ragnarok, Horizon Forbidden West, Gran Turismo 7, and FIFA 24. 2 DualSense controllers. All in original boxes.', 54999, 'Pune, Hadapsar', 18.5074, 73.9428, 'active', 'like_new', 267, '["https://images.unsplash.com/photo-1606813907291-d86efa9b94db"]', 5, NOW() - INTERVAL '6 days'),

-- FURNITURE
(7, 4, 1, 'IKEA Malm Queen Bed with Mattress', 'Scandinavian design bed with storage drawers. Includes high-quality memory foam mattress (purchased separately). Dismantled and ready for pickup. Minor assembly required.', 28000, 'Hyderabad, Gachibowli', 17.4401, 78.3489, 'active', 'good', 89, '["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"]', 15, NOW() - INTERVAL '2 weeks'),
(8, 4, 2, 'Herman Miller Aeron Chair - Size B', 'Ergonomic office chair that transformed my work-from-home setup. Fully adjustable lumbar support. PostureFit SL. Graphite finish. Perfect for long coding sessions.', 75000, 'Mumbai, Powai', 19.1255, 72.9079, 'active', 'good', 145, '["https://images.unsplash.com/photo-1580480055273-228ff5388ef8"]', 0, NOW() - INTERVAL '1 week'),
(9, 4, 1, 'L-Shaped Study Desk with Bookshelf', 'Spacious L-shaped desk perfect for dual monitor setup. Built-in bookshelf and cable management. Sturdy construction. Disassembled for easy transport.', 12500, 'Delhi, Noida', 28.5355, 77.3910, 'active', 'good', 67, '["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd"]', 20, NOW() - INTERVAL '3 weeks'),

-- VEHICLES
(10, 5, 4, 'Royal Enfield Classic 350 - Chrome Red', '2022 model with only 8000 km on odometer. All services done at RE showroom. New tires and chain sprocket. Riding accessories included (helmet, gloves, jacket). Insurance valid till March 2025.', 175000, 'Bangalore, Jayanagar', 12.9296, 77.5892, 'active', 'good', 234, '["https://images.unsplash.com/photo-1558981403-c5f9899a28bc"]', 0, NOW() - INTERVAL '5 days'),
(11, 5, 3, 'Honda City 2021 VX Petrol - Pearl White', 'Single owner, well-maintained sedan. 25000 km driven. Advanced safety features. Sunroof, Apple CarPlay, Lane Watch Camera. All documents complete. Insurance renewed.', 1150000, 'Chennai, Anna Nagar', 13.0858, 80.2126, 'active', 'like_new', 156, '["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf"]', 3, NOW() - INTERVAL '1 week'),

-- FASHION
(12, 3, 1, 'Nike Air Jordan 1 Retro High OG - Chicago', 'Iconic sneakers in Size 10 UK. Worn only twice indoors. No creases or yellowing. Original box and laces included. Perfect for collectors or streetwear enthusiasts.', 18999, 'Mumbai, Colaba', 18.9067, 72.8147, 'active', 'like_new', 198, '["https://images.unsplash.com/photo-1542291026-7eec264c27ff"]', 0, NOW() - INTERVAL '4 days'),
(13, 3, 2, 'Levis 501 Original Fit Jeans - Dark Indigo', 'Classic straight-leg jeans. Size 32x32. Worn a few times, perfect fade starting to develop. 100% cotton, made in USA. Timeless piece for any wardrobe.', 3500, 'Delhi, Saket', 28.5244, 77.2147, 'active', 'good', 78, '["https://images.unsplash.com/photo-1542272604-787c3835535d"]', 10, NOW() - INTERVAL '2 weeks'),

-- BOOKS
(14, 6, 1, 'Complete UPSC Preparation Set - GS + CSAT', '25+ books covering entire UPSC syllabus. Includes NCERTs, standard reference books, previous year papers with solutions. Highlighted in some places. Notes in margins. Perfect for serious aspirants.', 4500, 'Hyderabad, Ameerpet', 17.4373, 78.4485, 'active', 'good', 123, '["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c"]', 25, NOW() - INTERVAL '3 weeks'),
(15, 6, 1, 'Harry Potter Complete Box Set 1-7', 'Hardcover special edition with beautiful artwork. Collectors item. All books in pristine condition. Great for gifting to young readers.', 5500, 'Kolkata, Salt Lake', 22.5798, 88.4214, 'active', 'new', 167, '["https://images.unsplash.com/photo-1506880018603-83d5b814b5a6"]', 0, NOW() - INTERVAL '1 week'),

-- SPORTS
(16, 7, 2, 'Yonex Astrox 99 Pro Badminton Racket', 'Professional-grade racket used by Olympic players. Perfect for attacking gameplay. Strung with BG80 at 28lbs. Includes cover and extra grip.', 16500, 'Bangalore, Indiranagar', 12.9783, 77.6408, 'active', 'good', 89, '["https://images.unsplash.com/photo-1626224583764-f87db24ac4ea"]', 5, NOW() - INTERVAL '2 weeks'),
(17, 7, 1, 'Complete Cricket Kit - SS Ton', 'Full cricket kit for adults. SS Ton bat, MRF pads, SG gloves, helmet, abdominal guard, kit bag. Used for one season. Great for club-level cricketers.', 12000, 'Chennai, Mylapore', 13.0330, 80.2655, 'active', 'good', 112, '["https://images.unsplash.com/photo-1531415074968-036ba1b575da"]', 15, NOW() - INTERVAL '1 month'),

-- HOME APPLIANCES
(18, 8, 3, 'LG 1.5 Ton 5-Star Inverter Split AC', '2023 model with DUAL Inverter Compressor. Lowest electricity bills guaranteed. 4-way swing for uniform cooling. Includes installation kit. 5-year warranty remaining.', 42000, 'Hyderabad, Madhapur', 17.4410, 78.3905, 'active', 'like_new', 178, '["https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf"]', 8, NOW() - INTERVAL '1 week'),
(19, 8, 2, 'Samsung 670L Side-by-Side Refrigerator', 'Massive family-size refrigerator. Ice and water dispenser. Digital inverter technology. SpaceMax for more storage. Silver finish matches any kitchen.', 85000, 'Mumbai, Dadar', 19.0228, 72.8423, 'active', 'good', 134, '["https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5"]', 10, NOW() - INTERVAL '2 weeks'),
(20, 8, 1, 'Dyson V15 Detect Cordless Vacuum', 'Most powerful cordless vacuum! Laser detects hidden dust. LCD screen shows particle sizes. Complete tool kit for all surfaces. Perfect for pet owners.', 52000, 'Delhi, Greater Kailash', 28.5494, 77.2433, 'active', 'new', 198, '["https://images.unsplash.com/photo-1558317374-067fb5f30001"]', 0, NOW() - INTERVAL '5 days'),

-- BEAUTY
(21, 9, 1, 'Dyson Airwrap Complete Long', 'Revolutionary hair styling tool. All attachments for different hair types. Barely used, like new condition. Original box and case included. Perfect gift!', 45000, 'Bangalore, HSR Layout', 12.9081, 77.6476, 'active', 'like_new', 156, '["https://images.unsplash.com/photo-1596462502278-27bfdc403348"]', 5, NOW() - INTERVAL '1 week'),

-- KIDS
(22, 10, 2, 'LEGO Technic Ferrari 488 GTE - 42125', 'Complex building set for ages 16+. 1677 pieces. Sealed in original box. Perfect for display after building. Collectors item with great resale value.', 18500, 'Pune, Aundh', 18.5590, 73.8074, 'active', 'new', 89, '["https://images.unsplash.com/photo-1558060370-d644479cb6f7"]', 0, NOW() - INTERVAL '3 days'),
(23, 10, 1, 'Baby Swing + High Chair + Stroller Bundle', 'Complete baby gear bundle for 0-3 years. Graco stroller with car seat, Fisher-Price high chair, and electric baby swing. All sanitized and ready to use.', 15000, 'Hyderabad, Kondapur', 17.4590, 78.3658, 'active', 'good', 67, '["https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4"]', 20, NOW() - INTERVAL '4 weeks')
ON CONFLICT DO NOTHING;

-- ===========================================
-- STEP 3: ADD SAMPLE TRANSACTIONS (using existing post IDs)
-- ===========================================
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  -- Get first 10 post IDs that exist
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  
  -- Only insert if we have posts
  IF array_length(v_post_ids, 1) >= 10 THEN
    INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at, created_at) VALUES
    (5, 1, v_post_ids[1], 25000, 'completed', 'UPI', NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days'),
    (6, 2, v_post_ids[2], 45000, 'completed', 'Bank Transfer', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days'),
    (7, 3, v_post_ids[3], 18500, 'completed', 'Cash', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'),
    (8, 4, v_post_ids[4], 75000, 'completed', 'UPI', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days'),
    (9, 5, v_post_ids[5], 32000, 'pending', 'UPI', NULL, NOW() - INTERVAL '1 day'),
    (10, 6, v_post_ids[6], 15000, 'completed', 'Cash', NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days'),
    (11, 7, v_post_ids[7], 8500, 'cancelled', 'Bank Transfer', NULL, NOW() - INTERVAL '15 days'),
    (12, 8, v_post_ids[8], 120000, 'completed', 'Bank Transfer', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
    (13, 9, v_post_ids[9], 55000, 'completed', 'UPI', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days'),
    (14, 10, v_post_ids[10], 28000, 'pending', 'Cash', NULL, NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Created 10 transactions';
  ELSE
    RAISE NOTICE 'Not enough posts for transactions';
  END IF;
END $$;

-- ===========================================
-- STEP 4: ADD SAMPLE BUYER INQUIRIES (using existing post IDs)
-- ===========================================
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  
  IF array_length(v_post_ids, 1) >= 9 THEN
    INSERT INTO buyer_inquiries (post_id, buyer_id, seller_id, message, status, created_at) VALUES
    (v_post_ids[1], 5, 1, 'Hi, is this still available? Can you do ₹23,000?', 'pending', NOW() - INTERVAL '2 hours'),
    (v_post_ids[1], 6, 1, 'Interested! Can we meet tomorrow at Inorbit Mall?', 'responded', NOW() - INTERVAL '5 hours'),
    (v_post_ids[2], 7, 2, 'Is the phone unlocked for all carriers?', 'responded', NOW() - INTERVAL '1 day'),
    (v_post_ids[3], 8, 3, 'Any scratches on the screen? WhatsApp me photos please.', 'pending', NOW() - INTERVAL '3 hours'),
    (v_post_ids[4], 9, 4, 'Will you consider exchange with my MacBook Air M1?', 'rejected', NOW() - INTERVAL '2 days'),
    (v_post_ids[5], 10, 5, 'Can you deliver to Noida? I will pay extra for delivery.', 'pending', NOW() - INTERVAL '4 hours'),
    (v_post_ids[6], 11, 6, 'Is the warranty transferable? What games are included?', 'responded', NOW() - INTERVAL '1 day'),
    (v_post_ids[7], 12, 7, 'What is the mattress brand and thickness?', 'pending', NOW() - INTERVAL '6 hours'),
    (v_post_ids[8], 13, 8, 'Can I test the chair before buying? Where are you located?', 'responded', NOW() - INTERVAL '8 hours'),
    (v_post_ids[9], 14, 9, 'Is assembly required? Do you have the instruction manual?', 'pending', NOW() - INTERVAL '12 hours')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Created buyer inquiries';
  END IF;
END $$;

-- ===========================================
-- STEP 5: ADD MORE REVIEWS (using existing post IDs)
-- ===========================================
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  
  IF array_length(v_post_ids, 1) >= 10 THEN
    INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, title, comment, helpful_count, verified_purchase, created_at) VALUES
    (5, 1, v_post_ids[1], 5, 'Superb seller, highly recommended!', 'Rahul was very professional. The phone was exactly as described. Quick response and smooth transaction. Would definitely buy from him again!', 12, true, NOW() - INTERVAL '5 days'),
    (6, 2, v_post_ids[2], 4, 'Good experience overall', 'Priya was responsive and the product was genuine. Slight delay in meeting but everything else was perfect. Fair price.', 8, true, NOW() - INTERVAL '3 days'),
    (7, 3, v_post_ids[3], 5, 'Best seller on MobileHub!', 'Amit exceeded expectations! He even included extra accessories as a surprise. The laptop runs like a dream. 100% trustworthy.', 15, true, NOW() - INTERVAL '10 days'),
    (8, 4, v_post_ids[4], 3, 'Average, room for improvement', 'Product was okay but took time to respond. Price negotiation was tough. Would have appreciated more photos beforehand.', 3, true, NOW() - INTERVAL '2 days'),
    (9, 5, v_post_ids[5], 5, 'Excellent transaction!', 'Vikram is a gem! Met at convenient location, item was as described, even helped with setup. Highly recommend!', 20, true, NOW() - INTERVAL '1 week'),
    (10, 6, v_post_ids[6], 4, 'Satisfied buyer', 'Anita was nice to deal with. Product had minor wear not mentioned in listing but fair price so no complaints.', 5, true, NOW() - INTERVAL '20 days'),
    (11, 7, v_post_ids[7], 5, 'Perfect seller!', 'Rajesh went above and beyond. Delivered to my doorstep, included original packaging, very courteous. Will buy again!', 18, true, NOW() - INTERVAL '15 days'),
    (12, 8, v_post_ids[8], 5, 'Highly professional', 'Pooja runs a tight ship! Invoice provided, product tested before handover, even gave tips for maintenance. A++', 22, true, NOW() - INTERVAL '1 day'),
    (13, 9, v_post_ids[9], 4, 'Good but pricey', 'Suresh was honest and the product genuine. Could have been priced slightly lower but overall happy with purchase.', 6, false, NOW() - INTERVAL '8 days'),
    (14, 10, v_post_ids[10], 5, 'Exceptional experience!', 'Kavitha is the most professional seller I have met. Perfect packaging, all accessories, excellent communication. 10/10!', 25, true, NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Created reviews';
  END IF;
END $$;

-- ===========================================
-- STEP 6: ADD FEEDBACK ENTRIES  
-- ===========================================
INSERT INTO feedback (user_id, message, rating, category, status, created_at) VALUES
(1, 'Love the new UI! Much easier to navigate now. The dark mode is especially nice.', 5, 'general', 'reviewed', NOW() - INTERVAL '1 week'),
(2, 'Please add a feature to save searches and get notifications when matching items are posted.', 4, 'feature', 'open', NOW() - INTERVAL '3 days'),
(3, 'The app sometimes crashes when uploading multiple images. Using iPhone 13 Pro.', 2, 'bug', 'in_progress', NOW() - INTERVAL '2 days'),
(4, 'Price filter should allow custom range instead of fixed options.', 4, 'ui', 'open', NOW() - INTERVAL '5 days'),
(5, 'Chat feature needs read receipts and typing indicators like WhatsApp.', 3, 'feature', 'open', NOW() - INTERVAL '1 week'),
(6, 'Excellent platform! Made ₹50,000 selling my old electronics. Thank you MobileHub!', 5, 'general', 'reviewed', NOW() - INTERVAL '2 weeks'),
(7, 'Location detection is not accurate. Shows me posts from other cities.', 2, 'bug', 'resolved', NOW() - INTERVAL '10 days'),
(8, 'Would love to see a video option for product listings. Photos are not enough sometimes.', 4, 'feature', 'open', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- ===========================================
-- STEP 7: ADD SAMPLE USER LOCATIONS
-- ===========================================
INSERT INTO user_locations (user_id, latitude, longitude, accuracy, city, country, permission_status, created_at) VALUES
(1, 17.4123, 78.4401, 10.5, 'Hyderabad', 'India', 'granted', NOW() - INTERVAL '1 hour'),
(2, 19.1136, 72.8697, 15.2, 'Mumbai', 'India', 'granted', NOW() - INTERVAL '2 hours'),
(3, 28.6315, 77.2167, 8.3, 'Delhi', 'India', 'granted', NOW() - INTERVAL '30 minutes'),
(4, 12.9352, 77.6245, 12.1, 'Bangalore', 'India', 'granted', NOW() - INTERVAL '45 minutes'),
(5, 13.0382, 80.2332, 20.0, 'Chennai', 'India', 'granted', NOW() - INTERVAL '3 hours'),
(6, 22.5726, 88.3639, 18.5, 'Kolkata', 'India', 'granted', NOW() - INTERVAL '4 hours'),
(7, 18.5074, 73.9428, 14.0, 'Pune', 'India', 'granted', NOW() - INTERVAL '5 hours'),
(8, 23.0225, 72.5714, 11.3, 'Ahmedabad', 'India', 'granted', NOW() - INTERVAL '6 hours'),
(9, 26.9124, 75.7873, 16.8, 'Jaipur', 'India', 'granted', NOW() - INTERVAL '7 hours'),
(10, 9.9312, 76.2673, 22.1, 'Kochi', 'India', 'granted', NOW() - INTERVAL '8 hours')
ON CONFLICT DO NOTHING;

-- ===========================================
-- STEP 8: ADD CHANNELS/GROUPS
-- ===========================================
INSERT INTO channels (name, description, owner_id, is_public, member_count, created_at) VALUES
('Hyderabad Tech Deals', 'Best tech deals in Hyderabad. Post your electronics, mobiles, and gadgets here!', 1, true, 234, NOW() - INTERVAL '3 months'),
('Mumbai Premium Mobiles', 'Buy and sell premium smartphones in Mumbai. Verified sellers only.', 2, true, 567, NOW() - INTERVAL '2 months'),
('Delhi NCR Furniture Exchange', 'Furniture deals in Delhi, Noida, Gurgaon. Quality items at great prices.', 3, true, 189, NOW() - INTERVAL '1 month'),
('Bangalore Bikers Club', 'Royal Enfield, KTM, Yamaha and more! Accessories and gear also available.', 10, true, 456, NOW() - INTERVAL '4 months'),
('Pan India Rare Books', 'Academic, vintage, and rare books from across India. Collectors welcome!', 14, true, 123, NOW() - INTERVAL '2 months')
ON CONFLICT DO NOTHING;

-- ===========================================
-- STEP 9: UPDATE USER RATINGS (CALCULATED FROM REVIEWS)
-- ===========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

UPDATE users u SET rating = (
  SELECT COALESCE(AVG(r.rating), 0) 
  FROM reviews r 
  WHERE r.reviewee_id = u.user_id
);

-- ===========================================
-- VERIFICATION
-- ===========================================
SELECT '✅ SAMPLE DATA LOADED SUCCESSFULLY!' as status;
SELECT 'Users with profiles: ' || COUNT(*) FROM users;
SELECT 'Posts with descriptions: ' || COUNT(*) FROM posts WHERE description IS NOT NULL AND description != '';
SELECT 'Transactions: ' || COUNT(*) FROM transactions;
SELECT 'Reviews: ' || COUNT(*) FROM reviews;
SELECT 'Buyer Inquiries: ' || COUNT(*) FROM buyer_inquiries;
SELECT 'Feedback entries: ' || COUNT(*) FROM feedback;
SELECT 'User locations: ' || COUNT(*) FROM user_locations;
SELECT 'Channels: ' || COUNT(*) FROM channels;

-- ===========================================
-- ENHANCEMENT SUGGESTIONS (Comments)
-- ===========================================
/*
🚀 RECOMMENDED ENHANCEMENTS FOR MHUB:

1. WISHLIST TABLE (High Priority)
   CREATE TABLE wishlists (
     wishlist_id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(user_id),
     post_id INTEGER REFERENCES posts(post_id),
     created_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(user_id, post_id)
   );

2. CHAT/MESSAGING TABLE (High Priority)
   CREATE TABLE chat_messages (
     message_id SERIAL PRIMARY KEY,
     sender_id INTEGER REFERENCES users(user_id),
     receiver_id INTEGER REFERENCES users(user_id),
     post_id INTEGER REFERENCES posts(post_id),
     message TEXT,
     is_read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );

3. RECENTLY VIEWED TABLE
   CREATE TABLE recently_viewed (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(user_id),
     post_id INTEGER REFERENCES posts(post_id),
     viewed_at TIMESTAMP DEFAULT NOW()
   );

4. SAVED SEARCHES TABLE
   CREATE TABLE saved_searches (
     search_id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(user_id),
     search_query VARCHAR(255),
     filters JSONB,
     notification_enabled BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT NOW()
   );

5. PRICE HISTORY TABLE (For price drop alerts)
   CREATE TABLE price_history (
     id SERIAL PRIMARY KEY,
     post_id INTEGER REFERENCES posts(post_id),
     old_price DECIMAL(12,2),
     new_price DECIMAL(12,2),
     changed_at TIMESTAMP DEFAULT NOW()
   );

6. REPORTS TABLE (For flagging inappropriate content)
   CREATE TABLE reports (
     report_id SERIAL PRIMARY KEY,
     reporter_id INTEGER REFERENCES users(user_id),
     reported_user_id INTEGER REFERENCES users(user_id),
     reported_post_id INTEGER REFERENCES posts(post_id),
     reason VARCHAR(100),
     description TEXT,
     status VARCHAR(20) DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW()
   );

7. PROMOTED POSTS TABLE (For monetization)
   CREATE TABLE promoted_posts (
     promotion_id SERIAL PRIMARY KEY,
     post_id INTEGER REFERENCES posts(post_id),
     user_id INTEGER REFERENCES users(user_id),
     promotion_type VARCHAR(50),
     start_date TIMESTAMP,
     end_date TIMESTAMP,
     amount_paid DECIMAL(10,2),
     views_earned INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );

8. USER VERIFICATION TABLE
   CREATE TABLE user_verifications (
     verification_id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(user_id),
     verification_type VARCHAR(50), -- 'email', 'phone', 'aadhaar', 'pan'
     verified_value VARCHAR(255),
     is_verified BOOLEAN DEFAULT FALSE,
     verified_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

9. PUSH NOTIFICATION TOKENS TABLE
   CREATE TABLE push_tokens (
     token_id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(user_id),
     device_token VARCHAR(500),
     device_type VARCHAR(20), -- 'ios', 'android', 'web'
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT NOW()
   );

10. OFFER/NEGOTIATION TABLE
    CREATE TABLE offers (
      offer_id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(post_id),
      buyer_id INTEGER REFERENCES users(user_id),
      seller_id INTEGER REFERENCES users(user_id),
      offered_price DECIMAL(12,2),
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'countered'
      counter_price DECIMAL(12,2),
      message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

📱 UI/UX ENHANCEMENTS:
- Add image gallery/carousel for posts
- Implement infinite scroll on All Posts
- Add pull-to-refresh on mobile
- Implement skeleton loading states
- Add price negotiation flow
- Create seller verification badges
- Implement video uploads for posts
- Add share to social media buttons
- Create comparison feature for similar products
- Add voice search capability

🔒 SECURITY ENHANCEMENTS:
- Two-factor authentication
- Login attempt tracking
- Session management
- Encrypted messaging
- Fraud detection system
- Suspicious activity alerts
*/
