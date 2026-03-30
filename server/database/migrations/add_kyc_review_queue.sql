-- KYC review queue for OCR confidence and decision routing.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS kyc_review_queue (
    queue_id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    aadhaar_number_masked TEXT,
    pan_number_masked TEXT,
    documents JSONB NOT NULL DEFAULT '{}'::jsonb,
    ocr_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
    risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    decision VARCHAR(32) NOT NULL,
    decision_reason TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kyc_review_queue_status_created
    ON kyc_review_queue(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kyc_review_queue_user_created
    ON kyc_review_queue(user_id, created_at DESC);
