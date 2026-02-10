const pool = require('../config/db');
const logger = require('../utils/logger');

exports.updateLocation = async (req, res) => {
  const { userId, latitude, longitude, city, country } = req.body;

  // 1. Validation: Don't choke on bad data, just warn
  if (!userId || !latitude || !longitude) {
    logger.warn(`Location update failed: Missing data for User ${userId}`);
    // Return 200 to keep the client happy, but with success: false
    return res.status(200).json({ success: false, message: 'Invalid coordinates' });
  }

  try {
    // 2. Journaling Insert: Keep history instead of overwriting
    const query = `
      INSERT INTO user_locations (user_id, latitude, longitude, city, country, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `;

    await pool.query(query, [userId, latitude, longitude, city || 'Unknown', country || 'Unknown']);

    res.json({ success: true, message: 'Location captured' });
  } catch (err) {
    // 3. Silent Fail: If DB is down or table missing, don't crash the user's app
    logger.error('Location DB Error:', err);
    res.status(200).json({ success: false, warning: 'Location saved locally only' });
  }
};

// Keep existing exports for compatibility
// Protocol: Reality Check - Save location with fraud verification data
exports.saveLocation = async (req, res) => {
  try {
    const { user_id, latitude, longitude, accuracy, heading, permission_status, city, country, provider, timezone } = req.body;
    const normalizedPermission = String(permission_status || '').toLowerCase();
    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';
    const parsedLatitude = hasLatitude ? Number(latitude) : null;
    const parsedLongitude = hasLongitude ? Number(longitude) : null;

    // Allow 0,0 for denied/error status (for analytics), but require coords for granted* statuses
    if (normalizedPermission.startsWith('granted') && (!hasLatitude || !hasLongitude)) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    if ((hasLatitude && !Number.isFinite(parsedLatitude)) || (hasLongitude && !Number.isFinite(parsedLongitude))) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    // Get IP-verified location from fraud check middleware (if available)
    const ipLocation = req.ipLocation || null;
    const locationVerified = req.locationVerified || false;
    const fraudRisk = req.fraudRisk || null;

    // Log security verification
    if (locationVerified) {
      logger.info(`[Location] ✅ Verified location save - User: ${user_id}, GPS: (${latitude}, ${longitude}), IP: ${ipLocation?.city}`);
    } else if (fraudRisk) {
      logger.warn(`[Location] ⚠️ Risk detected - User: ${user_id}, Risk: ${fraudRisk.level} (${fraudRisk.reason})`);
    }

    // Use IP-detected city/country as fallback if not provided
    const finalCity = city || ipLocation?.city || 'Unknown';
    const finalCountry = country || ipLocation?.country || 'Unknown';

    // 1. Transactional Sync: Update User Profile AND Insert Log
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // A. Insert History Log (The "Paper Trail")
      const logQuery = `
        INSERT INTO user_locations (user_id, latitude, longitude, accuracy, heading, permission_status, city, country, speed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;
      const logResult = await client.query(logQuery, [
        user_id || null,
        parsedLatitude,
        parsedLongitude,
        accuracy || null,
        heading || null,
        permission_status || null,
        finalCity,
        finalCountry,
        req.body.device_speed || req.body.speed || null
      ]);

      // B. Update User Profile (Banking-Grade Discovery)
      if (user_id) {
        const userUpdateQuery = `
          UPDATE users 
          SET 
            current_city = $1, 
            current_state = $2, 
            last_latitude = $3, 
            last_longitude = $4,
            device_speed = $5,
            last_location_sync = NOW()
          WHERE user_id = $6
        `;
        await client.query(userUpdateQuery, [
          finalCity,
          req.body.state || null,
          parsedLatitude,
          parsedLongitude,
          req.body.device_speed || req.body.speed || null,
          user_id
        ]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        status: 'success',
        id: logResult.rows[0].id,
        location: { city: finalCity, country: finalCountry },
        provider: provider || 'browser',
        verified: locationVerified,
        timezone: timezone || ipLocation?.timezone || null
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('saveLocation error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_locations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_locations WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM user_locations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json({ status: 'deleted', id });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
