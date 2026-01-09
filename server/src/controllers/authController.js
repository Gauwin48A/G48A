const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { recordFailedAttempt, resetFailedAttempts, isAccountLocked } = require('../middleware/security');

// Password strength validation helper
const validatePasswordStrength = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter (A-Z)');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter (a-z)');
  if (!/\d/.test(password)) errors.push('Password must contain a number (0-9)');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain a special character (!@#$%^&*)');
  return { isValid: errors.length === 0, errors, strength: 5 - errors.length };
};

// Generate verification/reset tokens
const generateToken = () => crypto.randomBytes(32).toString('hex');
const generateTokenExpiry = (hours = 24) => new Date(Date.now() + hours * 60 * 60 * 1000);

// ============================================
// LOGIN
// ============================================
exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('[AUTH] Login attempt for:', email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // SECURITY: Check if account is locked (5-strike rule)
  if (isAccountLocked(email)) {
    return res.status(429).json({
      error: 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.'
    });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (user.email_verified === false) {
      return res.status(403).json({
        error: 'Please verify your email before logging in',
        needsVerification: true,
        email: user.email
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Password not set for this account' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    resetFailedAttempts(email);

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId: user.user_id, id: user.user_id, is_admin: user.role === 'admin' },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: '15m' }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.user_id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
      { expiresIn: '7d' }
    );

    // Store refresh token in database
    await pool.query(
      'UPDATE users SET refresh_token = $1, last_login = NOW() WHERE user_id = $2',
      [refreshToken, user.user_id]
    );

    console.log('[AUTH] Login successful for user:', user.user_id);

    // OPERATION POLISH: Set tokens as HttpOnly cookies (XSS-proof)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    user.password_hash = undefined;
    user.refresh_token = undefined;

    // Still return token in body for backward compatibility with localStorage clients
    // Frontend can choose to ignore this and rely on cookies instead
    res.json({
      token: accessToken,
      refreshToken,
      user,
      userId: user.user_id,
      expiresIn: 900 // 15 minutes in seconds
    });

  } catch (err) {
    console.error('[AUTH] Login Error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};

// ============================================
// REGISTER
// ============================================
exports.register = async (req, res) => {
  const { fullName, email, password, phoneNumber } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }

  // Validate password strength
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: passwordCheck.errors.join('. ') });
  }

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate email verification token
    const verificationToken = generateToken();
    const verificationExpiry = generateTokenExpiry(24);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone_number, email_verified, verification_token, verification_token_expiry, created_at)
       VALUES ($1, $2, $3, $4, false, $5, $6, NOW())
       RETURNING user_id, email, name`,
      [fullName, email.trim().toLowerCase(), passwordHash, phoneNumber || null, verificationToken, verificationExpiry]
    );

    const newUser = result.rows[0];

    // TODO: Send actual verification email
    console.log('[AUTH] Verification token for', email, ':', verificationToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: newUser.user_id,
      // For development: include token in response
      _devVerificationToken: verificationToken
    });

  } catch (err) {
    console.error('[AUTH] Register Error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
};

// ============================================
// VERIFY EMAIL
// ============================================
exports.verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, email FROM users 
       WHERE verification_token = $1 AND verification_token_expiry > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    await pool.query(
      `UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL 
       WHERE user_id = $1`,
      [user.user_id]
    );

    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });

  } catch (err) {
    console.error('[AUTH] Verify Email Error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================
exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id, email_verified FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If this email exists, a verification link has been sent.' });
    }

    if (result.rows[0].email_verified) {
      return res.status(400).json({ error: 'This email is already verified' });
    }

    const verificationToken = generateToken();
    const verificationExpiry = generateTokenExpiry(24);

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expiry = $2 WHERE user_id = $3',
      [verificationToken, verificationExpiry, result.rows[0].user_id]
    );

    // TODO: Send actual email
    console.log('[AUTH] New verification token for', email, ':', verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent.',
      _devVerificationToken: verificationToken
    });

  } catch (err) {
    console.error('[AUTH] Resend Verification Error:', err);
    res.status(500).json({ error: 'Failed to resend verification. Please try again.' });
  }
};

// ============================================
// FORGOT PASSWORD
// ============================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If this email exists, a password reset link has been sent.' });
    }

    const resetToken = generateToken();
    const resetExpiry = generateTokenExpiry(1); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE user_id = $3',
      [resetToken, resetExpiry, result.rows[0].user_id]
    );

    // TODO: Send actual email
    console.log('[AUTH] Password reset token for', email, ':', resetToken);

    res.json({
      success: true,
      message: 'If this email exists, a password reset link has been sent.',
      _devResetToken: resetToken
    });

  } catch (err) {
    console.error('[AUTH] Forgot Password Error:', err);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
};

// ============================================
// RESET PASSWORD
// ============================================
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  // Validate password strength
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: passwordCheck.errors.join('. ') });
  }

  try {
    const result = await pool.query(
      `SELECT user_id FROM users 
       WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE user_id = $2`,
      [passwordHash, result.rows[0].user_id]
    );

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });

  } catch (err) {
    console.error('[AUTH] Reset Password Error:', err);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
};

// ============================================
// CHANGE PASSWORD (Authenticated)
// ============================================
exports.changePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'User ID, current password, and new password are required' });
  }

  // Validate new password strength
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.isValid) {
    return res.status(400).json({ error: passwordCheck.errors.join('. ') });
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (err) {
    console.error('[AUTH] Change Password Error:', err);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
};

// ============================================
// REFRESH TOKEN
// ============================================
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret');

    // Check if token exists in database
    const result = await pool.query(
      'SELECT user_id, email, role FROM users WHERE user_id = $1 AND refresh_token = $2',
      [decoded.userId, refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = result.rows[0];

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.user_id, id: user.user_id, is_admin: user.role === 'admin' },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: '15m' }
    );

    res.json({
      token: accessToken,
      expiresIn: 900
    });

  } catch (err) {
    console.error('[AUTH] Refresh Token Error:', err);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// ============================================
// LOGOUT
// ============================================
exports.logout = async (req, res) => {
  const { userId } = req.body;

  try {
    if (userId) {
      await pool.query('UPDATE users SET refresh_token = NULL WHERE user_id = $1', [userId]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[AUTH] Logout Error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// ============================================
// ADMIN: Reset All Passwords (DEV ONLY)
// ============================================
exports.resetAllPasswords = async (req, res) => {
  const defaultPassword = 'Password123!';

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPassword, salt);

    const result = await pool.query('UPDATE users SET password_hash = $1, email_verified = true RETURNING user_id', [hash]);

    res.json({
      success: true,
      message: 'All passwords reset to: ' + defaultPassword,
      usersUpdated: result.rowCount,
      testCredentials: { email: 'vikram.singh@mhub.com', password: defaultPassword }
    });

  } catch (err) {
    console.error('[AUTH] Reset passwords error:', err);
    res.status(500).json({ error: 'Failed to reset passwords: ' + err.message });
  }
};

// Debug endpoint to list all users
exports.listUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, email, name, email_verified FROM users ORDER BY user_id LIMIT 20');
    res.json({ count: result.rowCount, users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
