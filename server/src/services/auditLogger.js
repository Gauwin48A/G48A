/**
 * AUDIT LOGGER SERVICE
 * The Watchtower - Logs every sensitive action to the database
 * 
 * Features:
 * - Fire-and-forget logging (non-blocking)
 * - Device fingerprinting
 * - IP tracking
 * - Immutable security trail
 */

const pool = require('../config/db');
const MAX_AUDIT_LOG_LIMIT = 200;

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

// Action types for consistency
const AUDIT_ACTIONS = {
    // Authentication
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',

    // 2FA
    TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
    TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
    TWO_FACTOR_FAILED: 'TWO_FACTOR_FAILED',

    // Account
    ACCOUNT_CREATED: 'ACCOUNT_CREATED',
    ACCOUNT_DELETED: 'ACCOUNT_DELETED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    EMAIL_CHANGED: 'EMAIL_CHANGED',

    // Security Events
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
    NEW_DEVICE_LOGIN: 'NEW_DEVICE_LOGIN',

    // Data Access
    DATA_EXPORTED: 'DATA_EXPORTED',
    SENSITIVE_DATA_ACCESSED: 'SENSITIVE_DATA_ACCESSED'
};

/**
 * Extract client IP from request
 */
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || 'unknown';
};

/**
 * Generate simple device fingerprint from request headers
 */
const getDeviceFingerprint = (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLang = req.headers['accept-language'] || '';
    const acceptEnc = req.headers['accept-encoding'] || '';

    // Simple hash-like fingerprint
    const fingerprint = Buffer.from(`${userAgent}|${acceptLang}|${acceptEnc}`)
        .toString('base64')
        .substring(0, 32);

    return fingerprint;
};

/**
 * Log an audit event (Fire and Forget)
 * 
 * @param {Object} options
 * @param {number|null} options.userId - User ID (null for anonymous)
 * @param {string} options.action - Action type from AUDIT_ACTIONS
 * @param {Object} options.req - Express request object
 * @param {Object} options.details - Additional details (JSON)
 */
const logAudit = async ({ userId = null, action, req, details = {} }) => {
    // Fire and forget - don't await in caller
    try {
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const fingerprint = getDeviceFingerprint(req);

        // Add fingerprint to details
        const enrichedDetails = {
            ...details,
            deviceFingerprint: fingerprint,
            timestamp: new Date().toISOString()
        };

        await pool.query(
            `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details) 
       VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, ip, userAgent, JSON.stringify(enrichedDetails)]
        );

        // Log high-severity events to console for monitoring
        if (['BRUTE_FORCE_DETECTED', 'SUSPICIOUS_ACTIVITY', 'LOGIN_FAILED'].includes(action)) {
            console.warn(`[SECURITY AUDIT] ${action} - IP: ${ip} - User: ${userId || 'anonymous'}`);
        }
    } catch (err) {
        // Never fail the main request due to audit logging
        console.error('[AUDIT LOGGER] Failed to log:', err.message);
    }
};

/**
 * Log a security event (for alerting)
 */
const logSecurityEvent = async ({ eventType, userId = null, ip, severity = 'MEDIUM', details = {} }) => {
    try {
        await pool.query(
            `INSERT INTO security_events (event_type, user_id, ip_address, severity, details) 
       VALUES ($1, $2, $3, $4, $5)`,
            [eventType, userId, ip, severity, JSON.stringify(details)]
        );

        // Critical events - could trigger alerts (email, SMS, etc.)
        if (severity === 'CRITICAL') {
            console.error(`[CRITICAL SECURITY EVENT] ${eventType} - IP: ${ip}`);
            // TODO: Integrate with alerting system (email, Slack, etc.)
        }
    } catch (err) {
        console.error('[SECURITY EVENT LOGGER] Failed:', err.message);
    }
};

/**
 * Get audit logs for a user (for account activity page)
 */
const getUserAuditLogs = async (userId, limit = 50) => {
    try {
        const safeLimit = parsePositiveInt(limit, 50, MAX_AUDIT_LOG_LIMIT);
        const result = await pool.query(
            `SELECT action, ip_address, user_agent, details, created_at 
       FROM audit_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
            [userId, safeLimit]
        );
        return result.rows;
    } catch (err) {
        console.error('[AUDIT LOGGER] Failed to fetch logs:', err.message);
        return [];
    }
};

module.exports = {
    logAudit,
    logSecurityEvent,
    getUserAuditLogs,
    getClientIP,
    getDeviceFingerprint,
    AUDIT_ACTIONS
};
