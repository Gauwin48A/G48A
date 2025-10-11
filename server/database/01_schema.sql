-- 01_schema.sql
-- This script creates the database schema for the application.

-- Categories Table: Stores different post categories
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Tiers Table: Stores different pricing tiers for posts
CREATE TABLE tiers (
    tier_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT
);

-- Users Table: Stores user information
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.0, -- Added user rating
    referral_code VARCHAR(10) UNIQUE,
    referred_by INT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferred_language VARCHAR(10) DEFAULT 'en' -- Added preferred language
);

-- Posts Table: Stores user-created posts
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    category_id INT REFERENCES categories(category_id),
    tier_id INT REFERENCES tiers(tier_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2), -- Added for showing discounts
    condition VARCHAR(50), -- e.g., 'New', 'Used'
    age VARCHAR(50), -- e.g., '1 year old'
    location VARCHAR(255), -- Simple string location
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- e.g., 'active', 'sold', 'expired'
    views INT DEFAULT 0, -- Added view count
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(10) DEFAULT 'en' -- Added language support
);

-- Post Images Table: Stores multiple images for each post
CREATE TABLE post_images (
    image_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL
);

-- Sales Table: Tracks the sale of each post
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id),
    buyer_id INT REFERENCES users(user_id),
    sale_status VARCHAR(20) NOT NULL, -- e.g., 'pending', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sale Transitions Table: Logs changes in sale status
CREATE TABLE sale_transitions (
    transition_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INT REFERENCES users(user_id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reward Log Table: Stores a log of all rewards earned by users
CREATE TABLE reward_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    points INT NOT NULL,
    reason VARCHAR(50) NOT NULL, -- e.g., 'post_creation', 'direct_referral', 'indirect_referral'
    related_user_id INT REFERENCES users(user_id), -- e.g., the user who was referred
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feeds Table: Text-only posts for sharing news/content
CREATE TABLE feeds (
    feed_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(10) DEFAULT 'en' -- Added language support
);
CREATE INDEX idx_feeds_user_id ON feeds(user_id);
CREATE INDEX idx_feeds_created_at ON feeds(created_at);

-- Channels Table: For user-created channels/pages (premium only)
CREATE TABLE channels (
    channel_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_premium BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_channels_owner_id ON channels(owner_id);

-- Channel Followers Table: Users following channels
CREATE TABLE channel_followers (
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX idx_channel_followers_user_id ON channel_followers(user_id);

-- Channel Posts Table: Posts in channels (images, description, limited videos)
CREATE TABLE channel_posts (
    channel_post_id SERIAL PRIMARY KEY,
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    owner_id INT REFERENCES users(user_id),
    description TEXT NOT NULL,
    image_url VARCHAR(255),
    video_url VARCHAR(255), -- NULL if not a video post
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(10) DEFAULT 'en' -- Added language support
);
CREATE INDEX idx_channel_posts_channel_id ON channel_posts(channel_id);
CREATE INDEX idx_channel_posts_owner_id ON channel_posts(owner_id);
CREATE INDEX idx_channel_posts_created_at ON channel_posts(created_at);

-- Index for faster lookups on foreign keys
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_sales_post_id ON sales(post_id);
CREATE INDEX idx_sales_buyer_id ON sales(buyer_id);
CREATE INDEX idx_sale_transitions_sale_id ON sale_transitions(sale_id);
CREATE INDEX idx_reward_log_user_id ON reward_log(user_id);