-- 01_schema.sql
-- This script creates the database schema for the application.

-- Categories Table: Stores different post categories
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Tiers Table: Stores different pricing tiers for posts
CREATE TABLE IF NOT EXISTS tiers (
    tier_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT
);

-- Users Table: Stores user information
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.0, -- Added user rating
    referral_code VARCHAR(10) UNIQUE,
    referred_by INT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferred_language VARCHAR(10) DEFAULT 'en', -- Added preferred language
    role VARCHAR(20) DEFAULT 'normal' -- normal, premium, content_creator
);

-- Posts Table: Stores user-created posts
CREATE TABLE IF NOT EXISTS posts (
    post_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    category_id INT REFERENCES categories(category_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    post_type VARCHAR(10) DEFAULT 'text', -- 'text' or 'media'
    media_url VARCHAR(255),
    channel_id INT REFERENCES channels(channel_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post Images Table: Stores multiple images for each post
CREATE TABLE IF NOT EXISTS post_images (
    image_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL
);

-- Sales Table: Tracks the sale of each post
CREATE TABLE IF NOT EXISTS sales (
    sale_id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(post_id),
    buyer_id INT REFERENCES users(user_id),
    sale_status VARCHAR(20) NOT NULL, -- e.g., 'pending', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sale Transitions Table: Logs changes in sale status
CREATE TABLE IF NOT EXISTS sale_transitions (
    transition_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INT REFERENCES users(user_id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reward Log Table: Stores a log of all rewards earned by users
CREATE TABLE IF NOT EXISTS reward_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    points INT NOT NULL,
    reason VARCHAR(50) NOT NULL, -- e.g., 'post_creation', 'direct_referral', 'indirect_referral'
    related_user_id INT REFERENCES users(user_id), -- e.g., the user who was referred
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channels Table: For user-created channels/pages (premium only)
CREATE TABLE IF NOT EXISTS channels (
    channel_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    bio TEXT,
    profile_pic VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_channels_user_id ON channels(user_id);

-- Channel Followers Table: Users following channels
CREATE TABLE IF NOT EXISTS channel_followers (
    id SERIAL PRIMARY KEY,
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_channel_followers_user_id ON channel_followers(user_id);

-- Index for faster lookups on foreign keys
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_sales_post_id ON sales(post_id);
CREATE INDEX idx_sales_buyer_id ON sales(buyer_id);
CREATE INDEX idx_sale_transitions_sale_id ON sale_transitions(sale_id);
CREATE INDEX idx_reward_log_user_id ON reward_log(user_id);