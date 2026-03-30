-- Reviews moderation completeness: seller response, flag/hide, abuse controls.
-- Safe to run multiple times.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_reason TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_by TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS abuse_score INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS review_helpful_votes (
    vote_id BIGSERIAL PRIMARY KEY,
    review_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (review_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review
    ON review_helpful_votes(review_id, created_at DESC);

CREATE TABLE IF NOT EXISTS review_flags (
    flag_id BIGSERIAL PRIMARY KEY,
    review_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reason TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_review_flags_review_status
    ON review_flags(review_id, status, created_at DESC);
