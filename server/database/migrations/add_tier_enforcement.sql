-- Protocol: Value Hierarchy - Tier Enforcement System
-- The Defender's Strategy: Make Premium feel like "God Mode"

-- 1. Upgrade Users Table for Tiers
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic', -- 'basic', 'silver', 'premium'
ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS post_credits INT DEFAULT 1; -- For Basic tier (1 credit = 1 post, start with 1 free)

-- 2. Upgrade Posts Table for Expiry and Visibility Priority
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS tier_priority INT DEFAULT 1; -- 1=Basic, 2=Silver, 3=Premium

-- 3. Create Index for Priority-Based Feed Sorting
CREATE INDEX IF NOT EXISTS idx_posts_tier_priority ON posts(tier_priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expires_active ON posts(expires_at) WHERE status = 'active';

-- 4. Create View for Active Posts (Self-Healing - Expired Posts Hidden)
CREATE OR REPLACE VIEW active_posts AS
SELECT * FROM posts 
WHERE (expires_at IS NULL OR expires_at > NOW())
AND status = 'active';

-- 5. Create View for Premium-Priority Feed
CREATE OR REPLACE VIEW priority_feed AS
SELECT * FROM posts 
WHERE (expires_at IS NULL OR expires_at > NOW())
AND status = 'active'
ORDER BY tier_priority DESC, created_at DESC;

-- 6. Add Tier Rules Reference Table (for admin/backend reference)
CREATE TABLE IF NOT EXISTS tier_rules (
    tier_name VARCHAR(20) PRIMARY KEY,
    visibility_days INT NOT NULL,
    daily_limit INT NOT NULL,
    priority INT NOT NULL,
    price_inr DECIMAL(10,2) NOT NULL,
    duration_months INT,
    description TEXT
);

-- Insert Tier Rules
INSERT INTO tier_rules (tier_name, visibility_days, daily_limit, priority, price_inr, duration_months, description)
VALUES 
    ('basic', 15, 0, 1, 49, NULL, 'Pay-per-post. 1 credit = 1 post.'),
    ('silver', 25, 1, 2, 499, 6, 'Semi-Pro. 1 post/day for 6 months.'),
    ('premium', 45, 9999, 3, 999, 12, 'God Mode. Unlimited posts, top priority.')
ON CONFLICT (tier_name) DO UPDATE SET
    visibility_days = EXCLUDED.visibility_days,
    daily_limit = EXCLUDED.daily_limit,
    priority = EXCLUDED.priority,
    price_inr = EXCLUDED.price_inr;

COMMENT ON TABLE tier_rules IS 'Protocol: Value Hierarchy - Tier enforcement rules';
