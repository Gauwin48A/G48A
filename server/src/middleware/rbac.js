/**
 * Role-Based Access Control (RBAC) Middleware
 * Architect Cleanup - Phase 2
 * 
 * Controls access to routes based on user roles
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function getRequestUserId(req) {
    return String(req.user?.user_id || req.user?.userId || req.user?.id || '').trim() || null;
}

/**
 * Check if user has required role
 * @param {string|string[]} allowedRoles - Role(s) that can access the route
 */
const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            // User must be authenticated first
            const userId = getRequestUserId(req);
            if (!req.user || !userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Get user's role from database
            const result = await runQuery(
                `
                    SELECT COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user') AS role
                    FROM users u
                    WHERE u.user_id::text = $1
                    LIMIT 1
                `,
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            const userRole = String(result.rows[0].role || 'user').toLowerCase();

            // Flatten allowed roles array
            const roles = allowedRoles.flat().map((role) => String(role || '').toLowerCase()).filter(Boolean);

            // Check if user's role is in allowed roles
            if (!roles.includes(userRole)) {
                logger.info(`[RBAC] Access denied: User ${userId} with role '${userRole}' tried to access route requiring ${roles.join('/')}`);
                return res.status(403).json({
                    error: 'Access denied. Insufficient permissions.',
                    code: 'FORBIDDEN',
                    required: roles,
                    current: userRole
                });
            }

            // Attach role to request for downstream use
            req.userRole = userRole;
            next();
        } catch (error) {
            logger.error('[RBAC] Error checking role:', error);
            return res.status(500).json({
                error: 'Authorization check failed',
                code: 'RBAC_ERROR'
            });
        }
    };
};

/**
 * Require admin role
 */
const requireAdmin = requireRole('admin', 'superadmin');

/**
 * Require seller role (or admin)
 */
const requireSeller = requireRole('seller', 'admin', 'superadmin');

/**
 * Require verified user
 */
const requireVerified = async (req, res, next) => {
    try {
        const userId = getRequestUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await runQuery(
            'SELECT is_verified FROM users WHERE user_id::text = $1',
            [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_verified) {
            return res.status(403).json({
                error: 'Account verification required',
                code: 'VERIFICATION_REQUIRED'
            });
        }

        next();
    } catch (error) {
        logger.error('[RBAC] Verification check error:', error);
        return res.status(500).json({ error: 'Verification check failed' });
    }
};

module.exports = {
    requireRole,
    requireAdmin,
    requireSeller,
    requireVerified
};
