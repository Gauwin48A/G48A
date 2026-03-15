-- Phase 4G: Coin Economy
-- Coin transaction ledger for earn/spend tracking

CREATE TABLE IF NOT EXISTS coin_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  amount DECIMAL(10,2) NOT NULL,       -- positive=earn, negative=spend
  type VARCHAR(30) NOT NULL,           -- 'welcome_bonus','post','sale','purchase','referral_l1','referral_l2','referral_l3','redeem_boost','redeem_featured','redeem_spotlight'
  reference_id TEXT,                   -- idempotency key
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_user ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_reference ON coin_transactions(reference_id);

-- Add coins column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins DECIMAL(10,2) DEFAULT 0;
