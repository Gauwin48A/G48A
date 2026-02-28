const express = require('express');
const request = require('supertest');

function buildApp(envOverrides = {}) {
  jest.resetModules();
  process.env.WAF_BOT_PROTECTION_ENABLED = envOverrides.WAF_BOT_PROTECTION_ENABLED ?? 'false';
  process.env.WAF_BLOCKED_COUNTRIES = envOverrides.WAF_BLOCKED_COUNTRIES ?? '';
  process.env.WAF_LOGIN_MAX_REQ_PER_MINUTE = envOverrides.WAF_LOGIN_MAX_REQ_PER_MINUTE ?? '2';

  // Require after env setup so limiter thresholds are picked up for each app instance.
  // eslint-disable-next-line global-require
  const { wafEvidenceHeaders, wafRequestFilter, strictLoginLimiter } = require('../src/middleware/wafEnforcement');

  const app = express();
  app.use(express.json());
  app.use(wafEvidenceHeaders);
  app.use(wafRequestFilter);

  app.get('/api/posts', (req, res) => res.json({ ok: true }));
  app.post('/api/posts', (req, res) => res.status(201).json({ created: true }));
  app.post('/api/auth/login', strictLoginLimiter, (req, res) => res.json({ success: true }));

  return app;
}

describe('WAF Enforcement', () => {
  it('adds WAF evidence header on requests', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/posts');
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-waf-enforced']).toBe('true');
  });

  it('blocks SQL injection-style payloads', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/posts?search=1%20UNION%20SELECT%20password%20FROM%20users');
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('WAF_SQLI_BLOCK');
  });

  it('blocks XSS payloads', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/posts').send({
      title: '<script>alert(1)</script>',
      description: 'xss attempt'
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('WAF_XSS_BLOCK');
  });

  it('blocks configured geo countries', async () => {
    const app = buildApp({ WAF_BLOCKED_COUNTRIES: 'ZZ,AA' });
    const res = await request(app).get('/api/posts').set('cf-ipcountry', 'ZZ');
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('WAF_GEO_BLOCK');
  });

  it('enforces strict login rate limiting', async () => {
    const app = buildApp({ WAF_LOGIN_MAX_REQ_PER_MINUTE: '2' });
    const first = await request(app).post('/api/auth/login').send({ identifier: 'test', password: 'pass' });
    const second = await request(app).post('/api/auth/login').send({ identifier: 'test', password: 'pass' });
    const third = await request(app).post('/api/auth/login').send({ identifier: 'test', password: 'pass' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.body.code).toBe('WAF_RATE_LIMIT');
  });
});
