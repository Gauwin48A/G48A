-- FULL DATABASE SETUP: DDL, DML, INDEXES, PROCEDURES, VALIDATIONS

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone VARCHAR(15) UNIQUE,
    address TEXT,
    avatar_url TEXT,
    bio TEXT,
    banner_url TEXT,
    CONSTRAINT fk_profiles_user FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon_url TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- POSTS TABLE
CREATE TABLE IF NOT EXISTS posts (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price > 0),
    status VARCHAR(20) DEFAULT 'active',
    posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location TEXT,
    image TEXT,
    original_price NUMERIC(12,2),
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    inquiries INTEGER DEFAULT 0,
    buyer_id INTEGER REFERENCES users(id),
    sale_date TIMESTAMP,
    purchase_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shares INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id),
    seller_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_post_id ON transactions(post_id);

-- REWARDS TABLE
CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);

-- FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- AUDIT TABLE
CREATE TABLE IF NOT EXISTS audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    event_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TIERS TABLE (for /api/tiers)
CREATE TABLE IF NOT EXISTS tiers (
    id SERIAL PRIMARY KEY,
    key VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    icon VARCHAR(50),
    maxImages INTEGER DEFAULT 1,
    tier_order INTEGER DEFAULT 1
);

-- Sample data for tiers
INSERT INTO tiers (key, name, color, icon, maxImages, tier_order) VALUES
('basic', 'Basic', 'bg-gray-400', 'Shield', 1, 1),
('silver', 'Silver', 'bg-blue-400', 'Star', 3, 2),
('gold', 'Gold', 'bg-yellow-400', 'Crown', 5, 3)
ON CONFLICT (key) DO NOTHING;

-- BRANDS TABLE (for /api/brands)
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Sample data for brands
INSERT INTO brands (name) VALUES
('Apple'), ('Samsung'), ('OnePlus'), ('Xiaomi'), ('Google'), ('OPPO'), ('Vivo'), ('Realme'), ('Other')
ON CONFLICT DO NOTHING;

-- DML: INSERT SCRIPTS FOR ALL FEATURES

-- Users
INSERT INTO users (username, email, password) VALUES
('alice', 'alice@example.com', 'hashedpassword1'),
('bob', 'bob@example.com', 'hashedpassword2')
ON CONFLICT DO NOTHING;

-- Profiles
INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio) VALUES
(1, 'Alice Smith', '9999999999', 'Delhi', '/uploads/avatars/alice.png', 'Seller'),
(2, 'Bob Jones', '8888888888', 'Mumbai', '/uploads/avatars/bob.png', 'Buyer')
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (name, icon_url) VALUES
('Electronics', '/uploads/icons/electronics.svg'),
('Fashion', '/uploads/icons/fashion.svg'),
('Home', '/uploads/icons/home.svg'),
('Mobile', '/uploads/icons/mobile.svg')
ON CONFLICT DO NOTHING;

-- Posts (active, sold, bought, all cases)
INSERT INTO posts (user_id, category_id, title, description, price, status, location, image, original_price)
VALUES
(1, 1, 'Active Post', 'Good condition bicycle', 3000.00, 'active', 'Delhi', '/uploads/products/img1.jpg', 3500.00),
(1, 1, 'Sold Post', 'Used laptop', 25000.00, 'sold', 'Mumbai', '/uploads/products/img2.jpg', 30000.00),
(2, 2, 'Bought Post', 'Fashionable dress', 1500.00, 'bought', 'Delhi', '/uploads/products/img3.jpg', 2000.00)
ON CONFLICT DO NOTHING;

-- Transactions
INSERT INTO transactions (post_id, buyer_id, seller_id, status, amount) VALUES
(2, 2, 1, 'completed', 25000.00)
ON CONFLICT DO NOTHING;

-- Rewards
INSERT INTO rewards (user_id, points, tier) VALUES
(1, 100, 'gold'),
(2, 50, 'silver')
ON CONFLICT DO NOTHING;

-- Feedback
INSERT INTO feedback (user_id, message, rating) VALUES
(1, 'Great platform!', 5),
(2, 'Easy to use.', 4)
ON CONFLICT DO NOTHING;

-- Complaints
INSERT INTO complaints (user_id, post_id, message, status) VALUES
(2, 1, 'Item not as described', 'open')
ON CONFLICT DO NOTHING;

-- Notifications
INSERT INTO notifications (user_id, message) VALUES
(1, 'Your post was sold!'),
(2, 'You have a new message.')
ON CONFLICT DO NOTHING;

-- STORED PROCEDURES & VALIDATIONS

