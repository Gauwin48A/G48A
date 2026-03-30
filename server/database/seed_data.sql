-- =============================================================
-- MHUB REALISTIC SEED DATA (Human-Like Listings) - UUID Compatible
-- =============================================================

-- 1. Ensure Categories Exist
INSERT INTO categories (name, description, icon_url) VALUES 
('Electronics', 'Gadgets, phones, and peripherals', '📱'),
('Vehicles', 'Cars, bikes, and scooties', '🚗'),
('Properties', 'Rentals, plots, and houses', '🏠'),
('Furniture', 'Sofas, beds, and tables', '🪑'),
('Fashion', 'Clothes, shoes, and accessories', '👕'),
('Books', 'Textbooks, novels, and comics', '📚'),
('Services', 'Repairs, cleaning, and movers', '🛠️'),
('Jobs', 'Part-time and full-time roles', '💼'),
('Pets', 'Adoption and pet supplies', '🐶'),
('Others', 'Everything else', '📦')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Realistic Users (Merged Profile Data)
-- defender_schema.sql merged profiles into users table. No 'username' column, using 'full_name'.
INSERT INTO users (email, full_name, password_hash, tier, post_credits, bio, listing_location, role) VALUES
('arjun.tech@gmail.com', 'Arjun Reddy', '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', 'premium', 999, 'Tech enthusiast. I upgrade my gadgets every year.', 'Banjara Hills, Hyderabad', 'user'),
('priya.cars@yahoo.com', 'Priya Motors', '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', 'silver', 10, 'Verified used car dealer. All cars are inspected.', 'Madhapur, Hyderabad', 'seller'),
('rahul.student@college.edu', 'Rahul S.', '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', 'basic', 5, 'Student at IIIT. Selling books and dorm stuff.', 'Gachibowli, Hyderabad', 'user'),
('sneha.interiors@design.com', 'Sneha Designs', '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', 'basic', 5, 'Interior designer selling pre-loved furniture.', 'Manikonda, Hyderabad', 'user'),
('vikram.estates@realestate.in', 'Vikram Estates', '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', 'premium', 999, 'Premium property listings with no brokerage.', 'Financial District, Hyderabad', 'seller'),
('karthik.gamer@gmail.com', 'Karthik G.', '$2b$10$EpIxT.k5T.k5T.k5T.k5PO', 'basic', 2, 'Hardcore gamer. Selling stuff to buy PS6.', 'Kondapur, Hyderabad', 'user')
ON CONFLICT (email) DO NOTHING;

-- 3. Insert Realistic Posts
-- Using lat/long as per defender_schema.sql

-- A. Electronics (Arjun & Karthik)
INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'arjun.tech@gmail.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    'iPhone 14 Pro - Deep Purple - 128GB',
    'Selling my 1 year old iPhone 14 Pro. Battery health is at 92%. Always used with a case and screen guard, so not a single scratch. \n\nReason for selling: Upgrading to 15 Pro. \n\nComes with original box and unused charging cable. Price is slightly negotiable for serious buyers. Low ballers please stay away.',
    78500,
    'Banjara Hills, Road No 12',
    17.4126, 78.4399,
    '["https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=600", "https://images.unsplash.com/photo-1664478546384-d57ffe74a791?auto=format&fit=crop&w=600"]',
    'active',
    3, -- Premium
    NOW() - INTERVAL '4 hours',
    NOW() + INTERVAL '30 days';

INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'karthik.gamer@gmail.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    'PS5 Disc Edition + God of War Ragnarok',
    'PlayStation 5 Disc version. Bought it 6 months ago but hardly get time to play due to work. \n\nCondition is pristine. Controller has no stick drift. \n\nWill include God of War Ragnarok disc for free. Can test before buying at my place.',
    42000,
    'Kondapur near Google Office',
    17.4611, 78.3690,
    '["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=600"]',
    'active',
    1,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '14 days';

INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'arjun.tech@gmail.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    'Nothing Phone (2) - White - 12/256',
    'Used for 2 months as a secondary phone. Looks brand new. The Glyph interface is amazing. \n\nBill and Box available. Warranty valid till Oct 2025. \n\nFixed price.',
    32000,
    'Jubilee Hills Check Post',
    17.4290, 78.4110,
    '["https://images.unsplash.com/photo-1691238326262-43666d483868?auto=format&fit=crop&w=500"]',
    'active',
    3,
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '30 days';

