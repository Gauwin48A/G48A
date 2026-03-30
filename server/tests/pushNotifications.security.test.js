jest.mock('../src/services/fcm', () => ({
  registerToken: jest.fn(),
  unregisterToken: jest.fn(),
  sendToUser: jest.fn(),
  sendToMultiple: jest.fn()
}));

jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/middleware/auth', () => ({
  protect: (req, res, next) => {
    const userId = req.headers['x-test-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = {
      userId: String(userId),
      role: req.headers['x-test-role'] || null
    };
    return next();
  }
}));

const express = require('express');
const request = require('supertest');
const router = require('../src/routes/pushNotifications');
const fcm = require('../src/services/fcm');
const pool = require('../src/config/db');

describe('pushNotifications route security', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/push', router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('register binds token to authenticated user, ignoring spoofed body userId', async () => {
    fcm.registerToken.mockResolvedValueOnce({ success: true });

    const response = await request(app)
      .post('/api/push/register')
      .set('x-test-user-id', 'user-1')
      .send({
        token: 'token-123',
        userId: 'user-2',
        deviceType: 'android',
        deviceName: 'Pixel'
      });

    expect(response.status).toBe(200);
    expect(fcm.registerToken).toHaveBeenCalledWith('user-1', 'token-123', 'android', 'Pixel');
  });

  it('unregister rejects token when it does not belong to authenticated user', async () => {
    fcm.unregisterToken.mockResolvedValueOnce({ success: true, deactivatedCount: 0 });

    const response = await request(app)
      .delete('/api/push/unregister')
      .set('x-test-user-id', 'user-1')
      .send({ token: 'token-123' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Token not found for user');
    expect(fcm.unregisterToken).toHaveBeenCalledWith('token-123', 'user-1');
  });

  it('send endpoint blocks non-admin users', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ role: 'user' }] });

    const response = await request(app)
      .post('/api/push/send')
      .set('x-test-user-id', 'user-1')
      .send({
        userId: 'target-user',
        title: 'Hello',
        body: 'Test'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin access required');
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });

  it('send endpoint allows admin role from authenticated context', async () => {
    fcm.sendToUser.mockResolvedValueOnce({ success: true });

    const response = await request(app)
      .post('/api/push/send')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin')
      .send({
        userId: 'target-user',
        title: 'Hello',
        body: 'Test',
        data: { type: 'system' }
      });

    expect(response.status).toBe(200);
    expect(fcm.sendToUser).toHaveBeenCalledWith('target-user', 'Hello', 'Test', { type: 'system' });
  });

  it('broadcast allows DB-verified admin and sends to active tokens', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // admin check
      .mockResolvedValueOnce({
        rows: [{ token: 'tok-1' }, { token: 'tok-2' }]
      }); // active tokens
    fcm.sendToMultiple.mockResolvedValueOnce({ success: true, successCount: 2 });

    const response = await request(app)
      .post('/api/push/broadcast')
      .set('x-test-user-id', 'admin-db')
      .send({
        title: 'Broadcast',
        body: 'Hello all',
        data: { channel: 'all' }
      });

    expect(response.status).toBe(200);
    expect(fcm.sendToMultiple).toHaveBeenCalledWith(
      ['tok-1', 'tok-2'],
      'Broadcast',
      'Hello all',
      { channel: 'all' }
    );
  });
});
