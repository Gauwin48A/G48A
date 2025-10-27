import express from 'express';
import db from '../db.js';
const router = express.Router();

// Middleware to require authentication (pseudo-code, replace with your actual auth middleware)
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

function isValidLatLng(lat, lng) {
  return typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

router.post('/', requireAuth, async (req, res) => {
  const { latitude, longitude } = req.body;
  const user_id = req.user.id;
  if (!isValidLatLng(latitude, longitude)) return res.status(400).json({ error: 'Invalid latitude/longitude' });
  await db.query(
    `INSERT INTO user_locations (user_id, latitude, longitude) VALUES ($1, $2, $3)`,
    [user_id, latitude, longitude]
  );
  res.json({ status: 'success', message: 'Location captured successfully' });
});

export default router;
