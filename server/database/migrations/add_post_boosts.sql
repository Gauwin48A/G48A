-- Post Boosts Table: tracks individual listing boost/featured/spotlight purchases
CREATE TABLE IF NOT EXISTS post_boosts (
    boost_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    boost_type TEXT NOT NULL CHECK (boost_type IN ('boost', 'featured', 'spotlight')),
    amount_inr DECIMAL(10,2) NOT NULL CHECK (amount_inr > 0),
    payment_reference TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_boosts_post ON post_boosts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_boosts_active ON post_boosts(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_post_boosts_user ON post_boosts(user_id);

-- Add boost_level to posts for quick priority lookup
ALTER TABLE posts ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0;
-- 0 = none, 1 = boost(49), 2 = featured(99), 3 = spotlight(199)

-- Update tier_priority to also factor boost_level in views
-- Search queries order by: GREATEST(tier_priority, 1) + boost_level DESC

-- Boost durations:
-- boost (₹49)     -> 7 days
-- featured (₹99)  -> 14 days
-- spotlight (₹199) -> 30 days

COMMENT ON TABLE post_boosts IS 'Tracks per-listing boost/featured/spotlight purchases';
