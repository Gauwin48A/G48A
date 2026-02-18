-- ============================================================
-- MHub Migration: Pending Feature Columns
-- Run this script against your PostgreSQL database to add
-- the columns required by the new features implemented.
-- ============================================================

-- ── 1. Payments: retry tracking ──────────────────────────────
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS retry_count    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS promo_code     VARCHAR(20),
    ADD COLUMN IF NOT EXISTS discounted_amount NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- ── 2. Buyer Inquiries: spam flag + seller reply ──────────────
ALTER TABLE buyer_inquiries
    ADD COLUMN IF NOT EXISTS is_spam        BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS seller_reply   TEXT,
    ADD COLUMN IF NOT EXISTS reply_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Index for spam queries
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_is_spam ON buyer_inquiries(is_spam);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_phone   ON buyer_inquiries(phone);

-- ── 3. OTP Store: ensure table exists ────────────────────────
CREATE TABLE IF NOT EXISTS otp_store (
    id          SERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    otp_hash    VARCHAR(64) NOT NULL,
    purpose     VARCHAR(50) NOT NULL DEFAULT 'sale_confirm',
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INTEGER DEFAULT 0,
    is_used     BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_store_user_purpose ON otp_store(user_id, purpose, is_used);

-- ── 4. Complaints: auto_closed status support ────────────────
-- The status column should already accept arbitrary strings.
-- If it's an ENUM, add the new value:
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'complaint_status'
    ) THEN
        ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'auto_closed';
    END IF;
END $$;

-- ── 5. Notifications: new types ──────────────────────────────
-- If notification type is an ENUM, extend it:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'digest';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'security_alert';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'complaint_closed';
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'inquiry_reply';
    END IF;
END $$;

-- ── 6. Rewards: ensure tables exist ──────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
    id         SERIAL PRIMARY KEY,
    user_id    UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    points     INTEGER DEFAULT 0,
    tier       VARCHAR(20) DEFAULT 'Bronze',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_log (
    id          SERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action      VARCHAR(50) NOT NULL,
    points      INTEGER NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Users: referral columns ───────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES users(user_id);

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- ── Done ─────────────────────────────────────────────────────
SELECT 'Migration complete' AS status;
