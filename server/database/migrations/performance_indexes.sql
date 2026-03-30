-- =============================================================
-- PERFORMANCE INDEXES (Optimized for Speed)
-- =============================================================

-- 1. Posts: Category + Status (Compound Index)
-- Speeds up "Show me active electronics" queries
CREATE INDEX IF NOT EXISTS idx_posts_category_status 
ON posts(category_id, status) 
WHERE status = 'active';

-- 2. Posts: Price Range Scanning
-- Speeds up "Price: Low to High" and Range Filters
CREATE INDEX IF NOT EXISTS idx_posts_price 
ON posts(price);

-- 3. Posts: Chronological Feeds
-- Speeds up "Newest First" feeds
CREATE INDEX IF NOT EXISTS idx_posts_created_desc 
ON posts(created_at DESC);

-- 4. Users: Email Lookup (Case-Insensitive)
-- Speeds up Login and Registration checks
CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON users(lower(email));

-- 5. Audit Logs: User History
-- Speeds up Admin logic for looking up user activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(user_id);
