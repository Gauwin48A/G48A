import express from 'express';
import db from '../db.js';
import axios from 'axios';

const router = express.Router();

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

function isValidLatLng(lat, lng) {
  return typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Reverse geocoding function using Nominatim (OpenStreetMap - Free, no API key needed)
async function reverseGeocode(latitude, longitude) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'Mhub-Location-Service/1.0' // Required by Nominatim
      },
      timeout: 5000 // 5 second timeout
    });

    const address = response.data.address || {};
    return {
      city: address.city || address.town || address.village || address.county || 'Unknown',
      country: address.country || 'Unknown'
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return { city: 'Unknown', country: 'Unknown' };
  }
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, altitude, heading, speed, provider, permission_status } = req.body;
    const user_id = req.user.id;

    // Validate permission_status
    const validStatuses = ['granted', 'denied', 'error', 'timeout'];
    const status = validStatuses.includes(permission_status) ? permission_status : 'unknown';

    // If permission denied or error, store without geocoding
    if (status !== 'granted') {
      await db.query(
        `INSERT INTO user_locations 
         (user_id, latitude, longitude, accuracy, altitude, heading, speed, provider, permission_status, city, country) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [user_id, 0, 0, null, null, null, null, provider || 'browser', status, null, null]
      );

      return res.json({ 
        status: 'recorded', 
        message: 'Permission status recorded',
        permission_status: status
      });
    }

    // Validate coordinates for granted permission
    if (!isValidLatLng(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid latitude/longitude' });
    }

    // Get city and country from coordinates
    const { city, country } = await reverseGeocode(latitude, longitude);

    // Insert into database
    await db.query(
      `INSERT INTO user_locations 
       (user_id, latitude, longitude, accuracy, altitude, heading, speed, provider, permission_status, city, country) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [user_id, latitude, longitude, accuracy, altitude, heading, speed, provider || 'browser', status, city, country]
    );

    res.json({ 
      status: 'success', 
      message: 'Location captured successfully',
      location: { city, country },
      permission_status: status
    });
  } catch (error) {
    console.error('Location save error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

export default router;
