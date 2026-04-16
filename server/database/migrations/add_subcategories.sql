-- ============================================================
-- Migration: Add Subcategories System
-- Description: Creates subcategories table and links to posts
-- ============================================================

-- SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS subcategories (
    subcategory_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active ON subcategories(is_active);

-- Add subcategory_id to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_subcategory ON posts(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_subcategory ON posts(category_id, subcategory_id);

-- ============================================================
-- Seed default subcategories for common categories
-- ============================================================

-- Electronics subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Mobiles', 1), ('Laptops', 2), ('Tablets', 3), 
    ('Accessories', 4), ('Cameras', 5), ('Audio', 6),
    ('Gaming', 7), ('Wearables', 8)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'electronics'
ON CONFLICT (category_id, name) DO NOTHING;

-- Vehicles subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Cars', 1), ('Bikes', 2), ('Trucks', 3), 
    ('Scooters', 4), ('Bicycles', 5), ('Auto Parts', 6)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'vehicles'
ON CONFLICT (category_id, name) DO NOTHING;

-- Real Estate subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Houses', 1), ('Flats', 2), ('Lands', 3), 
    ('Commercial', 4), ('PG / Hostels', 5), ('Rentals', 6)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'real estate'
ON CONFLICT (category_id, name) DO NOTHING;

-- Jobs subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('IT Jobs', 1), ('Part Time', 2), ('Full Time', 3), 
    ('Freelance', 4), ('Internship', 5), ('Work From Home', 6)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'jobs'
ON CONFLICT (category_id, name) DO NOTHING;

-- Services subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Electrician', 1), ('Plumber', 2), ('Carpenter', 3), 
    ('Cleaning', 4), ('Tutoring', 5), ('Repair', 6),
    ('Delivery', 7), ('Beauty', 8)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'services'
ON CONFLICT (category_id, name) DO NOTHING;

-- Fashion subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Men', 1), ('Women', 2), ('Kids', 3), 
    ('Footwear', 4), ('Bags', 5), ('Jewellery', 6)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'fashion'
ON CONFLICT (category_id, name) DO NOTHING;

-- Home subcategories
INSERT INTO subcategories (category_id, name, display_order) 
SELECT c.category_id, sub.name, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Furniture', 1), ('Kitchen', 2), ('Decor', 3), 
    ('Appliances', 4), ('Garden', 5), ('Storage', 6)
) AS sub(name, ord)
WHERE LOWER(c.name) = 'home'
ON CONFLICT (category_id, name) DO NOTHING;
