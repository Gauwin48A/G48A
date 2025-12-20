const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Fetch User
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 2. Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Generate Token
    const token = jwt.sign(
      {
        id: user.user_id,
        is_admin: user.role === 'admin',
        aadhaar_verified: user.isaadhaarverified
      },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    // 4. Send Response (Hide sensitive data)
    user.password_hash = undefined;
    res.json({ token, user, userId: user.user_id });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.register = async (req, res) => {
  // Basic registration stub for demo
  res.status(501).json({ message: "Use the seeded demo account for this beta test." });
};
