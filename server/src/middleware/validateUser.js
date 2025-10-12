// Middleware for validating user registration input
module.exports = (req, res, next) => {
  // Use DB validation function for all fields
  const { name, phone, email, password, dob, aadhaar, pan } = req.body;
  const pool = require('../config/db');
  pool.query(
    'SELECT * FROM validate_signup_fields($1, $2, $3, $4, $5, $6, $7)',
    [name, email, password, phone, dob, aadhaar, pan]
  ).then(result => {
    const invalid = result.rows.find(row => !row.valid);
    if (invalid) {
      return res.status(400).json({ error: invalid.message, field: invalid.field });
    }
    next();
  }).catch(err => {
    return res.status(500).json({ error: 'Validation failed', details: err.message });
  });
};
