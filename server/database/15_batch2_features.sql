-- =====================================================
-- BATCH 2 FEATURES: Messages, Offers, Saved Searches
-- Run after 00_master_setup.sql
-- =====================================================

-- 1. MESSAGES TABLE (Chat System)
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    sender_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'offer', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

-- 2. OFFERS TABLE (Price Negotiation)
CREATE TABLE IF NOT EXISTS offers (
    offer_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    offered_price DECIMAL(12,2) NOT NULL CHECK (offered_price > 0),
    original_price DECIMAL(12,2) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired')),
    counter_price DECIMAL(12,2),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_offers_post ON offers(post_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_seller ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);

-- 3. SAVED SEARCHES TABLE
CREATE TABLE IF NOT EXISTS saved_searches (
    search_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100),
    search_query TEXT,
    category_id INTEGER REFERENCES categories(category_id),
    location VARCHAR(100),
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    keywords TEXT[],
    notify_enabled BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- 4. PRICE HISTORY TABLE
CREATE TABLE IF NOT EXISTS price_history (
    history_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    old_price DECIMAL(12,2),
    new_price DECIMAL(12,2),
    changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_price_history_post ON price_history(post_id);

-- 5. SELLER ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS seller_analytics (
    analytics_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_views INTEGER DEFAULT 0,
    total_inquiries INTEGER DEFAULT 0,
    total_offers INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0, -- in minutes
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. VERIFICATION BADGES TABLE
CREATE TABLE IF NOT EXISTS verifications (
    verification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('identity', 'phone', 'email', 'address', 'premium', 'business')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    document_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, verification_type)
);

-- 7. ESCROW TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS escrow (
    escrow_id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(transaction_id),
    post_id INTEGER REFERENCES posts(post_id),
    buyer_id INTEGER NOT NULL REFERENCES users(user_id),
    seller_id INTEGER NOT NULL REFERENCES users(user_id),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
    release_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Sample data for testing
INSERT INTO messages (conversation_id, sender_id, receiver_id, post_id, content)
SELECT 
    'conv_1_2',
    1,
    2,
    (SELECT post_id FROM posts LIMIT 1),
    'Hi, is this item still available?'
WHERE EXISTS (SELECT 1 FROM users WHERE user_id = 1)
ON CONFLICT DO NOTHING;

INSERT INTO offers (post_id, buyer_id, seller_id, offered_price, original_price, message)
SELECT 
    p.post_id,
    2,
    p.user_id,
    p.price * 0.9,
    p.price,
    'Would you accept 10% off?'
FROM posts p WHERE p.user_id = 1 LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO saved_searches (user_id, name, location, min_price, max_price, keywords)
VALUES (1, 'Electronics in Hyderabad', 'Hyderabad', 5000, 50000, ARRAY['phone', 'laptop', 'tablet'])
ON CONFLICT DO NOTHING;

SELECT 'Batch 2 tables created successfully!' as status;
