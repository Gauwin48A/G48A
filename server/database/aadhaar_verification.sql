-- Add Aadhaar fields to users table
ALTER TABLE users ADD COLUMN aadhaar_number_masked VARCHAR(20);
ALTER TABLE users ADD COLUMN aadhaar_encrypted VARCHAR(255);
ALTER TABLE users ADD COLUMN isAadhaarVerified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verified_date TIMESTAMP WITH TIME ZONE;

-- Aadhaar verification logs table
CREATE TABLE IF NOT EXISTS aadhaar_verification_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(user_id),
    request_id VARCHAR(100),
    request_type VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
