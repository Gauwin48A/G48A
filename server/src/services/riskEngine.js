const pool = require('../config/db');

// CONFIGURATION
const MAX_CITY_SPEED = 60; // km/h (Hyderabad traffic is slow; 60 is generous for straight line)
const MAX_AIR_SPEED = 900; // km/h (Plane)

// Haversine Distance (Returns km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

exports.evaluateLoginRisk = async (userId, newLat, newLng, newDeviceId) => {
    let riskScore = 0;
    let riskReasons = [];
    let action = 'ALLOW';

    // 1. Fetch Last Login Context
    const history = await pool.query(
        `SELECT * FROM login_history WHERE user_id = $1 ORDER BY login_time DESC LIMIT 1`,
        [userId]
    );

    if (history.rows.length === 0) return { score: 0, action: 'ALLOW', reasons: [] }; // First login is safe

    const lastLogin = history.rows[0];

    // Calculate Time and Distance
    // Date.now() is ms
    const timeDiffHours = (Date.now() - new Date(lastLogin.login_time)) / (1000 * 60 * 60);

    // If no new location provided (e.g., failed to fetch), we can't do velocity check. 
    // But we can still do Device Check.
    if (!newLat || !newLng) {
        if (lastLogin.device_id !== newDeviceId) {
            return { score: 20, action: 'ALLOW', reasons: ["New Device (No Location Provided)"] };
        }
        return { score: 0, action: 'ALLOW', reasons: [] };
    }

    const distanceKm = calculateDistance(lastLogin.latitude, lastLogin.longitude, parseFloat(newLat), parseFloat(newLng));

    // Avoid division by zero
    const safeTime = timeDiffHours < 0.005 ? 0.005 : timeDiffHours;
    const speed = distanceKm / safeTime;

    // === RULE 1: THE DEVICE CHECK (Crucial for Local Relay) ===
    const isNewDevice = lastLogin.device_id !== newDeviceId;

    if (isNewDevice) {
        riskScore += 20; // New device is always slightly risky
        riskReasons.push("New Device");
    } else {
        riskScore -= 10; // Known device is safer
    }

    // === RULE 2: HYPER-LOCAL TELEPORTATION ===
    // If moving locally (< 50km) but impossible speed (> 60km/h in city)
    if (distanceKm > 1 && distanceKm < 50) {
        if (speed > MAX_CITY_SPEED) {
            riskScore += 50; // Huge penalty for fake local jumps
            riskReasons.push(`Unrealistic City Speed (${Math.round(speed)} km/h)`);
        }
    }

    // === RULE 3: IMPOSSIBLE TRAVEL (Long Range) ===
    if (distanceKm >= 50) {
        if (speed > MAX_AIR_SPEED) {
            riskScore += 100; // Instant Block
            riskReasons.push("Impossible Travel (Teleportation)");
        } else if (speed > 150 && speed <= MAX_AIR_SPEED) {
            // Possible by flight, but suspicious if done frequently
            riskScore += 30;
            riskReasons.push("High Speed Travel");
        }
    }

    // Ensure score doesn't go below 0
    riskScore = Math.max(0, riskScore);

    // === DECISION MATRIX ===
    if (riskScore >= 60) action = 'BLOCK';
    else if (riskScore >= 30) action = 'VERIFY_OTP'; // The "Challenge"

    return { score: riskScore, action, reasons: riskReasons };
};
