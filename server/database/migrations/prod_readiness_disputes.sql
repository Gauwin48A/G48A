-- =====================================================
-- Migration: Production Readiness - Dispute & Refund Support
-- Date: 2026-04-07
-- Purpose: Add refund/dispute columns to transactions table
-- =====================================================

-- Refund tracking
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL
  CHECK (refund_status IN (NULL, 'requested', 'approved', 'rejected', 'processed'));

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12, 2) DEFAULT NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_reason TEXT DEFAULT NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP DEFAULT NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP DEFAULT NULL;

-- Dispute tracking
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(20) DEFAULT NULL
  CHECK (dispute_status IN (NULL, 'open', 'under_review', 'resolved', 'dismissed'));

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dispute_reason TEXT DEFAULT NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dispute_opened_at TIMESTAMP DEFAULT NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMP DEFAULT NULL;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dispute_resolution TEXT DEFAULT NULL;

-- Index for dispute queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_dispute_status
  ON transactions(dispute_status) WHERE dispute_status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_refund_status
  ON transactions(refund_status) WHERE refund_status IS NOT NULL;
