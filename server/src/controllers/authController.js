const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Mock Aadhaar verification function
async function verifyAadhaar(aadhaar) {
  // Simulate API call: Aadhaar must be 12 digits and start with 2-9
  const regex = /^[2-9][0-9]{11}$/;
  return regex.test(aadhaar);
}

// Registration now supports file uploads (aadhaar_xml, pan_card, profile_pic)
exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, dob, aadhaar, pan, address } = req.body;
    const profilePicFile = req.files?.profile_pic?.[0];
    // Aadhaar verification
    const isAadhaarVerified = await verifyAadhaar(aadhaar);
    // Call DB validation function
    const validation = await pool.query(
      'SELECT * FROM validate_signup_fields($1, $2, $3, $4, $5, $6, $7)',
      [name, email, password, phone, dob, aadhaar, pan]
    );
    const invalid = validation.rows.find(row => !row.valid);
    if (invalid) {
      return res.status(400).json({ error: invalid.message, field: invalid.field });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert user
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, aadhaar_number_masked, isAadhaarVerified, verified_date) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email',
      [email, hashedPassword, aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : null, isAadhaarVerified, isAadhaarVerified ? new Date() : null]
    );
    const user = userResult.rows[0];
    // Insert profile
    await pool.query(
      'INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, verified) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.user_id, name, phone, address || '', profilePicFile ? profilePicFile.path : null, '', isAadhaarVerified]
    );
    res.status(201).json({ user, isAadhaarVerified });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      logger.error('Invalid login attempt', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.user_id, is_admin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  } catch (err) {
    logger.error('Error during login:', err);
    res.status(400).json({ error: err.message });
  }
};
