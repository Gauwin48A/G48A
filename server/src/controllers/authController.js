const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// GENERATE TOKEN HELPER
const generateToken = (user) => {
  return jwt.sign(
    { id: user.user_id, role: user.role, name: user.full_name },
    process.env.JWT_SECRET || 'fallback_secret_change_me',
    { expiresIn: '30d' } // Flipkart keeps you logged in for weeks
  );
};

// 1. SIGNUP
exports.signup = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone, password, fullName } = req.body;
  const phoneNumber = phone || req.body.phone_number; // Compat

  try {
    // A. Check if user exists
    const userCheck = await pool.query("SELECT user_id FROM users WHERE phone_number = $1", [phoneNumber]);
    if (userCheck.rows.length > 0) return res.status(409).json({ error: "User already exists with this phone number" });

    // B. Hash Password (10 rounds of salt is industry standard)
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // C. Insert User
    const newUser = await pool.query(
      "INSERT INTO users (phone_number, password_hash, full_name, role) VALUES ($1, $2, $3, 'user') RETURNING user_id, phone_number, full_name, role",
      [phoneNumber, hash, fullName]
    );

    // D. Auto-Login (Return Token immediately)
    const token = generateToken(newUser.rows[0]);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.rows[0].user_id,
        name: newUser.rows[0].full_name,
        role: newUser.rows[0].role,
        phone: newUser.rows[0].phone_number
      }
    });

  } catch (err) {
    console.error("[AUTH ERROR]", err);
    res.status(500).json({ error: "Server error during signup" });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  const { phone, password } = req.body;
  const phoneNumber = phone || req.body.phone_number;

  try {
    // A. Find User
    const result = await pool.query("SELECT * FROM users WHERE phone_number = $1", [phoneNumber]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid phone number or password" }); // Generic message for security
    }

    const user = result.rows[0];

    // B. Verify Password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: "Invalid phone number or password" });
    }

    // C. Generate Token
    const token = generateToken(user);

    // D. Update Audit Log
    await pool.query("UPDATE users SET last_login = NOW() WHERE user_id = $1", [user.user_id]);

    // E. Return User Info (exclude hash)
    // Note: Frontend uses id/name/role
    res.json({
      success: true,
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        role: user.role,
        phone: user.phone_number,
        tier: user.tier
      }
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
