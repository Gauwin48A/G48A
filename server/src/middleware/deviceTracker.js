/**
 * Device Fingerprinting & Tracking (Postgres-backed)
 * Detects new devices and flags suspicious activity
 */
const crypto = require('crypto');
const pool = require('../config/db');
const { logSecurityEvent, EVENTS } = require('../config/auditLogger');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

/**
 * Generate device fingerprint from request headers
 */
const generateDeviceFingerprint = (req) => {
    const components = [
        req.get('User-Agent') || '',
        req.get('Accept-Language') || '',
        req.get('Accept-Encoding') || '',
        req.ip || ''
    ];

    return crypto
        .createHash('sha256')
        .update(components.join('|'))
        .digest('hex')
        .substring(0, 32);
};

/**
 * Get device info from User-Agent
 */
const parseDeviceInfo = (userAgent) => {
    if (!userAgent) return { type: 'Unknown', os: 'Unknown', browser: 'Unknown' };

    const ua = userAgent.toLowerCase();

    let type = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        type = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        type = 'Tablet';
    }

    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';

    return { type, os, browser };
};

/**
 * Check if device is known for user (Postgres-backed)
 */
const checkDevice = async (userId, req) => {
    const fingerprint = generateDeviceFingerprint(req);
    const deviceInfo = parseDeviceInfo(req.get('User-Agent'));
    const ip = req.ip || 'unknown';

    try {
        // Check if device exists
        const result = await runQuery(`
            SELECT
                id,
                user_id,
                fingerprint,
                device_type,
                os,
                browser,
                ip_address,
                first_seen,
                last_seen,
                is_trusted
            FROM user_devices
            WHERE user_id = $1 AND fingerprint = $2
        `, [userId, fingerprint]);

        if (result.rows.length === 0) {
            // New device - insert it
            await runQuery(`
                INSERT INTO user_devices (user_id, fingerprint, device_type, os, browser, ip_address)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, fingerprint) DO NOTHING
            `, [userId, fingerprint, deviceInfo.type, deviceInfo.os, deviceInfo.browser, ip]);

            logSecurityEvent(EVENTS.NEW_DEVICE_LOGIN, {
                userId,
                fingerprint: fingerprint.substring(0, 8) + '...',
                device: deviceInfo,
                ip
            });

            return { isNew: true, deviceInfo: { fingerprint, ...deviceInfo, ip } };
        }

        // Update last seen
        await runQuery(`
            UPDATE user_devices SET last_seen = NOW(), ip_address = $3
            WHERE user_id = $1 AND fingerprint = $2
        `, [userId, fingerprint, ip]);

        return { isNew: false, deviceInfo: result.rows[0] };
    } catch (err) {
        logger.error('[DeviceTracker] Error:', err.message);
        return { isNew: false, deviceInfo: { fingerprint, ...deviceInfo } };
    }
};

/**
 * Middleware to check device on authenticated requests
 */
const deviceTrackerMiddleware = async (req, res, next) => {
    if (req.user) {
        const userId = req.user.userId || req.user.id;
        if (userId) {
            const { isNew, deviceInfo } = await checkDevice(userId, req);
            req.deviceInfo = deviceInfo;
            req.isNewDevice = isNew;
        }
    }
    next();
};

module.exports = { generateDeviceFingerprint, checkDevice, deviceTrackerMiddleware, parseDeviceInfo };
