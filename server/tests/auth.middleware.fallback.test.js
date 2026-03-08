const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

function buildApp(options = {}) {
  jest.resetModules();
  const previousAuthDebug = process.env.AUTH_DEBUG;
  if (Object.prototype.hasOwnProperty.call(options, 'authDebug')) {
    process.env.AUTH_DEBUG = options.authDebug ? 'true' : 'false';
  } else {
    delete process.env.AUTH_DEBUG;
  }

  const verifyTokenMock = jest.fn((token) => {
    if (token === 'valid-header-token') {
      return { id: 101, source: 'header' };
    }
    if (token === 'valid-cookie-token') {
      return { id: 202, source: 'cookie' };
    }
    throw new Error('invalid token');
  });

  jest.doMock('../src/services/tokenVerificationCache', () => ({
    verifyToken: verifyTokenMock
  }));

  // eslint-disable-next-line global-require
  const { protect, optionalAuth } = require('../src/middleware/auth');
  if (previousAuthDebug === undefined) {
    delete process.env.AUTH_DEBUG;
  } else {
    process.env.AUTH_DEBUG = previousAuthDebug;
  }

  const app = express();
  app.use(cookieParser());
  app.get('/protected', protect, (req, res) => {
    res.status(200).json({ id: req.user.id, source: req.user.source });
  });
  app.get('/optional', optionalAuth, (req, res) => {
    res.status(200).json({ hasUser: Boolean(req.user), source: req.user?.source || null });
  });

  return { app, verifyTokenMock };
}

describe('auth middleware token fallback', () => {
  afterEach(() => {
    jest.dontMock('../src/services/tokenVerificationCache');
  });

  it('accepts valid header token when cookie token is stale', async () => {
    const { app, verifyTokenMock } = buildApp();

    const response = await request(app)
      .get('/protected')
      .set('Cookie', ['accessToken=stale-cookie-token'])
      .set('Authorization', 'Bearer valid-header-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ id: 101, source: 'header' });
    expect(verifyTokenMock).toHaveBeenCalledWith('stale-cookie-token', expect.any(String));
    expect(verifyTokenMock).toHaveBeenCalledWith('valid-header-token', expect.any(String));
  });

  it('accepts valid cookie token when header token is stale', async () => {
    const { app, verifyTokenMock } = buildApp();

    const response = await request(app)
      .get('/protected')
      .set('Cookie', ['accessToken=valid-cookie-token'])
      .set('Authorization', 'Bearer stale-header-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ id: 202, source: 'cookie' });
    expect(verifyTokenMock).toHaveBeenCalledWith('valid-cookie-token', expect.any(String));
  });

  it('returns 401 when all available tokens are invalid', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .get('/protected')
      .set('Cookie', ['accessToken=stale-cookie-token'])
      .set('Authorization', 'Bearer stale-header-token');

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('does not emit auth verification logs when AUTH_DEBUG is disabled', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = buildApp({ authDebug: false });

    const response = await request(app)
      .get('/protected')
      .set('Cookie', ['accessToken=stale-cookie-token'])
      .set('Authorization', 'Bearer stale-header-token');

    expect(response.statusCode).toBe(401);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits debug warnings for invalid tokens when AUTH_DEBUG is enabled', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = buildApp({ authDebug: true });

    const response = await request(app)
      .get('/protected')
      .set('Cookie', ['accessToken=stale-cookie-token'])
      .set('Authorization', 'Bearer stale-header-token');

    expect(response.statusCode).toBe(401);
    expect(warnSpy).toHaveBeenCalledWith(
      '[AUTH] Token verification failed | Path:',
      '/protected',
    );
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('keeps optional auth as anonymous when all tokens are invalid', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .get('/optional')
      .set('Cookie', ['accessToken=stale-cookie-token'])
      .set('Authorization', 'Bearer stale-header-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ hasUser: false, source: null });
  });
});
