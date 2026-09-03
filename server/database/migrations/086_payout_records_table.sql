-- Migration: Create payout_records table for bank account transfers
-- Supports the PayoutScreen bank payout redemption flow

CREATE TABLE IF NOT EXISTS payout_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(5) DEFAULT 'INR',
    account_holder_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    transaction_ref VARCHAR(100),
    failure_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payout_records_user_id ON payout_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_records_status ON payout_records(status);
CREATE INDEX IF NOT EXISTS idx_payout_records_created_at ON payout_records(created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_payout_records_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payout_records_updated ON payout_records;
CREATE TRIGGER trg_payout_records_updated
    BEFORE UPDATE ON payout_records
    FOR EACH ROW
    EXECUTE FUNCTION update_payout_records_timestamp();
