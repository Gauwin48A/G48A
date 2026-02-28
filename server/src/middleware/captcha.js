/**
 * reCAPTCHA v3 Integration
 * Protects login/signup from bots
 */
const https = require('https');

const DEFAULT_RECAPTCHA_THRESHOLD = 0.5; // Score threshold (0.0 = bot, 1.0 = human)

function getRecaptchaSecret(env = process.env) {
    return env.RECAPTCHA_SECRET_KEY;
}

function getRecaptchaThreshold(env = process.env) {
    const parsed = Number.parseFloat(env.RECAPTCHA_THRESHOLD || '');
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
    }
    return DEFAULT_RECAPTCHA_THRESHOLD;
}

function normalizeAction(action) {
    return String(action || '').trim().toLowerCase();
}

/**
 * Verify reCAPTCHA token with Google
 * @param {string} token - reCAPTCHA token from client
 * @param {string} expectedAction - Expected action name
 * @returns {Promise<{success: boolean, score: number, action: string}>}
 */
const verifyRecaptcha = async (token, expectedAction = 'login', env = process.env) => {
    const recaptchaSecret = getRecaptchaSecret(env);
    const recaptchaThreshold = getRecaptchaThreshold(env);

    if (!recaptchaSecret) {
        console.log('[CAPTCHA] Secret not configured, skipping verification');
        return { success: true, score: 1.0, action: expectedAction, skipped: true };
    }

    if (!token) {
        return { success: false, score: 0, error: 'No token provided' };
    }

    return new Promise((resolve) => {
        const postData = `secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(token)}`;

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
                    const score = Number(result.score) || 0;
                    const actionMatches = !normalizeAction(expectedAction)
                        || normalizeAction(result.action) === normalizeAction(expectedAction);
                    resolve({
                        success: Boolean(result.success) && score >= recaptchaThreshold && actionMatches,
                        score,
                        action: result.action,
                        actionMatches,
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
    const recaptchaSecret = getRecaptchaSecret();

    // Skip if not configured
    if (!recaptchaSecret) {
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
            score: result.score,
            actionMatches: result.actionMatches ?? null
        });
    }

    req.captchaScore = result.score;
    next();
};

module.exports = { verifyRecaptcha, captchaMiddleware };
