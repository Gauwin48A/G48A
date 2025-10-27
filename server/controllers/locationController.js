import { pool } from '../db/index.js';

export const saveLocation = async (req, res) => {
  try {
    const { user_id, latitude, longitude, accuracy, altitude, heading, speed, provider } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    const query = `
      INSERT INTO user_locations (user_id, latitude, longitude, accuracy, altitude, heading, speed, provider)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;
    const result = await pool.query(query, [user_id || null, latitude, longitude, accuracy || null, altitude || null, heading || null, speed || null, provider || 'browser']);
    console.log('✅ Location inserted:', result.rows[0]);
    res.status(200).json({ status: 'success', id: result.rows[0].id });
  } catch (error) {
    console.error('❌ saveLocation error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
