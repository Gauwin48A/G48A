/**
 * Password Breach Checker
 * Uses HaveIBeenPwned API with k-anonymity (safe, no full password sent)
 */
const crypto = require('crypto');
const https = require('https');

/**
 * Check if password has been exposed in data breaches
 * @param {string} password - The password to check
 * @returns {Promise<{breached: boolean, count: number}>}
 */
const checkPasswordBreach = async (password) => {
    try {
        // Hash the password with SHA-1
        const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
        const prefix = sha1.substring(0, 5);
        const suffix = sha1.substring(5);

        // Query HIBP API with k-anonymity (only send first 5 chars of hash)
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.pwnedpasswords.com',
                path: `/range/${prefix}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'MHub-Security-Check'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            req.end();
        });

        // Check if our password suffix is in the response
        const lines = response.split('\n');
        for (const line of lines) {
            const [hashSuffix, count] = line.split(':');
            if (hashSuffix.trim() === suffix) {
                return { breached: true, count: parseInt(count.trim(), 10) };
            }
        }

        return { breached: false, count: 0 };
    } catch (error) {
        console.error('[BreachCheck] Error:', error.message);
        // On error, allow the password (fail open for availability)
        return { breached: false, count: 0, error: true };
    }
};

/**
 * Middleware to check password on registration/change
 */
const breachCheckMiddleware = async (req, res, next) => {
    const password = req.body.password || req.body.newPassword;

    if (!password) {
        return next();
    }

    try {
        const result = await checkPasswordBreach(password);
        if (result.breached) {
            return res.status(400).json({
                error: 'This password has been exposed in data breaches. Please choose a different password.',
                breachCount: result.count
            });
        }
        next();
    } catch {
        // Fail open - allow password if check fails
        next();
    }
};

module.exports = { checkPasswordBreach, breachCheckMiddleware };
