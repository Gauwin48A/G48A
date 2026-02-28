const pool = require('../config/db');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

// CONFIGURATION
const MAX_SPEED_KMH = 900; // Plane speed (Approx 800-900 km/h)
const MAX_DEVICES_PER_DAY = 3; // Only allow 3 unique devices per 24 hours

function hasCoordinate(value) {
    return value !== undefined && value !== null && value !== '';
}

// Haversine Distance Helper
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(Number(value)))) {
        return 0;
    }

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

exports.checkLoginFraud = async (userId, newLat, newLng, newDeviceId) => {
    // 1. Get the LAST login record
    const lastLoginRes = await runQuery(
        `SELECT latitude, longitude, login_time, device_id
         FROM login_history
         WHERE user_id = $1
         ORDER BY login_time DESC
         LIMIT 1`,
        [userId]
    );

    if (lastLoginRes.rows.length === 0) return { allowed: true }; // First login ever

    const lastLogin = lastLoginRes.rows[0];

    // --- CHECK 1: IMPOSSIBLE TRAVEL (Superman Rule) ---
    if (
        hasCoordinate(newLat)
        && hasCoordinate(newLng)
        && hasCoordinate(lastLogin.latitude)
        && hasCoordinate(lastLogin.longitude)
    ) {
        const timeDiffHours = (new Date() - new Date(lastLogin.login_time)) / 1000 / 60 / 60;
        const distanceKm = getDistanceKm(
            Number(lastLogin.latitude),
            Number(lastLogin.longitude),
            Number(newLat),
            Number(newLng)
        );

        // If time difference is very small (avoid division by zero), treat as 0.01 hours
        const safeTimeDiff = timeDiffHours < 0.01 ? 0.01 : timeDiffHours;
        const speed = distanceKm / safeTimeDiff;

        // If they moved > 100km and speed > 900km/h -> FRAUD
        if (distanceKm > 100 && speed > MAX_SPEED_KMH) {
            return {
                allowed: false,
                reason: `Impossible Travel detected. You moved ${Math.round(distanceKm)}km in ${Math.round(timeDiffHours * 60)} mins.`
            };
        }
    }

    // --- CHECK 2: DEVICE CHURN (The "Team" Attack) ---
    // Count unique devices used in last 24 hours
    const deviceRes = await runQuery(
        `SELECT COUNT(DISTINCT device_id) FROM login_history 
     WHERE user_id = $1 AND login_time > NOW() - INTERVAL '24 hours'`,
        [userId]
    );

    const uniqueDevices = Number.parseInt(deviceRes.rows[0].count, 10);

    // If this is a NEW device and they already hit the limit
    if (newDeviceId && lastLogin.device_id !== newDeviceId && uniqueDevices >= MAX_DEVICES_PER_DAY) {
        return {
            allowed: false,
            reason: `Security Alert: Too many devices used today. Limit is ${MAX_DEVICES_PER_DAY}.`
        };
    }

    return { allowed: true };
};
