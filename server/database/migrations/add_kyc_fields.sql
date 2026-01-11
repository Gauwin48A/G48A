-- =============================================================
-- KYC FIELDS MIGRATION
-- =============================================================

-- Add columns to users table for KYC tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}'; -- { front: url, back: url }
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Ensure aadhaar_status exists (from zero_trust, but safe to repeat IF NOT EXISTS logic isn't standard in ALTER COLUMN)
-- We check if column exists first usually, but pure SQL requires a block for that.
-- Easier to use a DO block.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='aadhaar_status') THEN
        ALTER TABLE users ADD COLUMN aadhaar_status VARCHAR(20) DEFAULT 'PENDING';
    END IF;
END $$;
