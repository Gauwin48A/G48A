-- Insert 500 users with Aadhaar, profile, and verification
DO $$
DECLARE
  i INT := 1;
  uid INT;
  uname TEXT;
  email TEXT;
  aadhaar TEXT;
  masked TEXT;
  enc TEXT;
BEGIN
  WHILE i <= 500 LOOP
    uname := 'user' || i;
    email := 'user' || i || '@example.com';
    aadhaar := lpad(i::text, 12, '1');
    masked := 'XXXX-XXXX-' || right(aadhaar, 4);
    enc := encode(digest(aadhaar, 'sha256'), 'hex'); -- Simulate encryption
    INSERT INTO users (username, email, password_hash, aadhaar_number_masked, aadhaar_encrypted, isAadhaarVerified, created_at)
    VALUES (uname, email, '$2b$10$testhashforuser', masked, enc, TRUE, NOW()) RETURNING user_id INTO uid;
    INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, verified)
    VALUES (uid, 'User ' || i, '9000000' || lpad(i::text, 4, '0'), 'Address ' || i, NULL, '', TRUE);
    i := i + 1;
  END LOOP;
END $$;

-- Insert posts for each user (2 per user)
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, status, created_at)
SELECT u.user_id, 1, 1, 'Sample Post ' || u.username, 'Description for ' || u.username, 999.99, 'active', NOW()
FROM users u
LIMIT 500;

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, status, created_at)
SELECT u.user_id, 2, 2, 'Second Post ' || u.username, 'Second post for ' || u.username, 499.99, 'active', NOW()
FROM users u
LIMIT 500;

-- Insert reward logs for each user
INSERT INTO reward_log (user_id, points, reason, created_at)
SELECT user_id, 100, 'signup', NOW() FROM users;

-- Insert sample channels and followers
INSERT INTO channels (owner_id, name, description, is_premium, created_at)
SELECT user_id, 'Channel ' || username, 'Channel for ' || username, TRUE, NOW() FROM users LIMIT 100;

INSERT INTO channel_followers (channel_id, user_id, followed_at)
SELECT c.channel_id, u.user_id, NOW()
FROM channels c, users u
WHERE c.channel_id <= 100 AND u.user_id <= 500;

-- Insert feeds for each user
INSERT INTO feeds (user_id, description, created_at)
SELECT user_id, 'Feed post for ' || username, NOW() FROM users;
