const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { recordFailedAttempt, resetFailedAttempts } = require('../middleware/security');

// Password strength validation helper
const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter (a-z)');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain a number (0-9)');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain a special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: 5 - errors.length
  };
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log('[AUTH] Login attempt for:', email);

  if (!email || !password) {
    console.log('[AUTH] Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Validate password strength before proceeding
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    console.log('[AUTH] Weak password rejected:', passwordValidation.errors);
    return res.status(400).json({
      error: 'Password does not meet security requirements',
      errors: passwordValidation.errors,
      hint: 'Password must be 8+ chars with uppercase, lowercase, number, and special character (!@#$%^&*)'
    });
  }

  try {
    // 1. Fetch User
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    const user = result.rows[0];

    console.log('[AUTH] User found:', !!user, user ? `(id: ${user.user_id})` : '');

    if (!user) {
      // SECURITY: Generic error to prevent user enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Verify Password
    console.log('[AUTH] Checking password hash length:', user.password_hash?.length || 0);

    if (!user.password_hash) {
      console.log('[AUTH] No password hash stored for user');
      return res.status(401).json({ error: 'Password not set for this account' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('[AUTH] Password match:', isMatch);

    if (!isMatch) {
      // SECURITY: Track failed attempts for account lockout
      recordFailedAttempt(email);
      // SECURITY: Generic error - never reveal password or confirm email exists
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // SECURITY: Reset failed attempts on successful login
    resetFailedAttempts(email);

    // 3. Generate Token
    const token = jwt.sign(
      {
        userId: user.user_id,
        id: user.user_id,
        is_admin: user.role === 'admin',
        aadhaar_verified: user.isaadhaarverified
      },
      process.env.JWT_SECRET, // SECURITY: No fallback - must set JWT_SECRET in .env
      { expiresIn: '24h' }
    );

    console.log('[AUTH] Login successful for user:', user.user_id);

    // 4. Send Response (Hide sensitive data)
    user.password_hash = undefined;
    res.json({ token, user, userId: user.user_id });

  } catch (err) {
    // SECURITY: Never expose internal error details to client
    console.error('[AUTH] Login Error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};

exports.register = async (req, res) => {
  // Basic registration stub for demo
  res.status(501).json({ message: "Use the seeded demo account for this beta test." });
};

// Admin endpoint to reset all passwords - call this to fix authentication
exports.resetAllPasswords = async (req, res) => {
  const defaultPassword = 'password123';

  try {
    console.log('[AUTH] Resetting all user passwords to:', defaultPassword);

    // Generate a proper bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPassword, salt);

    console.log('[AUTH] Generated hash:', hash);
    console.log('[AUTH] Hash length:', hash.length);

    // Update all users
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 RETURNING user_id, email',
      [hash]
    );

    console.log('[AUTH] Updated', result.rowCount, 'users');

    // Also ensure preferences table exists and has data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS preferences (
        preference_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        location VARCHAR(100) DEFAULT 'Mumbai',
        min_price DECIMAL(10,2) DEFAULT 0,
        max_price DECIMAL(10,2) DEFAULT 100000,
        categories JSONB DEFAULT '["Electronics", "Mobiles"]',
        notification_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      INSERT INTO preferences (user_id, location, min_price, max_price)
      SELECT user_id, 'Mumbai', 0, 100000 FROM users
      WHERE user_id NOT IN (SELECT user_id FROM preferences)
      ON CONFLICT DO NOTHING
    `);

    const prefCount = await pool.query('SELECT COUNT(*) FROM preferences');

    res.json({
      success: true,
      message: 'All passwords reset to: ' + defaultPassword,
      usersUpdated: result.rowCount,
      preferencesCount: parseInt(prefCount.rows[0].count),
      testCredentials: {
        email: 'rahul@test.com',
        password: defaultPassword
      }
    });

  } catch (err) {
    console.error('[AUTH] Reset passwords error:', err);
    res.status(500).json({ error: 'Failed to reset passwords: ' + err.message });
  }
};

// Debug endpoint to list all users (for testing only)
exports.listUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, email, username FROM users ORDER BY user_id LIMIT 20');
    res.json({
      count: result.rowCount,
      users: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
