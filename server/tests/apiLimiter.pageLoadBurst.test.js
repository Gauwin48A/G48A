const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

function buildPageBurstApp(envOverrides = {}) {
    jest.resetModules();
    process.env.NODE_ENV = envOverrides.NODE_ENV ?? 'test';
    process.env.API_RATE_LIMIT_WINDOW_MS = envOverrides.API_RATE_LIMIT_WINDOW_MS ?? '60000';
    process.env.API_RATE_LIMIT_MAX = envOverrides.API_RATE_LIMIT_MAX ?? '3';
    process.env.API_RATE_LIMIT_AUTHENTICATED_MAX = envOverrides.API_RATE_LIMIT_AUTHENTICATED_MAX ?? '8';
    process.env.API_RATE_LIMIT_NORMAL_SCENARIO_MAX = envOverrides.API_RATE_LIMIT_NORMAL_SCENARIO_MAX ?? '8';
    process.env.JWT_SECRET = envOverrides.JWT_SECRET ?? 'burst_test_jwt_secret_12345678901234567890';
    process.env.REFRESH_SECRET = envOverrides.REFRESH_SECRET ?? 'burst_test_refresh_secret_123456789012345';
    process.env.JWT_ISSUER = envOverrides.JWT_ISSUER ?? 'mhub-api';
    process.env.JWT_AUDIENCE = envOverrides.JWT_AUDIENCE ?? 'mhub-client';
    delete process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS;

    // Require after env setup so limiter config is re-evaluated per test.
    // eslint-disable-next-line global-require
    const { apiLimiter } = require('../src/middleware/security');

    const app = express();
    app.use(apiLimiter);
    app.get('/api/test/profile', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/test/profile/preferences', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/test/posts/mine', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/test/rewards/user/u-1', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/test/channels/owner/u-1', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/test/categories', (_req, res) => res.status(200).json({ ok: true }));
    return app;
}

function buildToken(userId, secret = process.env.JWT_SECRET) {
    return jwt.sign(
        { userId },
        secret,
        {
            expiresIn: '5m',
            issuer: process.env.JWT_ISSUER || 'mhub-api',
            audience: process.env.JWT_AUDIENCE || 'mhub-client'
        }
    );
}

describe('apiLimiter page-load burst contract', () => {
    it('allows a normal authenticated profile page burst without 429', async () => {
        const app = buildPageBurstApp({
            API_RATE_LIMIT_MAX: '3',
            API_RATE_LIMIT_AUTHENTICATED_MAX: '8'
        });
        const token = buildToken('u-1');
        const headers = { Authorization: `Bearer ${token}` };
        const paths = [
            '/api/test/profile',
            '/api/test/profile/preferences',
            '/api/test/posts/mine',
            '/api/test/rewards/user/u-1',
            '/api/test/channels/owner/u-1',
            '/api/test/categories'
        ];

        const responses = await Promise.all(
            paths.map((route) => request(app).get(route).set(headers))
        );

        expect(responses.every((response) => response.statusCode === 200)).toBe(true);
        expect(responses.some((response) => response.statusCode === 429)).toBe(false);
    });

    it('still throttles anonymous bursts to protect public surface', async () => {
        const app = buildPageBurstApp({
            API_RATE_LIMIT_MAX: '3',
            API_RATE_LIMIT_AUTHENTICATED_MAX: '8'
        });

        const responses = await Promise.all([
            request(app).get('/api/test/profile'),
            request(app).get('/api/test/profile/preferences'),
            request(app).get('/api/test/posts/mine'),
            request(app).get('/api/test/categories')
        ]);

        expect(responses[0].statusCode).toBe(200);
        expect(responses[1].statusCode).toBe(200);
        expect(responses[2].statusCode).toBe(200);
        expect(responses[3].statusCode).toBe(429);
    });
});
