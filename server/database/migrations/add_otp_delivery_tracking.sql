-- OTP delivery tracking for provider callbacks and metrics
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS otp_delivery_logs (
    id BIGSERIAL PRIMARY KEY,
    delivery_id VARCHAR(64) UNIQUE NOT NULL,
    flow VARCHAR(32) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    channel VARCHAR(16) NOT NULL,
    destination_masked VARCHAR(160),
    provider VARCHAR(64),
    provider_message_id VARCHAR(160),
    send_status VARCHAR(24) NOT NULL DEFAULT 'queued',
    callback_status VARCHAR(64),
    callback_event VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    callback_payload JSONB,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    callback_received_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_sent_at
    ON otp_delivery_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_provider_msg
    ON otp_delivery_logs(provider, provider_message_id);

CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_flow_purpose
    ON otp_delivery_logs(flow, purpose);

CREATE INDEX IF NOT EXISTS idx_otp_delivery_logs_send_status
    ON otp_delivery_logs(send_status);
