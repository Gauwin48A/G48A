jest.mock('../src/controllers/priceAlertsController', () => ({
  subscribeAlert: jest.fn((req, res) => res.status(201).json({ ok: true })),
  getAlerts: jest.fn((req, res) => res.json({ alerts: [] })),
  unsubscribeAlert: jest.fn((req, res) => res.json({ ok: true })),
  deleteAlert: jest.fn((req, res) => res.json({ ok: true })),
  checkPriceDrops: jest.fn((req, res) => res.json({ alertsToNotify: [], count: 0 }))
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
const router = require('../src/routes/priceAlerts');
const controller = require('../src/controllers/priceAlertsController');

describe('priceAlerts route security behavior', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/price-alerts', router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated check-drops requests', async () => {
    const response = await request(app).get('/api/price-alerts/check-drops');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
    expect(controller.checkPriceDrops).not.toHaveBeenCalled();
  });

  it('rejects non-admin check-drops requests', async () => {
    const response = await request(app)
      .get('/api/price-alerts/check-drops')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin access required');
    expect(controller.checkPriceDrops).not.toHaveBeenCalled();
  });

  it('allows admin check-drops requests', async () => {
    const response = await request(app)
      .get('/api/price-alerts/check-drops')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(controller.checkPriceDrops).toHaveBeenCalledTimes(1);
  });
});
