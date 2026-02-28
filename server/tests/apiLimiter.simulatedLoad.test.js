const express = require('express');
const request = require('supertest');

function buildLimiterApp(envOverrides = {}) {
    jest.resetModules();
    process.env.NODE_ENV = envOverrides.NODE_ENV ?? 'test';
    process.env.API_RATE_LIMIT_WINDOW_MS = envOverrides.API_RATE_LIMIT_WINDOW_MS ?? '60000';
    process.env.API_RATE_LIMIT_MAX = envOverrides.API_RATE_LIMIT_MAX ?? '1';
    process.env.API_RATE_LIMIT_NORMAL_SCENARIO_MAX = envOverrides.API_RATE_LIMIT_NORMAL_SCENARIO_MAX ?? '1';
    if (Object.prototype.hasOwnProperty.call(envOverrides, 'RATE_LIMIT_ALLOW_SIMULATED_IDS')) {
        process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS = envOverrides.RATE_LIMIT_ALLOW_SIMULATED_IDS;
    } else {
        delete process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS;
    }

    // Require after env setup so limiter config is re-evaluated per test.
    // eslint-disable-next-line global-require
    const { apiLimiter } = require('../src/middleware/security');

    const app = express();
    app.use(apiLimiter);
    app.get('/api/posts', (_req, res) => res.status(200).json({ ok: true }));
    return app;
}

describe('apiLimiter simulated load behavior', () => {
    it('partitions normal load traffic by simulated user id in non-production', async () => {
        const app = buildLimiterApp({
            NODE_ENV: 'test',
            API_RATE_LIMIT_MAX: '1',
            API_RATE_LIMIT_NORMAL_SCENARIO_MAX: '1'
        });

        const first = await request(app)
            .get('/api/posts')
            .set('x-load-test-scenario', 'normal')
            .set('x-simulated-user', 'normal:u1');
        const second = await request(app)
            .get('/api/posts')
            .set('x-load-test-scenario', 'normal')
            .set('x-simulated-user', 'normal:u2');

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
    });

    it('does not trust simulated user header when load-test scenario is missing', async () => {
        const app = buildLimiterApp({
            NODE_ENV: 'test',
            API_RATE_LIMIT_MAX: '1',
            API_RATE_LIMIT_NORMAL_SCENARIO_MAX: '1'
        });

        const first = await request(app)
            .get('/api/posts')
            .set('x-simulated-user', 'normal:u1');
        const second = await request(app)
            .get('/api/posts')
            .set('x-simulated-user', 'normal:u2');

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(429);
    });
});
