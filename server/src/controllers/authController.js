const pool = require('../config/db');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const zxcvbn = require('zxcvbn');
const { validationResult } = require('express-validator');

// HELPER: Generate Banking-Grade Token Cookie (Fort Knox Protocol)
const sendTokenCookie = (user, res) => {
  const accessToken = jwt.sign(
    { id: user.user_id, role: user.role, name: user.full_name },
    process.env.JWT_SECRET || 'fallback_secret_change_me',
    { expiresIn: '15m' } // Short life for access token
  );

  // REFRESH TOKEN (Long life, HttpOnly)
  const refreshToken = jwt.sign(
    { id: user.user_id },
    process.env.REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true, // CANNOT BE ACCESSED BY JS (Prevents XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict', // Prevents CSRF
  };

  res.cookie('jwt', refreshToken, cookieOptions);

  return accessToken;
};

// 1. SIGNUP
exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone, password, fullName } = req.body;
  const phoneNumber = phone || req.body.phone_number;
  const client = await pool.connect();

  try {
    // 1. NIST PASSWORD STRENGTH CHECK
    const strength = zxcvbn(password);
    if (strength.score < 3) {
      return res.status(400).json({
        error: 'Password is too weak',
        suggestions: strength.feedback.suggestions
      });
    }

    await client.query('BEGIN');

    // 2. Check if user exists
    const userCheck = await client.query("SELECT user_id FROM users WHERE phone_number = $1", [phoneNumber]);
    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "User already exists with this phone number" });
    }

    // 3. ARGON2 HASHING (Memory Hard)
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB RAM usage per hash (Anti-GPU)
      timeCost: 3,
      parallelism: 1,
    });

    // 4. Insert User
    const newUserResult = await client.query(
      "INSERT INTO users (phone_number, password_hash, full_name, role) VALUES ($1, $2, $3, 'user') RETURNING user_id, phone_number, full_name, role",
      [phoneNumber, hashedPassword, fullName]
    );
    const newUser = newUserResult.rows[0];

    // 5. LOG AUDIT EVENT
    await client.query(
      'INSERT INTO security_logs (user_id, event_type, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
      [newUser.user_id, 'SIGNUP_SUCCESS', req.ip, req.headers['user-agent']]
    );

    await client.query('COMMIT');

    const token = sendTokenCookie(newUser, res);

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser.user_id, name: newUser.full_name, role: newUser.role, phone: newUser.phone_number }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("[AUTH ERROR]", err);
    res.status(500).json({ error: "Server error during signup" });
  } finally {
    client.release();
  }
};

const { evaluateLoginRisk } = require('../services/riskEngine');

// 2. LOGIN
exports.login = async (req, res) => {
  const { phone, password, lat, lng, deviceId, otp } = req.body;
  const phoneNumber = phone || req.body.phone_number;

  try {
    // 1. DUAL LOCATION STRATEGY (GPS + IP Fallback)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Note: We no longer block immediately if !lat. 
    // The Risk Engine will handle IP derivation if GPS is missing.

    // A. Find User
    // A. Find User
    // Note: We relaxed the strict check to allow IP Fallback in Risk Engine if GPS is missing.
    // The Risk Engine will return BLOCK/CHALLENGE if both fail.

    const result = await pool.query("SELECT * FROM users WHERE phone_number = $1", [phoneNumber]);
    if (result.rows.length === 0) {
      // Fake delay to prevent enumeration
      await argon2.hash("dummy");
      return res.status(401).json({ error: "Invalid phone number or password" });
    }

    // C. CHECK LOCKOUT (Fort Knox Protocol)
    if (user.lock_until && user.lock_until > new Date()) {
      return res.status(403).json({
        error: "Account Locked",
        message: 'Account temporarily locked for security. Try after 15 minutes.'
      });
    }

    // D. Verify Password (Argon2id)
    const isMatch = await argon2.verify(user.password_hash, password);

    if (!isMatch) {
      // INCREMENT FAILED ATTEMPTS
      const attempts = (user.login_attempts || 0) + 1;
      let lockQuery = 'UPDATE users SET login_attempts = $1 WHERE user_id = $2';
      let params = [attempts, user.user_id];

      if (attempts >= 5) {
        lockQuery = "UPDATE users SET login_attempts = 0, lock_until = NOW() + INTERVAL '15 minutes' WHERE user_id = $2";
      }

      await pool.query(lockQuery, params);

      // LOG FAILURE (Audit Trail)
      await pool.query(
        'INSERT INTO security_logs (user_id, event_type, ip_address) VALUES ($1, $2, $3)',
        [user.user_id, 'LOGIN_FAILED', clientIp]
      );

      // FAKE DELAY to prevent Time-Based Enumeration attacks
      await argon2.hash("dummy_password_for_timing");

      return res.status(401).json({ error: "Invalid phone number or password" });
    }

    // E. EVALUATE VELOCITY & RISK (The "Superman" check)
    const risk = await evaluateLoginRisk(user.user_id, lat, lng, deviceId, clientIp);
    console.log(`[RISK ENGINE] User: ${phoneNumber} | Risk: ${risk.score} | Action: ${risk.action}`);

    if (risk.action === 'BLOCK') {
      return res.status(403).json({ error: `Security Alert: ${risk.reasons.join('. ')}` });
    }

    if (risk.action === 'CHALLENGE') {
      if (!otp) {
        return res.status(202).json({
          requireOtp: true,
          message: "Unusual activity detected. Please enter the OTP sent to your registered email."
        });
      } else {
        const isValid = (otp === "1234"); // Mock verification
        if (!isValid) return res.status(400).json({ error: "Invalid Security Code" });
      }
    }

    // F. ZERO MAINTENANCE CLEANUP (10% Chance)
    if (Math.random() < 0.1) {
      pool.query("DELETE FROM login_history WHERE login_time < NOW() - INTERVAL '30 days'").catch(err => console.error("Log Cleanup Failed", err));
    }

    // G. RESET LOCKOUT ON SUCCESS
    await pool.query("UPDATE users SET login_attempts = 0, lock_until = NULL, last_login = NOW() WHERE user_id = $1", [user.user_id]);

    // G. Generate Banking-Grade Token (HttpOnly Cookie)
    const token = sendTokenCookie(user, res);

    // H. AUDIT SUCCESS
    await pool.query(
      `INSERT INTO security_logs (user_id, event_type, ip_address, user_agent) 
       VALUES ($1, 'LOGIN_SUCCESS', $2, $3)`,
      [user.user_id, clientIp, req.headers['user-agent']]
    );

    // I. Legacy History Log (For Discovery/Speed Checks)
    const finalLat = lat || risk.derivedCoords?.lat;
    const finalLng = lng || risk.derivedCoords?.lng;
    await pool.query(
      `INSERT INTO login_history (user_id, latitude, longitude, device_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.user_id, finalLat || 0, finalLng || 0, deviceId || 'unknown', clientIp]
    );

    res.json({
      success: true,
      token,
      user: { id: user.user_id, name: user.full_name, role: user.role, phone: user.phone_number, tier: user.tier }
    });

  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

// 3. GET ME (Token Validation)
exports.getMe = async (req, res) => {
  try {
    const user = await pool.query("SELECT user_id, full_name, phone_number, role, tier FROM users WHERE user_id = $1", [req.user.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const u = user.rows[0];
    res.json({ id: u.user_id, name: u.full_name, role: u.role, phone: u.phone_number, tier: u.tier });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
