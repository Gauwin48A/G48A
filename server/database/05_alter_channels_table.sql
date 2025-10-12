-- 05_alter_channels_table.sql
-- Migration to update channels table for production use

ALTER TABLE channels
ADD COLUMN category_id INT REFERENCES categories(category_id),
ADD COLUMN logo_url VARCHAR(255),
ADD COLUMN cover_url VARCHAR(255),
ADD COLUMN contact_info VARCHAR(255),
ADD COLUMN location VARCHAR(255),
ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Enforce unique channel names
ALTER TABLE channels
ADD CONSTRAINT unique_channel_name UNIQUE (name);

-- Indexes for efficient queries
CREATE INDEX idx_channels_category_id ON channels(category_id);
CREATE INDEX idx_channels_status ON channels(status);
