-- 028_seller_payout_banking.sql
-- Adds payout fields to profiles table for seller bank account / UPI onboarding

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_upi_id VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_bank_details JSONB DEFAULT '{}'::jsonb;
