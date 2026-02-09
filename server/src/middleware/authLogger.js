/**
 * Auth Diagnostic Logger Middleware
 * =============================================================================
 * Logs authentication-related information for debugging session issues.
 * Enable in development by adding to routes that have auth problems.
 * 
 * Usage: router.get('/debug-path', authLogger, protect, controller.method);
 */

const authLogger = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const hasCookie = !!req.cookies?.accessToken;
    const hasRefreshCookie = !!req.cookies?.refreshToken;
    const hasBearer = !!authHeader?.startsWith('Bearer ');

    console.log(`\n[AUTH-DEBUG] ═══════════════════════════════════`);
    console.log(`  📍 ${req.method} ${req.path}`);
    console.log(`  🍪 Cookie Token: ${hasCookie ? '✅ Present' : '❌ Missing'}`);
    console.log(`  🔄 Refresh Cookie: ${hasRefreshCookie ? '✅ Present' : '❌ Missing'}`);
    console.log(`  🔑 Bearer Token: ${hasBearer ? '✅ Present' : '❌ Missing'}`);

    if (hasBearer) {
        const token = authHeader.split(' ')[1];
        console.log(`  📋 Token Preview: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);

        // Try to decode without verification to see payload
        try {
            const base64Payload = token.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
            console.log(`  👤 User ID: ${payload.id || payload.userId || 'N/A'}`);
            console.log(`  ⏰ Expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A'}`);

            // Check if expired
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.log(`  ⚠️ TOKEN EXPIRED!`);
            }
        } catch (e) {
            console.log(`  ⚠️ Could not decode token payload`);
        }
    }

    console.log(`  🌐 IP: ${req.ip || req.headers['x-forwarded-for'] || 'Unknown'}`);
    console.log(`[AUTH-DEBUG] ═══════════════════════════════════\n`);

    next();
};

module.exports = authLogger;
