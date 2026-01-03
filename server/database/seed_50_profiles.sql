-- =====================================================
-- ADD MORE SELLER PROFILES FOR VARIETY
-- This script adds 50 seller profiles to ensure different
-- seller names appear on the posts page
-- =====================================================

-- Insert seller profiles (will update if exists)
INSERT INTO profiles (user_id, full_name, phone, bio, verified)
VALUES 
    (1, 'Rahul Sharma', '9876543210', 'Electronics specialist since 2018', true),
    (2, 'Vikram Electronics', '9876543211', 'Gold Seller - Premium electronics dealer', true),
    (3, 'Priya Investments', '9876543212', 'Furniture and home decor experts', true),
    (4, 'Sarla Devi', '9876543213', 'Fashion boutique owner', true),
    (5, 'Mohan Auto Mart', '9876543214', 'Certified pre-owned vehicles', true),
    (6, 'Deepak Books', '9876543215', 'Educational books and study materials', true),
    (7, 'Fitness Hub', '9876543216', 'Sports equipment and gym gear', true),
    (8, 'Kitchen Kingdom', '9876543217', 'Home appliances specialist', true),
    (9, 'Beauty Bazaar', '9876543218', 'Cosmetics and personal care', true),
    (10, 'Kids Corner', '9876543219', 'Toys and children products', true),
    (11, 'Tech Garage', '9876543220', 'Laptops and gaming accessories', true),
    (12, 'Mobile World', '9876543221', 'Latest smartphones and accessories', true),
    (13, 'Fashion Fiesta', '9876543222', 'Trendy clothing and footwear', true),
    (14, 'Home Comfort', '9876543223', 'Quality furniture at best prices', true),
    (15, 'Auto Zone', '9876543224', 'Two wheelers and bikes', true),
    (16, 'Book Worm', '9876543225', 'Novels and competitive exam books', true),
    (17, 'Sports Paradise', '9876543226', 'Cricket, football and badminton gear', true),
    (18, 'Appliance Hub', '9876543227', 'AC, refrigerator and washing machines', true),
    (19, 'Glamour Zone', '9876543228', 'Premium beauty products', true),
    (20, 'Toy Land', '9876543229', 'Educational toys and games', true),
    (21, 'Gadget Store', '9876543230', 'Smart devices and wearables', true),
    (22, 'Phone Plaza', '9876543231', 'Budget to premium mobiles', true),
    (23, 'Style Studio', '9876543232', 'Designer wear collection', true),
    (24, 'Living Space', '9876543233', 'Modern furniture designs', true),
    (25, 'Ride Hub', '9876543234', 'Scooters and electric vehicles', true),
    (26, 'Study Materials', '9876543235', 'UPSC and competitive exams', true),
    (27, 'Game Zone', '9876543236', 'Gaming consoles and accessories', true),
    (28, 'Cool Appliances', '9876543237', 'Air coolers and water purifiers', true),
    (29, 'Skin Care Hub', '9876543238', 'Organic and herbal products', true),
    (30, 'Baby World', '9876543239', 'Baby care and maternity products', true),
    (31, 'Digital Dreams', '9876543240', 'Cameras and photography gear', true),
    (32, 'Smart Phones', '9876543241', 'Used and refurbished mobiles', true),
    (33, 'Ethnic Wear', '9876543242', 'Traditional Indian clothing', true),
    (34, 'Office Furniture', '9876543243', 'Ergonomic chairs and desks', true),
    (35, 'Bike Barn', '9876543244', 'Sports bikes and cruisers', true),
    (36, 'Academic Books', '9876543245', 'Engineering and medical books', true),
    (37, 'Cricket World', '9876543246', 'Bats, balls and protective gear', true),
    (38, 'Home Solutions', '9876543247', 'Kitchen and home appliances', true),
    (39, 'Perfume Palace', '9876543248', 'Fragrances and deodorants', true),
    (40, 'Learning Toys', '9876543249', 'STEM and educational toys', true),
    (41, 'Audio Visual', '9876543250', 'TVs, speakers and soundbars', true),
    (42, 'Phone Factory', '9876543251', 'All brands mobile phones', true),
    (43, 'Casual Wear', '9876543252', 'T-shirts, jeans and sneakers', true),
    (44, 'Sleep Well', '9876543253', 'Mattresses and bedding', true),
    (45, 'Car Corner', '9876543254', 'Used cars with warranty', true),
    (46, 'Fiction Hub', '9876543255', 'Novels and story books', true),
    (47, 'Gym Equipment', '9876543256', 'Dumbbells and workout gear', true),
    (48, 'Smart Home', '9876543257', 'IoT devices and smart appliances', true),
    (49, 'Wellness Store', '9876543258', 'Health and beauty products', true),
    (50, 'Play Corner', '9876543259', 'Indoor and outdoor games', true)
ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    bio = EXCLUDED.bio,
    verified = true;

-- Verify the profiles were added
SELECT 'Total Profiles:' as info, COUNT(*) as count FROM profiles;
SELECT full_name FROM profiles ORDER BY user_id LIMIT 20;
