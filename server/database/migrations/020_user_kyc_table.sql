-- Table: user_kyc
-- Stores user address and KYC verification details in compliance with Indian DPDP & UIDAI regulations (raw 12-digit numbers are never stored)

CREATE TABLE IF NOT EXISTS user_kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
    
    -- Compliance Security Fields
    masked_aadhaar VARCHAR(20) NOT NULL, -- Stores: 'XXXX-XXXX-5678'
    kyc_ref_token VARCHAR(100) NOT NULL,  -- Unique Client ID / Token from Surepass
    
    -- Personal Information (From Aadhaar OKYC)
    full_name VARCHAR(150) NOT NULL,
    dob DATE,
    gender VARCHAR(10),
    profile_image_base64 TEXT, -- Optional Aadhaar photo
    
    -- Full Address Breakdown
    full_address TEXT NOT NULL,
    house_number VARCHAR(100),
    street VARCHAR(255),
    locality VARCHAR(255),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
