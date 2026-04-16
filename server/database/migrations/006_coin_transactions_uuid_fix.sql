-- ============================================================================
-- Coin Transactions UUID Fix
-- Ensures coin_transactions.user_id uses UUID and references users(user_id).
-- ============================================================================

DO $$
DECLARE current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'coin_transactions'
    AND column_name = 'user_id';

  IF current_type IS NULL THEN
    CREATE TABLE IF NOT EXISTS coin_transactions (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id),
      amount DECIMAL(10,2) NOT NULL,
      type VARCHAR(30) NOT NULL,
      reference_id TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSIF current_type <> 'uuid' THEN
    BEGIN
      ALTER TABLE coin_transactions
        ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    EXCEPTION WHEN others THEN
      ALTER TABLE coin_transactions RENAME TO coin_transactions_legacy;
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(user_id),
        amount DECIMAL(10,2) NOT NULL,
        type VARCHAR(30) NOT NULL,
        reference_id TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      INSERT INTO coin_transactions (id, user_id, amount, type, reference_id, description, created_at)
      SELECT id,
             NULLIF(user_id::text, '')::uuid,
             amount, type, reference_id, description, created_at
      FROM coin_transactions_legacy
      WHERE user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coin_user ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_reference ON coin_transactions(reference_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS coins DECIMAL(10,2) DEFAULT 0;
