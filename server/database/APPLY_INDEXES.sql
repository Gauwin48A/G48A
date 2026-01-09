-- SCALE UP INDEXES
-- Run this to enable 100x query speed enhancement

-- 1. Full-Text Search Speed (GIN index)
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- 2. Composite Indexes from Production Checklist
CREATE INDEX IF NOT EXISTS idx_posts_category_status ON posts(category_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_posts_lat_long ON posts(latitude, longitude);

SELECT '✅ Scale-Up Indexes Applied Successfully' as status;
