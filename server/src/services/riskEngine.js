const pool = require('../config/db');
const geoip = require('geoip-lite');

// --- CONSTANTS ---
const MAX_CITY_SPEED = 60; // km/h (Traffic limit)
const MAX_AIR_SPEED = 900; // km/h (Plane limit)

// --- HELPER: Haversine Distance (km) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Evaluates login risk based on velocity, device consistency, and IP Geolocation.
 */
exports.evaluateLoginRisk = async (userId, newLat, newLng, newDeviceId, ipAddress) => {
    let riskScore = 0;
    let riskReasons = [];
    let isIPFallback = false;

    // A. PROTOCOL: FALLBACK (IP Geolocation)
    // If strict GPS failed or was bypassed, we blindly trust IP.
    if (!newLat || !newLng) {
        const geo = geoip.lookup(ipAddress);
        if (geo && geo.ll) {
            newLat = geo.ll[0];
            newLng = geo.ll[1];
            isIPFallback = true;
            riskScore += 15; // IP-only is risky, but allowed
            riskReasons.push("GPS Disabled (IP Fallback)");
        } else {
            // "Null Island" Defense
            return { action: 'BLOCK', score: 100, reasons: ["Location Required (GPS Disabled & IP Failed)"] };
        }
    }

    // 1. Get Last Login
    const history = await pool.query(
        `SELECT * FROM login_history WHERE user_id = $1 ORDER BY login_time DESC LIMIT 1`,
        [userId]
    );

    // If new user, ALLOW
    if (history.rows.length === 0) return { action: 'ALLOW', score: 0, derivedCoords: { lat: newLat, lng: newLng } };

    const lastLogin = history.rows[0];

    // 2. Calculate Variables
    const timeDiffHours = (Date.now() - new Date(lastLogin.login_time)) / (1000 * 60 * 60);
    // Prevent division by zero
    const safeTime = timeDiffHours < 0.008 ? 0.008 : timeDiffHours;

    const distanceKm = calculateDistance(lastLogin.latitude, lastLogin.longitude, newLat, newLng);
    const speed = distanceKm / safeTime;

    // --- RULE 1: DEVICE CONSISTENCY ---
    if (lastLogin.device_id !== newDeviceId) {
        riskScore += 20;
        riskReasons.push("Unrecognized Device");
    } else {
        riskScore -= 10; // Reward consistency
    }

    // --- RULE 2: SUPERMAN BLOCK (Impossible Travel) ---
    if (distanceKm > 100 && speed > MAX_AIR_SPEED) {
        riskScore += 100;
        riskReasons.push(`Impossible Travel: ${Math.round(distanceKm)}km in ${Math.round(safeTime * 60)} mins`);
    }

    // --- RULE 3: RELAY RACE (Hyper-Local Speed) ---
    // Moving fast in city (<50km) with >60km/h
    if (distanceKm > 1 && distanceKm < 50 && speed > MAX_CITY_SPEED) {
        if (lastLogin.device_id === newDeviceId) {
            // Genuine user driving fast? Allow slightly.
            riskScore += 5;
        } else {
            // Different device + High Speed = Relay Fraud
            riskScore += 50;
            riskReasons.push(`Suspicious Local Relay (Speed: ${Math.round(speed)} km/h)`);
        }
    }

    // --- RULE 4: GPS-IP MISMATCH (The "Spoof" Check) ---
    const ipGeo = geoip.lookup(ipAddress);
    if (!isIPFallback && ipGeo && ipGeo.ll) {
        // If we have both GPS and IP location, compare them
        const discrepancyKm = calculateDistance(newLat, newLng, ipGeo.ll[0], ipGeo.ll[1]);
        if (discrepancyKm > 200) {
            riskScore += 40;
            riskReasons.push(`GPS-IP Mismatch (${Math.round(discrepancyKm)}km gap)`);
        }
    }

    // --- RULE 5: METRO DEFENSE (ISP Consistency) ---
    // If ISP matches previous login, it's safer even if speed is high-ish
    // Note: IP matching is a proxy for ISP matching in zero-cost setup
    // Ideally we'd compare ASN/Org, but keeping it simple:
    if (lastLogin.ip_address === ipAddress) {
        riskScore -= 10; // Same IP = Safe
    }

    // --- VERDICT ---
    let action = 'ALLOW';
    if (riskScore >= 60) action = 'BLOCK';
    else if (riskScore >= 30) action = 'CHALLENGE';

    return { action, score: Math.max(0, riskScore), reasons: riskReasons, derivedCoords: { lat: newLat, lng: newLng } };
};
