CREATE TABLE IF NOT EXISTS user_streaks (
  user_id TEXT PRIMARY KEY,
  visit_streak INTEGER NOT NULL DEFAULT 0,
  post_streak INTEGER NOT NULL DEFAULT 0,
  last_visit_date DATE,
  last_post_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_streaks_updated_at_idx
  ON user_streaks (updated_at);

CREATE INDEX IF NOT EXISTS user_streaks_last_visit_idx
  ON user_streaks (last_visit_date);

CREATE INDEX IF NOT EXISTS user_streaks_last_post_idx
  ON user_streaks (last_post_date);
