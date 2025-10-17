-- 01_tables_and_alter.sql
-- All table creation and ALTER statements for the Mhub application

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    points INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reward Log
CREATE TABLE reward_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    points INT NOT NULL,
    reason VARCHAR(255),
    related_user_id INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channels
CREATE TABLE channels (
    channel_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    bio TEXT,
    profile_pic VARCHAR(255),
    category_id INT REFERENCES categories(category_id),
    logo_url VARCHAR(255),
    cover_url VARCHAR(255),
    contact_info VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE channels ADD CONSTRAINT unique_channel_name UNIQUE (name);

-- Channel Followers
CREATE TABLE channel_followers (
    id SERIAL PRIMARY KEY,
    channel_id INT REFERENCES channels(channel_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aadhaar Verification Logs
CREATE TABLE aadhaar_verification_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    request_id VARCHAR(100),
    request_type VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    action VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback
CREATE TABLE feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Dashboard Stats
CREATE TABLE user_dashboard_stats (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    posts_count INT DEFAULT 0,
    rewards_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    last_login TIMESTAMP
);

-- Preferences
CREATE TABLE preferences (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    theme VARCHAR(20) DEFAULT 'light'
);

-- Notifications
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints
CREATE TABLE complaints (
    complaint_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_channels_category_id ON channels(category_id);
CREATE INDEX idx_channels_status ON channels(status);
CREATE INDEX idx_channel_followers_user_id ON channel_followers(user_id);
CREATE INDEX idx_channel_followers_channel_id ON channel_followers(channel_id);
