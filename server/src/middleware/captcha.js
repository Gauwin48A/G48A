/**
 * reCAPTCHA v3 Integration
 * Protects login/signup from bots
 */
const https = require('https');

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_THRESHOLD = 0.5; // Score threshold (0.0 = bot, 1.0 = human)

/**
 * Verify reCAPTCHA token with Google
 * @param {string} token - reCAPTCHA token from client
 * @param {string} expectedAction - Expected action name
 * @returns {Promise<{success: boolean, score: number, action: string}>}
 */
const verifyRecaptcha = async (token, expectedAction = 'login') => {
    if (!RECAPTCHA_SECRET) {
        console.log('[CAPTCHA] Secret not configured, skipping verification');
        return { success: true, score: 1.0, action: expectedAction, skipped: true };
    }

    if (!token) {
        return { success: false, score: 0, error: 'No token provided' };
    }

    return new Promise((resolve) => {
        const postData = `secret=${RECAPTCHA_SECRET}&response=${token}`;

        const options = {
            hostname: 'www.google.com',
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({
                        success: result.success && result.score >= RECAPTCHA_THRESHOLD,
                        score: result.score || 0,
                        action: result.action,
                        hostname: result.hostname
                    });
                } catch {
                    resolve({ success: false, score: 0, error: 'Parse error' });
                }
            });
        });

        req.on('error', (err) => {
            console.error('[CAPTCHA] Verification error:', err.message);
            // Fail open for availability
            resolve({ success: true, score: 0.5, error: 'Network error', failedOpen: true });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: true, score: 0.5, error: 'Timeout', failedOpen: true });
        });

        req.write(postData);
        req.end();
    });
};

/**
 * Middleware to verify reCAPTCHA on protected routes
 * Add to login/signup routes
 */
const captchaMiddleware = (action = 'login') => async (req, res, next) => {
    // Skip if not configured
    if (!RECAPTCHA_SECRET) {
        return next();
    }

    const token = req.body.captchaToken || req.headers['x-captcha-token'];

    if (!token) {
        return res.status(400).json({ error: 'CAPTCHA verification required' });
    }

    const result = await verifyRecaptcha(token, action);

    if (!result.success && !result.failedOpen) {
        return res.status(403).json({
            error: 'CAPTCHA verification failed. Please try again.',
            score: result.score
        });
    }

    req.captchaScore = result.score;
    next();
};

module.exports = { verifyRecaptcha, captchaMiddleware };
