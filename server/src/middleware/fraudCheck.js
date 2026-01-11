/**
 * Protocol: Reality Check - Fraud Detection Middleware
 * The Architect's Triangulation Forensics
 * 
 * Detects VPN, GPS spoofing, and location fraud by comparing:
 * 1. Browser Timezone (client-reported)
 * 2. IP Location (server-detected via geoip)
 * 3. GPS Coordinates (client-reported)
 * 
 * If these three don't align, the user is lying.
 */

const geoip = require('geoip-lite');
const requestIp = require('request-ip');

// CONFIG: Maximum allowed distance between IP location and GPS location (in km)
// Mobile networks often route traffic through central hubs, so be generous
const MAX_DISTANCE_KM = 300;

// CONFIG: Enable/Disable specific checks
const CONFIG = {
    checkTimezone: true,        // Block if browser timezone != IP timezone
    checkDistance: true,        // Block if GPS is too far from IP location
    checkPerfectCoords: true,   // Block suspiciously perfect GPS coordinates
    logOnly: false,             // If true, log suspicious activity but don't block
    bypassLocalhost: true       // Skip checks for localhost in development
};

/**
 * Haversine formula to calculate distance between two points in km
 */
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Check if coordinates are suspiciously "perfect" (likely fake GPS)
 * Real GPS has high precision jitter, fake GPS often returns rounded numbers
 */
const isPerfectCoordinate = (coord) => {
    if (coord === undefined || coord === null) return false;

    // Check if it's exactly an integer (no decimals)
    if (coord % 1 === 0) return true;

    // Check if it has very few decimal places (< 4)
    const decimalPart = String(coord).split('.')[1];
    if (!decimalPart || decimalPart.length < 4) return true;

    // Check if decimal part is suspiciously round (e.g., .5000, .2500)
    const lastFour = decimalPart.slice(-4);
    if (lastFour === '0000' || lastFour === '5000') return true;

    return false;
};

/**
 * Get timezone continent/region for loose matching
 * Because timezone names can vary (America/New_York vs America/Chicago)
 */
const getTimezoneRegion = (tz) => {
    if (!tz) return null;
    const parts = tz.split('/');
    return parts[0]; // e.g., "Asia", "America", "Europe"
};

/**
 * Main fraud detection middleware
 * Apply this to location sync endpoints
 */
