INSERT INTO posts (user_id, category_id, title, description, price, status, location, latitude, longitude, images, tier_priority, views_count, likes, shares)
SELECT 
  u.user_id, c.category_id, t.title, t.description, t.price, 'active',
  'Mumbai, Maharashtra', 19.0760, 72.8777,
  '[]'::jsonb, 1,
  floor(random()*500)::int, floor(random()*50)::int, floor(random()*20)::int
FROM (VALUES
  ('iPhone 15 Pro Max 256GB', 'Brand new iPhone 15 Pro Max, Natural Titanium. Unused, sealed box.', 134999),
  ('Samsung Galaxy S24 Ultra', 'Samsung S24 Ultra 512GB, Titanium Gray. Perfect condition.', 129999),
  ('MacBook Air M3 2024', 'Apple MacBook Air 15-inch M3 chip, 16GB RAM, 512GB SSD.', 149999),
  ('Royal Enfield Classic 350', '2024 model, Chrome Red, only 2000km driven. Single owner.', 215000),
  ('iPhone 14 128GB', 'iPhone 14 in excellent condition with box and accessories.', 54999),
  ('Sony WH-1000XM5', 'Best noise cancelling headphones. Used for 3 months.', 24999),
  ('Dell XPS 15 Laptop', 'Intel i7, 32GB RAM, 1TB SSD, 4K OLED display.', 189999),
  ('Nintendo Switch OLED', 'White model with 3 games included. Perfect condition.', 27999),
  ('Canon EOS R6 Mark II', 'Professional camera body with RF 24-105mm lens kit.', 234999),
  ('LG 55-inch OLED TV', '2024 model, OLED evo C4 series. Smart TV with webOS.', 119999),
  ('Dyson V15 Detect', 'Cordless vacuum cleaner with laser dust detection.', 54999),
  ('Herman Miller Aeron Chair', 'Size B, fully loaded. Office ergonomic chair.', 89999)
) AS t(title, description, price)
CROSS JOIN (SELECT user_id FROM users ORDER BY random() LIMIT 1) u
CROSS JOIN (SELECT category_id FROM categories WHERE name='Electronics' LIMIT 1) c;

-- More posts across different categories and users
INSERT INTO posts (user_id, category_id, title, description, price, status, location, latitude, longitude, images, tier_priority, views_count, likes, shares)
SELECT 
  u.user_id, c.category_id, t.title, t.description, t.price, 'active',
  'Delhi, India', 28.6139, 77.2090,
  '[]'::jsonb, 1,
  floor(random()*300)::int, floor(random()*30)::int, floor(random()*10)::int
FROM (VALUES
  ('Levis 501 Original Jeans', 'Size 32, Dark Blue wash. Brand new with tags.', 4999),
  ('Nike Air Jordan 1 Retro', 'Size UK 9, Chicago colorway. Dead stock condition.', 18999),
  ('Gucci Marmont Bag', 'Small GG Marmont shoulder bag, Black leather.', 95000),
  ('Zara Leather Jacket', 'Mens size M, black biker style. Worn twice.', 7999),
  ('Ray-Ban Aviator Classic', 'Gold frame, green lens. Original with box.', 8999),
  ('Adidas Ultraboost 23', 'Running shoes, Core Black, Size UK 10.', 12999)
) AS t(title, description, price)
CROSS JOIN (SELECT user_id FROM users WHERE username='priya.patel' LIMIT 1) u
CROSS JOIN (SELECT category_id FROM categories WHERE name='Fashion' LIMIT 1) c;

-- Vehicles category
INSERT INTO posts (user_id, category_id, title, description, price, status, location, latitude, longitude, images, tier_priority, views_count, likes, shares)
SELECT 
  u.user_id, c.category_id, t.title, t.description, t.price, 'active',
  'Bangalore, Karnataka', 12.9716, 77.5946,
  '[]'::jsonb, 1,
  floor(random()*800)::int, floor(random()*80)::int, floor(random()*40)::int
FROM (VALUES
  ('Honda City 2023 VX CVT', 'Platinum White, 8000km, Full service history.', 1450000),
  ('Maruti Swift ZXI Plus', '2024 model, Sizzling Red, AMT, first owner.', 895000),
  ('TVS Apache RTR 200', '2023 model, Matte Blue, 5000km driven.', 145000),
  ('Hyundai Creta SX(O)', '2024 model, Abyss Black, 15000km, top variant.', 1750000)
) AS t(title, description, price)
CROSS JOIN (SELECT user_id FROM users WHERE username='amit.kumar' LIMIT 1) u
CROSS JOIN (SELECT category_id FROM categories WHERE name='Vehicles' LIMIT 1) c;

-- Profiles for users
INSERT INTO profiles (user_id, full_name, bio, avatar_url)
SELECT user_id, full_name, 'MHub marketplace seller', ''
FROM users 
ON CONFLICT DO NOTHING;
