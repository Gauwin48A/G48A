-- Device Analytics Table Migration
-- Stores device fingerprints and session data

CREATE TABLE IF NOT EXISTS device_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    fingerprint VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_width INTEGER,
    screen_height INTEGER,
    pixel_ratio NUMERIC(3,1),
    language VARCHAR(10),
    timezone VARCHAR(50),
    network_type VARCHAR(20),
    cpu_cores INTEGER,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_device_fingerprint ON device_analytics(fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_user ON device_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_device_created ON device_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_type ON device_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_device_ip ON device_analytics(ip_address);

COMMENT ON TABLE device_analytics IS 'Device fingerprinting and session analytics for user tracking';
