const fs = require('fs');
const path = require('path');

const serverRoot = path.resolve(__dirname, '..');
const certsDir = path.join(serverRoot, 'certs');

function withEnv(overrides, fn) {
    const previous = new Map();
    for (const [key, value] of Object.entries(overrides)) {
        previous.set(key, process.env[key]);
        process.env[key] = value;
    }

    try {
        return fn();
    } finally {
        for (const [key, oldValue] of previous.entries()) {
            if (oldValue === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = oldValue;
            }
        }
    }
}

describe('https config', () => {
    beforeAll(() => {
        fs.mkdirSync(certsDir, { recursive: true });
    });

    afterEach(() => {
        jest.resetModules();
    });

    it('loads relative cert paths from server root', () => {
        const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const certName = `test-fullchain-${suffix}.pem`;
        const keyName = `test-privkey-${suffix}.pem`;
        const caName = `test-chain-${suffix}.pem`;
        const certPath = path.join(certsDir, certName);
        const keyPath = path.join(certsDir, keyName);
        const caPath = path.join(certsDir, caName);

        fs.writeFileSync(certPath, 'CERT_DATA', 'utf8');
        fs.writeFileSync(keyPath, 'KEY_DATA', 'utf8');
        fs.writeFileSync(caPath, 'CA_DATA', 'utf8');

        try {
            withEnv({
                SSL_CERT_PATH: `./certs/${certName}`,
                SSL_KEY_PATH: `./certs/${keyName}`,
                SSL_CA_PATH: `./certs/${caName}`
            }, () => {
                const { loadCertificates } = require('../src/config/https');
                const sslOptions = loadCertificates();

                expect(sslOptions).not.toBeNull();
                expect(sslOptions.cert.toString()).toBe('CERT_DATA');
                expect(sslOptions.key.toString()).toBe('KEY_DATA');
                expect(sslOptions.ca.toString()).toBe('CA_DATA');
            });
        } finally {
            [certPath, keyPath, caPath].forEach((filePath) => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    });

    it('falls back to safe defaults for invalid port env values', () => {
        withEnv(
            {
                HTTP_PORT: 'abc',
                HTTPS_PORT: '70000',
                PORT: '0',
                SSL_CERT_PATH: './certs/non-existent-cert.pem',
                SSL_KEY_PATH: './certs/non-existent-key.pem'
            },
            () => {
                const { httpsConfig, createSecureServer } = require('../src/config/https');

                expect(httpsConfig.httpPort).toBe(80);
                expect(httpsConfig.httpsPort).toBe(443);

                const app = () => {};
                const serverInfo = createSecureServer(app);
                expect(serverInfo.port).toBe(5000);
            }
        );
    });
});
