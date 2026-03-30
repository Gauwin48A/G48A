-- =============================================
-- Migration: Add Login Attempt Tracking Columns
-- Safe to run multiple times (idempotent)
-- =============================================

DO $$
BEGIN
    -- Add login_attempts column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'login_attempts'
    ) THEN
        ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added login_attempts column to users table';
    ELSE
        RAISE NOTICE 'login_attempts column already exists';
    END IF;
    
    -- Add lock_until column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'lock_until'
    ) THEN
        ALTER TABLE users ADD COLUMN lock_until TIMESTAMP;
        RAISE NOTICE 'Added lock_until column to users table';
    ELSE
        RAISE NOTICE 'lock_until column already exists';
    END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('login_attempts', 'lock_until');
