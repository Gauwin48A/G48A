-- DDL: All table creation and indexes for Mhub

-- Categories
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT
);

-- Tiers
CREATE TABLE tiers (
    tier_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    description TEXT
);

-- Users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rating NUMERIC(3,2) DEFAULT 5.0,
    referral_code VARCHAR(10) UNIQUE,
    referred_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferred_language VARCHAR(10) DEFAULT 'en',
    role VARCHAR(20) DEFAULT 'normal',
    aadhaar_number_masked VARCHAR(20),
    aadhaar_encrypted VARCHAR(255),
    isAadhaarVerified BOOLEAN DEFAULT FALSE,
    verified_date TIMESTAMP
);

-- Profiles
CREATE TABLE profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE
);

-- Posts
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    category_id INT REFERENCES categories(category_id),
    tier_id INT REFERENCES tiers(tier_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2),
    original_price NUMERIC(10,2),
    condition VARCHAR(20),
    age VARCHAR(20),
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    views INT DEFAULT 0,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    post_type VARCHAR(20) DEFAULT 'image'
);

-- Post Images
CREATE TABLE post_images (
    image_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL
);

-- Sales
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id),
    buyer_id INT REFERENCES users(user_id),
    sale_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Transitions
CREATE TABLE sale_transitions (
    transition_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INT REFERENCES users(user_id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rewards
CREATE TABLE rewards (
    reward_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channels
CREATE TABLE channels (
    channel_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channel Members
CREATE TABLE channel_members (
    member_id SERIAL PRIMARY KEY,
    channel_id INT REFERENCES channels(channel_id),
    user_id INT REFERENCES users(user_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Translations (for i18n)
CREATE TABLE translations (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    field VARCHAR(100) NOT NULL,
    language VARCHAR(5) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX idx_translation_lookup ON translations(entity_type, entity_id, field, language);

-- Location table (Force Location Permission)
CREATE TABLE IF NOT EXISTS user_locations (
  id SERIAL PRIMARY KEY,
  user_id INT,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  accuracy DECIMAL(10, 2),
  altitude DECIMAL(10, 2),
  heading DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_created_at ON user_locations(created_at);
