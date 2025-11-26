import { pool } from '../../db/index.js';

export const saveLocation = async (req, res) => {
  try {
    const { user_id, latitude, longitude, accuracy, altitude, heading, speed, provider, permission_status, city, country } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    const query = `
      INSERT INTO user_locations (user_id, latitude, longitude, accuracy, altitude, heading, speed, provider, permission_status, city, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;
    const result = await pool.query(query, [user_id || null, latitude, longitude, accuracy || null, altitude || null, heading || null, speed || null, provider || 'browser', permission_status || null, city || null, country || null]);
    res.status(201).json({ status: 'success', id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getLocations = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_locations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_locations WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['latitude', 'longitude', 'accuracy', 'altitude', 'heading', 'speed', 'provider', 'permission_status', 'city', 'country'];
    const updates = [];
    const values = [];
    fields.forEach((field, idx) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${updates.length + 2}`);
        values.push(req.body[field]);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    const query = `UPDATE user_locations SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM user_locations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json({ status: 'deleted', id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
