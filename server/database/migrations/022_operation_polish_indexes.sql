-- Operation Polish: targeted composite indexes for high-traffic queries
-- Safe to run multiple times (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_wishlists_user_post
  ON wishlists(user_id, post_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver
  ON messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON user_sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created
  ON feedback(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_log_user_action
  ON reward_log(user_id, action);

CREATE INDEX IF NOT EXISTS idx_offers_post_status
  ON offers(post_id, status);
