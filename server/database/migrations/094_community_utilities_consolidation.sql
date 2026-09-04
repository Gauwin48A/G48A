-- Migration 094: Community Channels, Social Wall, Creators & Utilities Consolidation
-- Hardens channels, channel_posts, channel_followers, notifications, and wishlist tables.

DO $$
BEGIN
    -- Channels table
    CREATE TABLE IF NOT EXISTS channels (
        channel_id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        description TEXT,
        category VARCHAR(60),
        banner_url TEXT,
        avatar_url TEXT,
        followers_count INTEGER DEFAULT 0,
        posts_count INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        is_private BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Channel posts
    CREATE TABLE IF NOT EXISTS channel_posts (
        post_id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES channels(channel_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media_urls JSONB DEFAULT '[]'::jsonb,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Channel followers
    CREATE TABLE IF NOT EXISTS channel_followers (
        follower_id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES channels(channel_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(channel_id, user_id)
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
        notification_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'INFO',
        route TEXT,
        data JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- Wishlist / Saved items table
    CREATE TABLE IF NOT EXISTS wishlist_items (
        wishlist_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, post_id)
    );

    -- Support tickets table
    CREATE TABLE IF NOT EXISTS support_tickets (
        ticket_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        subject VARCHAR(200) NOT NULL,
        category VARCHAR(80) DEFAULT 'GENERAL',
        description TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'OPEN',
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created ON channel_posts (channel_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_channel_followers_user ON channel_followers (user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user_post ON wishlist_items (user_id, post_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id, created_at DESC);

END $$;
