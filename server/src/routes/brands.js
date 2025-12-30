const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Default brands if table doesn't exist
const defaultBrands = [
  { brand_id: 1, name: 'Apple' },
  { brand_id: 2, name: 'Samsung' },
  { brand_id: 3, name: 'OnePlus' },
  { brand_id: 4, name: 'Xiaomi' },
  { brand_id: 5, name: 'Oppo' },
  { brand_id: 6, name: 'Vivo' },
  { brand_id: 7, name: 'Realme' },
  { brand_id: 8, name: 'Google' },
  { brand_id: 9, name: 'Sony' },
  { brand_id: 10, name: 'Nokia' },
  { brand_id: 11, name: 'Motorola' },
  { brand_id: 12, name: 'LG' },
  { brand_id: 13, name: 'Other' }
];

// GET /api/brands
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brands ORDER BY name');
    if (result.rows && result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.json(defaultBrands);
    }
  } catch (err) {
    console.error('[Brands] Error:', err.message);
    // Return defaults if table doesn't exist
    res.json(defaultBrands);
  }
});

module.exports = router;