-- Procedure: Fetch all posts (with filters)
CREATE OR REPLACE FUNCTION fetch_posts(
    p_user_id INTEGER DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_category_id INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
    post_id INTEGER,
    user_id INTEGER,
    category_id INTEGER,
    title TEXT,
    description TEXT,
    price NUMERIC,
    status VARCHAR,
    posted_date TIMESTAMP,
    location TEXT,
    image TEXT,
    original_price NUMERIC,
    views INTEGER,
    likes INTEGER,
    inquiries INTEGER,
    buyer_id INTEGER,
    sale_date TIMESTAMP,
    purchase_date TIMESTAMP,
    created_at TIMESTAMP,
    shares INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM posts
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND (p_status IS NULL OR status = p_status)
      AND (p_category_id IS NULL OR category_id = p_category_id)
    ORDER BY posted_date DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Validate user login
CREATE OR REPLACE FUNCTION validate_login(p_username VARCHAR, p_password VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_record users%ROWTYPE;
BEGIN
    SELECT * INTO user_record FROM users WHERE username = p_username;
    IF user_record.password = p_password THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add more procedures for feedback, rewards, complaints, etc. as needed

-- Example: Validate feedback rating
ALTER TABLE feedback ADD CONSTRAINT chk_feedback_rating CHECK (rating >= 1 AND rating <= 5);

-- Example: Validate phone number format (simple)
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_phone CHECK (phone ~ '^\d{10}$');

-- Add more constraints, triggers, and indexes as needed for real-world use

-- Audit Table Triggers
CREATE OR REPLACE FUNCTION audit_insert_trigger() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit (user_id, latitude, longitude, event_type, created_at)
  VALUES (NEW.user_id, NULL, NULL, TG_TABLE_NAME || '_insert', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_insert AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION audit_insert_trigger();
CREATE TRIGGER posts_audit_insert AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION audit_insert_trigger();
CREATE TRIGGER transactions_audit_insert AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION audit_insert_trigger();

-- AddPost Procedure (with validation)
CREATE OR REPLACE FUNCTION add_post(
  p_user_id INTEGER,
  p_category_id INTEGER,
  p_title TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_status VARCHAR,
  p_location TEXT,
  p_image TEXT,
  p_original_price NUMERIC
) RETURNS INTEGER AS $$
DECLARE
  new_post_id INTEGER;
BEGIN
  IF p_title IS NULL OR LENGTH(p_title) < 5 OR LENGTH(p_title) > 100 THEN
    RAISE EXCEPTION 'Title must be 5-100 chars';
  END IF;
  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'Price must be positive';
  END IF;
  INSERT INTO posts (user_id, category_id, title, description, price, status, location, image, original_price)
  VALUES (p_user_id, p_category_id, p_title, p_description, p_price, p_status, p_location, p_image, p_original_price)
  RETURNING post_id INTO new_post_id;
  RETURN new_post_id;
END;
$$ LANGUAGE plpgsql;

-- SaleDone/Undone Procedures
CREATE OR REPLACE FUNCTION mark_sale_done(p_post_id INTEGER, p_buyer_id INTEGER, p_amount NUMERIC) RETURNS VOID AS $$
BEGIN
  UPDATE posts SET status = 'sold', buyer_id = p_buyer_id, sale_date = NOW() WHERE post_id = p_post_id;
  INSERT INTO transactions (post_id, buyer_id, seller_id, status, amount) VALUES (p_post_id, p_buyer_id, (SELECT user_id FROM posts WHERE post_id = p_post_id), 'done', p_amount);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_sale_undone(p_post_id INTEGER) RETURNS VOID AS $$
BEGIN
  UPDATE posts SET status = 'undone' WHERE post_id = p_post_id;
  INSERT INTO transactions (post_id, buyer_id, seller_id, status, amount) VALUES (p_post_id, NULL, (SELECT user_id FROM posts WHERE post_id = p_post_id), 'undone', 0);
END;
$$ LANGUAGE plpgsql;

-- Profile Update Procedure
CREATE OR REPLACE FUNCTION update_profile_banner(p_user_id INTEGER, p_banner_url TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET banner_url = p_banner_url WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Recommendations Procedure
CREATE OR REPLACE FUNCTION fetch_recommendations(p_user_id INTEGER) RETURNS TABLE(post_id INTEGER, title TEXT, price NUMERIC, category_id INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT p.post_id, p.title, p.price, p.category_id
  FROM posts p
  JOIN preferences pr ON p.category_id = (SELECT id FROM categories WHERE name = pr.category)
  WHERE pr.user_id = p_user_id AND p.status = 'active' AND p.price BETWEEN pr.min_price AND pr.max_price
  ORDER BY p.posted_date DESC;
END;
$$ LANGUAGE plpgsql;
