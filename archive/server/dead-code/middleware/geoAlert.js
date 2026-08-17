/**
 * Geo-Location Alert System
 * Detects logins from new countries and notifies users
 */
const https = require('https');
const { logSecurityEvent, EVENTS } = require('../config/auditLogger');

// In-memory storage for user locations (use Redis in production)
const userLocations = new Map();

/**
 * Get country from IP address using free IP-API
 * @param {string} ip - IP address
 * @returns {Promise<{country: string, city: string}>}
 */
const getLocationFromIP = async (ip) => {
    // Skip for localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { country: 'Local', city: 'Development' };
    }

    return new Promise((resolve) => {
        const options = {
            hostname: 'ip-api.com',
            path: `/json/${ip}?fields=country,city,status`,
            method: 'GET',
            timeout: 3000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.status === 'success') {
                        resolve({ country: parsed.country, city: parsed.city });
                    } else {
                        resolve({ country: 'Unknown', city: 'Unknown' });
                    }
                } catch {
                    resolve({ country: 'Unknown', city: 'Unknown' });
                }
            });
        });

        req.on('error', () => resolve({ country: 'Unknown', city: 'Unknown' }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ country: 'Unknown', city: 'Unknown' });
        });
        req.end();
    });
};

/**
 * Check if login is from a new location and log/alert
 * @param {number} userId - User ID
 * @param {string} ip - Client IP
 * @param {object} userInfo - User details for notification
 */
const checkNewLocation = async (userId, ip, userInfo = {}) => {
    try {
        const location = await getLocationFromIP(ip);
        const key = `user:${userId}:locations`;

        // Get known locations
        const knownLocations = userLocations.get(key) || new Set();
        const locationKey = `${location.country}:${location.city}`;

        if (!knownLocations.has(locationKey) && location.country !== 'Local' && location.country !== 'Unknown') {
            // New location detected!
            logSecurityEvent(EVENTS.NEW_LOCATION_LOGIN, {
                userId,
                ip,
                country: location.country,
                city: location.city,
                email: userInfo.email,
                timestamp: new Date().toISOString()
            });

            // Add to known locations
            knownLocations.add(locationKey);
            userLocations.set(key, knownLocations);

            return { isNew: true, location };
        }

        return { isNew: false, location };
    } catch (error) {
        console.error('[GeoAlert] Error:', error.message);
        return { isNew: false, location: { country: 'Unknown', city: 'Unknown' } };
    }
};

/**
 * Middleware to check geo-location on login
 */
const geoAlertMiddleware = async (req, res, next) => {
    // This runs AFTER successful login
    if (req.user && req.loginSuccess) {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        await checkNewLocation(req.user.userId || req.user.id, ip, req.user);
    }
    next();
};

module.exports = { getLocationFromIP, checkNewLocation, geoAlertMiddleware };