-- B. Vehicles (Priya Motors & Rahul)
INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya.cars@yahoo.com'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    '2021 Hyundai Creta SX Diesel Manual',
    'Single owner, Hyderabad registered. \n\n- Odometer: 42,000 km\n- Insurance valid till Aug 2025\n- Tires: 80% life left\n- Comprehensive service history at Hyundai\n\nCar is in showroom condition. Financing available through HDFC and ICICI.',
    1325000,
    'Madhapur, Ayyappa Society',
    17.4483, 78.3915,
    '["https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600"]',
    'active',
    2, -- Silver
    NOW() - INTERVAL '5 hours',
    NOW() + INTERVAL '25 days';

INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul.student@college.edu'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    'Yamaha R15 V3 - Racing Blue (Urgent Sale)',
    '2019 Model. Moving abroad for masters so need to sell urgent. \n\nBike has minor scratches on the right fairing (parking fall), but engine is butter smooth. \n\nModified exhaust (generic Akrapovic) installed, but will give stock exhaust too.',
    95000,
    'Indira Nagar, Gachibowli',
    17.4390, 78.3500,
    '["https://images.unsplash.com/photo-1594956799553-6a56f5c87a55?auto=format&fit=crop&w=600"]',
    'active',
    1,
    NOW() - INTERVAL '6 hours',
    NOW() + INTERVAL '14 days';

-- C. Furniture (Sneha & Rahul)
INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha.interiors@design.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    'Teak Wood Dining Table (6 Seater)',
    'Solid teak wood table with glass top. Includes 6 cushioned chairs. \n\nMade by a local carpenter 5 years ago. Very heavy and durable quality. \n\nPolished recently. Selling because we are renovating the house.',
    28000,
    'Manikonda, Lanco Hills',
    17.4045, 78.3750,
    '["https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600"]',
    'active',
    1,
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '14 days';

INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul.student@college.edu'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    'Study Table and Office Chair Combo',
    'Basic engineered wood table (Amazon Solimo) and a revolving mesh chair. \n\nGood for WFH or students. \n\nTable has some water marks but structurally fine. Chair gas lift works perfectly.',
    4500,
    'Gachibowli DLF',
    17.4430, 78.3550,
    '["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600"]',
    'active',
    1,
    NOW() - INTERVAL '12 hours',
    NOW() + INTERVAL '14 days';

-- D. Properties (Vikram)
INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram.estates@realestate.in'),
    (SELECT category_id FROM categories WHERE name = 'Properties'),
    '3BHK Fully Furnished in My Home Avatar',
    'Available immediately for family/bachelors. \n\n- 1800 sft, West Facing\n- 15th Floor (Great view of ORR)\n- Modular Kitchen + Chimney\n- ACs in all bedrooms\n- 2 Car Parkings\n\nRent includes maintenance. Deposit 2 months.',
    55000,
    'Narsingi, ORR Service Road',
    17.3880, 78.3610,
    '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600"]',
    'active',
    3,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '30 days';

-- E. Others/Pets/Books
INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul.student@college.edu'),
    (SELECT category_id FROM categories WHERE name = 'Books'),
    'CAT Exam Preparation Books (Arun Sharma)',
    'Complete set of Quantitative Aptitude, LR/DI, and Verbal Ability. \n\n2023 Edition. Some pencil marks are there, but otherwise clean. \n\nWill throw in some mock test papers for free.',
    1200,
    'Kukatpally Housing Board',
    17.4950, 78.3970,
    '["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600"]',
    'active',
    1,
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '14 days';

INSERT INTO posts (user_id, category_id, title, description, price, location, lat, long, images, status, tier_priority, created_at, expires_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha.interiors@design.com'),
    (SELECT category_id FROM categories WHERE name = 'Pets'),
    'Golden Retriever Puppies for Adoption',
    'Home bred, very healthy and playful puppies. 45 days old. \n\nDewormed and first vaccination done. \n\nLooking for loving families only. Not for breeders. A small rehoming fee applies to ensure serious owners.',
    15000,
    'Jubilee Hills, Road 45',
    17.4260, 78.4050,
    '["https://images.unsplash.com/photo-1601979031925-424e53b6caaa?auto=format&fit=crop&w=600"]',
    'active',
    1,
    NOW() - INTERVAL '8 hours',
    NOW() + INTERVAL '14 days';
