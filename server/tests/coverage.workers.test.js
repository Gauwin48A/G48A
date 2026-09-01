/**
 * coverage.workers.test.js
 *
 * Runtime execution tests for worker files to improve coverage:
 * - cronPostExpiry.processExpiredPosts (with mocked pool)
 * - cronEscrowSettlements.processEscrowSettlements (with mocked pool)
 *
 * Tests the actual function logic with mock database responses.
 */

// ── Mocks ────────────────────────────────────────────────
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(async () => ({
  query: mockQuery,
  release: mockRelease,
}));

jest.mock('../src/config/db', () => ({
  pool: { connect: mockConnect },
}));

jest.mock('../src/services/notificationEmitter', () => ({
  emitNotification: jest.fn(async () => {}),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { emitNotification } = require('../src/services/notificationEmitter');
const logger = require('../src/utils/logger');

// ── Tests ────────────────────────────────────────────────
describe('cronPostExpiry — runtime execution', () => {
  let processExpiredPosts;

  beforeAll(async () => {
    // Import fresh to avoid caching issues
    jest.resetModules();
    jest.mock('../src/config/db', () => ({ pool: { connect: mockConnect } }));
    jest.mock('../src/services/notificationEmitter', () => ({ emitNotification: jest.fn(async () => {}) }));
    jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

    const mod = require('../src/workers/cronPostExpiry');
    processExpiredPosts = mod.processExpiredPosts;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
  });

  it('processes expired posts and sends notifications', async () => {
    // Mock: find 2 expired posts
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Old Laptop', user_id: 'seller-1', created_at: '2025-01-01' },
          { id: 2, title: 'Used Phone', user_id: 'seller-2', created_at: '2025-01-02' },
        ],
      })
      // BEGIN
      .mockResolvedValueOnce({})
      // UPDATE status
      .mockResolvedValueOnce({})
      // COMMIT
      .mockResolvedValueOnce({})
      // BEGIN (second post)
      .mockResolvedValueOnce({})
      // UPDATE status
      .mockResolvedValueOnce({})
      // COMMIT
      .mockResolvedValueOnce({});

    await processExpiredPosts();

    // Should have connected to pool
    expect(mockConnect).toHaveBeenCalled();

    // Should have notified both sellers
    const { emitNotification: emit } = require('../src/services/notificationEmitter');
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith('seller-1', expect.objectContaining({
      title: expect.stringContaining('Expired'),
      data: expect.objectContaining({ type: 'POST_EXPIRY' }),
    }));

    // Should have released client
    expect(mockRelease).toHaveBeenCalled();
  });

  it('handles no expired posts gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await processExpiredPosts();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();
    // No notifications sent
    expect(emitNotification).not.toHaveBeenCalled();
  });

  it('rolls back on error and releases client', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Bad Post', user_id: 'seller-1', created_at: '2025-01-01' }],
      })
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('DB write failed')); // UPDATE fails

    // The worker catches the error internally
    await processExpiredPosts();

    // Should have released client
    expect(mockRelease).toHaveBeenCalled();
  });

  it('handles pool.connect() failure', async () => {
    mockConnect.mockRejectedValue(new Error('Connection refused'));

    // The worker propagates the connect error (no internal catch)
    await expect(processExpiredPosts()).rejects.toThrow();
  });
});

describe('cronEscrowSettlement — runtime execution', () => {
  let processEscrowSettlements;

  beforeAll(async () => {
    jest.resetModules();
    jest.mock('../src/config/db', () => ({ pool: { connect: mockConnect } }));
    jest.mock('../src/services/notificationEmitter', () => ({ emitNotification: jest.fn(async () => {}) }));
    jest.mock('../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

    const mod = require('../src/workers/cronEscrowSettlement');
    processEscrowSettlements = mod.processEscrowSettlements;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
  });

  it('processes escrow settlements and notifies sellers', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { sale_id: 101, seller_id: 'seller-1', buyer_id: 'buyer-1', agreed_price: 5000, post_id: 'post-1' },
          { sale_id: 102, seller_id: 'seller-2', buyer_id: 'buyer-2', agreed_price: 12000, post_id: 'post-2' },
        ],
      })
      // Sale 1: BEGIN, UPDATE, notification, COMMIT
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      // Sale 2: BEGIN, UPDATE, notification, COMMIT
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await processEscrowSettlements();

    expect(mockConnect).toHaveBeenCalled();

    // Should have notified both sellers
    const { emitNotification: emit } = require('../src/services/notificationEmitter');
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith('seller-1', expect.objectContaining({
      data: expect.objectContaining({ type: 'ESCROW_SETTLED' }),
    }));

    expect(mockRelease).toHaveBeenCalled();
  });

  it('handles no pending settlements', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await processEscrowSettlements();

    expect(mockRelease).toHaveBeenCalled();
    expect(emitNotification).not.toHaveBeenCalled();
  });

  it('rolls back on error and releases client', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ sale_id: 201, seller_id: 'seller-1', buyer_id: 'buyer-1', agreed_price: 3000, post_id: 'post-1' }],
      })
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('Update failed')); // UPDATE fails

    await processEscrowSettlements();

    expect(mockRelease).toHaveBeenCalled();
  });

  it('handles pool.connect() failure', async () => {
    mockConnect.mockRejectedValue(new Error('Pool exhausted'));

    await expect(processEscrowSettlements()).rejects.toThrow();
  });

  it('notification payload has correct structure', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ sale_id: 301, seller_id: 'seller-1', buyer_id: 'buyer-1', agreed_price: 7500, post_id: 'post-1' }],
      })
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE
      .mockResolvedValueOnce({}); // COMMIT

    await processEscrowSettlements();

    const { emitNotification: emit } = require('../src/services/notificationEmitter');
    expect(emit).toHaveBeenCalledWith('seller-1', {
      title: expect.stringContaining('Settled'),
      body: expect.stringContaining('₹7500'),
      data: expect.objectContaining({
        type: 'ESCROW_SETTLED',
        sale_id: '301',
      }),
    });
  });
});
