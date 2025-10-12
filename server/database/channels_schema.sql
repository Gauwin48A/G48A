-- Channels Table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id INT REFERENCES users(user_id),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    contact_email VARCHAR(100),
    contact_website VARCHAR(100),
    contact_phone VARCHAR(20),
    location VARCHAR(100),
    followers_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Channel Admins/Roles Table
CREATE TABLE IF NOT EXISTS channel_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'editor')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channel Followers Table
CREATE TABLE IF NOT EXISTS channel_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_channel_followers_user_id ON channel_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_followers_channel_id ON channel_followers(channel_id);

-- Channel Posts Table
CREATE TABLE IF NOT EXISTS channel_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    author_id INT REFERENCES users(user_id),
    content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('text', 'image', 'link')), -- video not allowed
    title VARCHAR(255),
    content TEXT,
    media_url TEXT,
    tags TEXT[],
    visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_id ON channel_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_posts_created_at ON channel_posts(created_at);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES channel_posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);

-- Post Comments Table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES channel_posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- Analytics Table
CREATE TABLE IF NOT EXISTS channel_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    metric VARCHAR(50),
    value INT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