const detectVpnOrSpoof = (req, res, next) => {
    const { latitude, longitude, timezone, lat, lng } = req.body;

    // Support both naming conventions
    const userLat = latitude || lat;
    const userLng = longitude || lng;

    // Get client IP
    const clientIp = requestIp.getClientIp(req);

    // 1. Skip localhost in development
    if (CONFIG.bypassLocalhost) {
        if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1' ||
            clientIp.startsWith('192.168.') || clientIp.startsWith('10.') ||
            clientIp.startsWith('172.16.')) {
            console.log('[RealityCheck] Skipping localhost/private IP:', clientIp);
            return next();
        }
    }

    // 2. Lookup IP Data using local geoip database
    const geo = geoip.lookup(clientIp);

    if (!geo) {
        // IP not found in DB. Might be new or VPN exit node.
        console.warn(`[RealityCheck] ⚠️ Unknown IP: ${clientIp} - Allowing but logging`);
        req.fraudRisk = { level: 'low', reason: 'unknown_ip' };
        return next();
    }

    console.log(`[RealityCheck] IP: ${clientIp}, Location: ${geo.city}, ${geo.country}, TZ: ${geo.timezone}`);

    // 3. CHECK 1: Timezone Mismatch (VPN Detection)
    if (CONFIG.checkTimezone && timezone && geo.timezone) {
        const browserRegion = getTimezoneRegion(timezone);
        const ipRegion = getTimezoneRegion(geo.timezone);

        // Strict check: exact timezone match
        if (timezone !== geo.timezone) {
            // Loose check: at least same continent/region
            if (browserRegion !== ipRegion) {
                const message = `Timezone mismatch. Browser: ${timezone} (${browserRegion}), IP: ${geo.timezone} (${ipRegion})`;
                console.warn(`[RealityCheck] 🔴 BLOCKED - ${message}`);

                if (CONFIG.logOnly) {
                    req.fraudRisk = { level: 'high', reason: 'timezone_mismatch', details: message };
                    return next();
                }

                return res.status(403).json({
                    error: 'Security Alert',
                    message: 'Your location settings do not match your network. Please turn off VPN or proxy.',
                    code: 'TIMEZONE_MISMATCH'
                });
            }
        }
    }

    // 4. CHECK 2: Impossible Distance (Teleportation/GPS Spoofing)
    if (CONFIG.checkDistance && userLat && userLng && geo.ll) {
        const ipLat = geo.ll[0];
        const ipLng = geo.ll[1];
        const distance = getDistanceKm(userLat, userLng, ipLat, ipLng);

        console.log(`[RealityCheck] Distance: GPS(${userLat}, ${userLng}) <-> IP(${ipLat}, ${ipLng}) = ${Math.round(distance)}km`);

        if (distance > MAX_DISTANCE_KM) {
            const message = `Location spoofing detected. GPS is ${Math.round(distance)}km from IP location.`;
            console.warn(`[RealityCheck] 🔴 BLOCKED - ${message}`);

            if (CONFIG.logOnly) {
                req.fraudRisk = { level: 'high', reason: 'location_spoofing', distance: Math.round(distance) };
                return next();
            }

            return res.status(403).json({
                error: 'Location Mismatch',
                message: 'GPS location does not match your network location. Please disable Fake GPS or VPN.',
                code: 'LOCATION_SPOOF',
                distance: Math.round(distance)
            });
        }
    }

    // 5. CHECK 3: Perfect Coordinates (Mock Location App Detection)
    if (CONFIG.checkPerfectCoords && userLat !== undefined && userLng !== undefined) {
        if (isPerfectCoordinate(userLat) || isPerfectCoordinate(userLng)) {
            const message = `Suspicious coordinates detected: (${userLat}, ${userLng}) - likely fake GPS`;
            console.warn(`[RealityCheck] 🟠 WARNING - ${message}`);

            // This is a softer check - log but allow with warning
            // Many older devices or indoor locations may have less precision
            req.fraudRisk = { level: 'medium', reason: 'perfect_coordinates' };

            // Only block if coordinates are EXACTLY integers
            if (userLat % 1 === 0 && userLng % 1 === 0) {
                if (!CONFIG.logOnly) {
                    return res.status(403).json({
                        error: 'Invalid GPS Data',
                        message: 'The GPS coordinates appear to be invalid. Please allow location access.',
                        code: 'INVALID_GPS'
                    });
                }
            }
        }
    }

    // 6. All checks passed - mark as verified
    req.locationVerified = true;
    req.ipLocation = {
        ip: clientIp,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        timezone: geo.timezone,
        ll: geo.ll
    };

    console.log(`[RealityCheck] ✅ Location verified for IP: ${clientIp}`);
    next();
};

/**
 * Lightweight version - just logs suspicious activity without blocking
 * Use this for less critical endpoints
 */
const logLocationRisk = (req, res, next) => {
    const originalConfig = { ...CONFIG };
    CONFIG.logOnly = true;
    detectVpnOrSpoof(req, res, () => {
        Object.assign(CONFIG, originalConfig);
        next();
    });
};

/**
 * Get IP location only (no fraud check)
 * Useful for enriching location data
 */
const enrichWithIpLocation = (req, res, next) => {
    const clientIp = requestIp.getClientIp(req);

    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        const geo = geoip.lookup(clientIp);
        if (geo) {
            req.ipLocation = {
                ip: clientIp,
                city: geo.city,
                region: geo.region,
                country: geo.country,
                timezone: geo.timezone,
                ll: geo.ll
            };
        }
    }

    next();
};

module.exports = {
    detectVpnOrSpoof,
    logLocationRisk,
    enrichWithIpLocation,
    getDistanceKm,
    isPerfectCoordinate,
    CONFIG
};
