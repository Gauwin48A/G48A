/**
 * Audit Logger - Security Event Tracking
 * Logs to BOTH file and PostgreSQL for persistence
 */
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const LOG_DIR = path.join(__dirname, '../../logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log a security event (Postgres-backed + file)
 * @param {string} event - Event type
 * @param {object} details - Event details
 */
const logSecurityEvent = async (event, details = {}) => {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        ...details,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent?.substring(0, 200) || 'unknown'
    };

    const logLine = JSON.stringify(entry) + '\n';

    // 1. Write to file (sync for simplicity)
    fs.appendFile(AUDIT_LOG_FILE, logLine, (err) => {
        if (err) console.error('[AuditLogger] File write failed:', err.message);
    });

    // 2. Write to PostgreSQL (async, fire-and-forget)
    try {
        await pool.query(`
            INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            details.userId || null,
            event,
            entry.ip,
            entry.userAgent,
            JSON.stringify(details)
        ]);
    } catch (err) {
        // Don't crash on audit failure, just log
        console.error('[AuditLogger] DB write failed:', err.message);
    }

    // Console log in development
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUDIT] ${event}:`, JSON.stringify(details));
    }
};

// Pre-defined event types
const EVENTS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    TWO_FA_ENABLED: 'TWO_FA_ENABLED',
    TWO_FA_DISABLED: 'TWO_FA_DISABLED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    NEW_DEVICE_LOGIN: 'NEW_DEVICE_LOGIN',
    NEW_LOCATION_LOGIN: 'NEW_LOCATION_LOGIN',
    DATA_EXPORT: 'DATA_EXPORT',
    ACCOUNT_DELETED: 'ACCOUNT_DELETED'
};

module.exports = { logSecurityEvent, EVENTS };
