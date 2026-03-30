/**
 * Auth Diagnostic Logger Middleware
 * =============================================================================
 * Logs authentication-related information for debugging session issues.
 * Enable in development by adding to routes that have auth problems.
 *
 * Usage: router.get('/debug-path', authLogger, protect, controller.method);
 */

const { getBearerTokenFromHeader } = require('../utils/requestAuth');

const authLogger = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const hasCookie = Boolean(req.cookies?.accessToken);
    const hasRefreshCookie = Boolean(req.cookies?.refreshToken);
    const token = getBearerTokenFromHeader(authHeader);
    const hasBearer = Boolean(token);

    console.log('\n[AUTH-DEBUG] ===================================');
    console.log(`  METHOD/PATH: ${req.method} ${req.path}`);
    console.log(`  COOKIE TOKEN: ${hasCookie ? 'Present' : 'Missing'}`);
    console.log(`  REFRESH COOKIE: ${hasRefreshCookie ? 'Present' : 'Missing'}`);
    console.log(`  BEARER TOKEN: ${hasBearer ? 'Present' : 'Missing'}`);

    if (token) {
        const previewEndIndex = Math.max(0, token.length - 10);
        console.log(`  TOKEN PREVIEW: ${token.substring(0, 20)}...${token.substring(previewEndIndex)}`);

        // Try to decode without verification to inspect payload for debugging only.
        try {
            const base64Payload = token.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
            console.log(`  USER ID: ${payload.id || payload.userId || 'N/A'}`);
            console.log(`  EXPIRES: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A'}`);

            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.log('  TOKEN STATUS: EXPIRED');
            }
        } catch {
            console.log('  PAYLOAD: Unable to decode token payload');
        }
    }

    console.log(`  IP: ${req.ip || req.headers['x-forwarded-for'] || 'Unknown'}`);
    console.log('[AUTH-DEBUG] ===================================\n');

    next();
};

module.exports = authLogger;
