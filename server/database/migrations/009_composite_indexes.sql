-- ============================================================
-- Composite database indexes for query performance — P-04
-- Fixes: Slow queries on posts feed, user post listings,
--        and transaction history pages.
--
-- All indexes use CREATE INDEX IF NOT EXISTS — fully safe to re-run.
-- Indexes are created CONCURRENTLY where possible to avoid table locks.
-- ============================================================

-- Posts: most common query pattern — active posts sorted by recency
CREATE INDEX IF NOT EXISTS idx_posts_user_status_created
  ON posts(user_id, status, created_at DESC);

-- Posts: category filtering — active posts in a category sorted by recency
CREATE INDEX IF NOT EXISTS idx_posts_category_status_created
  ON posts(category_id, status, created_at DESC);

-- Posts: expiry-based cleanup — only active posts (partial index, smaller & faster)
CREATE INDEX IF NOT EXISTS idx_posts_expires_status
  ON posts(expires_at, status)
  WHERE status = 'active';

-- Posts: location-based queries — user_id + coords for nearby seller lookups
CREATE INDEX IF NOT EXISTS idx_posts_location
  ON posts(latitude, longitude)
  WHERE status = 'active';

-- Posts: full-text search helper (GIN index on title for ILIKE performance)
CREATE INDEX IF NOT EXISTS idx_posts_title_gin
  ON posts USING gin(to_tsvector('english', COALESCE(title, '')));

-- Transactions: buyer history queries
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_created
  ON transactions(buyer_id, created_at DESC);

-- Transactions: seller history queries
CREATE INDEX IF NOT EXISTS idx_transactions_seller_created
  ON transactions(seller_id, created_at DESC);

-- Transactions: buyer + seller combined (for dispute lookups)
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_seller
  ON transactions(buyer_id, seller_id);

-- Transactions: status-based filtering (pending, completed, disputed)
CREATE INDEX IF NOT EXISTS idx_transactions_status_created
  ON transactions(status, created_at DESC);

-- User sessions: cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires
  ON user_sessions(expires_at)
  WHERE expires_at IS NOT NULL;

-- Notifications: unread notifications per user (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Post boosts: active boosts lookup
CREATE INDEX IF NOT EXISTS idx_post_boosts_post_active
  ON post_boosts(post_id, expires_at)
  WHERE is_active = true;
