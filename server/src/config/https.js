/**
 * HTTPS Configuration Module
 * Handles SSL/TLS for production deployments
 * 
 * Usage:
 * - Development: Uses HTTP (or self-signed certs)
 * - Production: Use Let's Encrypt or provided certificates
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '../..');

function resolveServerPath(targetPath) {
    if (!targetPath) return null;
    if (path.isAbsolute(targetPath)) return targetPath;
    return path.resolve(SERVER_ROOT, targetPath);
}

function parsePort(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) {
        return fallback;
    }
    return parsed;
}

/**
 * HTTPS Configuration Options
 */
const httpsConfig = {
    // SSL Certificate paths (relative to server root)
    certPath: process.env.SSL_CERT_PATH || './certs/fullchain.pem',
    keyPath: process.env.SSL_KEY_PATH || './certs/privkey.pem',
    caPath: process.env.SSL_CA_PATH || './certs/chain.pem',

    // Ports
    httpPort: parsePort(process.env.HTTP_PORT, 80),
    httpsPort: parsePort(process.env.HTTPS_PORT, 443),

    // Force HTTPS redirect
    forceHttps: process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'
};

/**
 * Load SSL certificates
 * @returns {Object|null} SSL options or null if certs not found
 */
function loadCertificates() {
    try {
        const certDir = resolveServerPath(httpsConfig.certPath);
        const keyDir = resolveServerPath(httpsConfig.keyPath);

        // Check if certificates exist
        if (!fs.existsSync(certDir) || !fs.existsSync(keyDir)) {
            console.log('📝 SSL certificates not found. Running in HTTP mode.');
            console.log('   To enable HTTPS:');
            console.log('   1. Generate certificates: npm run generate-certs');
            console.log('   2. Or use Let\'s Encrypt: certbot certonly --webroot');
            return null;
        }

        const sslOptions = {
            cert: fs.readFileSync(certDir),
            key: fs.readFileSync(keyDir)
        };

        // Add CA certificate if exists
        const caPath = resolveServerPath(httpsConfig.caPath);
        if (fs.existsSync(caPath)) {
            sslOptions.ca = fs.readFileSync(caPath);
        }

        console.log('🔒 SSL certificates loaded successfully');
        return sslOptions;

    } catch (error) {
        console.error('❌ Error loading SSL certificates:', error.message);
        return null;
    }
}

/**
 * Create HTTPS/HTTP server based on environment
 * @param {Express} app - Express application
 * @returns {Object} - Server instance and port
 */
function createSecureServer(app) {
    const sslOptions = loadCertificates();

    if (sslOptions) {
        // Production: HTTPS server
        const httpsServer = https.createServer(sslOptions, app);

        // Also create HTTP server to redirect to HTTPS
        if (httpsConfig.forceHttps) {
            const httpRedirect = http.createServer((req, res) => {
                const host = req.headers.host?.replace(/:\d+$/, '');
                res.writeHead(301, {
                    Location: `https://${host}${httpsConfig.httpsPort !== 443 ? ':' + httpsConfig.httpsPort : ''}${req.url}`
                });
                res.end();
            });

            httpRedirect.listen(httpsConfig.httpPort, () => {
                console.log(`↪️ HTTP redirecting to HTTPS on port ${httpsConfig.httpPort}`);
            });
        }

        return {
            server: httpsServer,
            port: httpsConfig.httpsPort,
            protocol: 'https'
        };
    } else {
        // Development: HTTP server
        const httpServer = http.createServer(app);
        return {
            server: httpServer,
            port: parsePort(process.env.PORT, 5000),
            protocol: 'http'
        };
    }
}

/**
 * HTTPS Redirect Middleware
 * Forces HTTPS in production
 */
const enforceHttps = (req, res, next) => {
    // Skip in development
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // Check if already HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        return next();
    }

    // Redirect to HTTPS
    const host = req.headers.host?.replace(/:\d+$/, '');
    const httpsUrl = `https://${host}${httpsConfig.httpsPort !== 443 ? ':' + httpsConfig.httpsPort : ''}${req.url}`;

    console.log(`[HTTPS] Redirecting ${req.url} to HTTPS`);
    return res.redirect(301, httpsUrl);
};

/**
 * HSTS (HTTP Strict Transport Security) Middleware
 * Tells browsers to always use HTTPS
 */
const enableHSTS = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        // Max-age: 1 year, include subdomains, preload eligible
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }
    next();
};

/**
 * Generate self-signed certificate for development
 * Run: node -e "require('./src/config/https').generateDevCerts()"
 */
async function generateDevCerts() {
    const { execSync } = require('child_process');
    const certDir = path.resolve(__dirname, '../../certs');

    // Create certs directory
    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }

    console.log('🔐 Generating self-signed certificates for development...');

    try {
        execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ${path.join(certDir, 'privkey.pem')} \
            -out ${path.join(certDir, 'fullchain.pem')} \
            -subj "/CN=localhost/O=MHub Development"`,
            { stdio: 'inherit' }
        );
        console.log('✅ Development certificates generated in /server/certs/');
    } catch (error) {
        console.error('❌ Failed to generate certificates. Make sure OpenSSL is installed.');
    }
}

module.exports = {
    httpsConfig,
    loadCertificates,
    createSecureServer,
    enforceHttps,
    enableHSTS,
    generateDevCerts
};
