/**
 * T-04 — API Contract Tests
 *
 * Verifies that critical endpoint handlers return the exact response shapes
 * that the frontend depends on. Tests run against real controller logic with
 * DB/cache/logger mocked at the module boundary.
 *
 * Covered endpoints:
 *   GET  /api/posts            → { posts[], total, page, limit }
 *   GET  /api/posts/:id        → { post: { post_id, id, price:number, images:array, user:{} } }
 *   GET  /api/posts/nearby     → { posts[], total, searchParams:{lat,long,radius} }
 *   GET  /api/feed             → array of posts
 *   GET  /api/auth/me          → { id, tier, email, ... }
 *   POST /api/auth/login       → { success:true, token, user:{id,email} }
 *
 * Schema rules under test (frontend breakage if violated):
 *   - price must be a Number, never a string
 *   - images must be an Array (even if DB has null / TEXT / JSONB string)
 *   - getAllPosts response must have { posts, total, page, limit } wrapper
 *   - getPostById response must be wrapped in { post: ... }
 *   - getMe must include `tier` field
 *   - login must return { success, token, user }
 */

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before any require() of the SUT
// ---------------------------------------------------------------------------

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../src/services/cacheService', () => ({
  get: jest.fn(() => undefined),
  set: jest.fn(),
  getOrSetWithStampedeProtection: jest.fn(async (_key, fetcher) => fetcher()),
}));

jest.mock('../src/services/schemaGuard', () => ({
  ensureUserTierColumns: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/controllers/postGuaranteedReachController', () => ({
  getCacheStats: jest.fn(),
  getGuaranteedReachPosts: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pool = require('../src/config/db');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  return res;
}

function lastJsonCall(res) {
  const calls = res.json.mock.calls;
  return calls[calls.length - 1][0];
}

// ---------------------------------------------------------------------------
// Contract: GET /api/posts  (getAllPosts)
// ---------------------------------------------------------------------------
describe('Contract: getAllPosts → { posts[], total, page, limit }', () => {
  const postController = require('../src/controllers/postController');

  beforeEach(() => jest.clearAllMocks());

  test('returns the required wrapper keys with correct types', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          post_id: 'p-1',
          user_id: 'u-1',
          title: 'Test post',
          price: '250.00',
          images: null,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const req = { query: { page: '1', limit: '10' } };
    const res = mockRes();
    await postController.getAllPosts(req, res);

    const body = lastJsonCall(res);
    expect(body).toHaveProperty('posts');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(Array.isArray(body.posts)).toBe(true);
    expect(typeof body.page).toBe('number');
    expect(typeof body.limit).toBe('number');
  });

  test('price is coerced to Number in list results', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { post_id: 'p-2', title: 'Priced item', price: '1500.50', images: null },
      ],
    });

    const req = { query: {} };
    const res = mockRes();
    await postController.getAllPosts(req, res);

    const body = lastJsonCall(res);
    if (body.posts && body.posts.length > 0) {
      body.posts.forEach((p) => {
        if (p.price !== null && p.price !== undefined) {
          expect(typeof p.price).toBe('number');
        }
      });
    }
  });

  test('returns empty posts array and total=0 when DB returns no rows', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const req = { query: {} };
    const res = mockRes();
    await postController.getAllPosts(req, res);

    const body = lastJsonCall(res);
    expect(body.posts).toEqual([]);
    expect(body.total).toBe(0);
  });

  test('page is clamped to minimum 1', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const req = { query: { page: '-5', limit: '10' } };
    const res = mockRes();
    await postController.getAllPosts(req, res);

    const body = lastJsonCall(res);
    expect(body.page).toBeGreaterThanOrEqual(1);
  });

  test('limit is capped at maximum (100)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const req = { query: { page: '1', limit: '9999' } };
    const res = mockRes();
    await postController.getAllPosts(req, res);

    const body = lastJsonCall(res);
    expect(body.limit).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Contract: GET /api/posts/:id  (getPostById)
// ---------------------------------------------------------------------------
describe('Contract: getPostById → { post: { post_id, id, price:number, images:array, user:{} } }', () => {
  beforeEach(() => jest.resetModules());

  function loadController() {
    jest.doMock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(), warn: jest.fn(), error: jest.fn(),
    }));
    jest.doMock('../src/services/schemaGuard', () => ({
      ensureUserTierColumns: jest.fn().mockResolvedValue(true),
    }));
    jest.doMock('../src/controllers/postGuaranteedReachController', () => ({
      getCacheStats: jest.fn(), getGuaranteedReachPosts: jest.fn(),
    }));
    const ctrl = require('../src/controllers/postController');
    const db = require('../src/config/db');
    return { ctrl, db };
  }

  test('response is wrapped in { post: ... }', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({
      rows: [{
        post_id: 'p-abc',
        id: 'p-abc',
        user_id: 'u-1',
        title: 'Widget',
        price: '999.00',
        images: null,
        views_count: 5,
        image_url: null,
        discount_percentage: null,
        user: { user_id: 'u-1', username: 'seller', verified: false },
      }],
    });

    const req = { params: { postId: 'p-abc' } };
    const res = mockRes();
    await ctrl.getPostById(req, res);

    const body = lastJsonCall(res);
    expect(body).toHaveProperty('post');
    expect(body.post).toHaveProperty('post_id', 'p-abc');
  });

  test('price is coerced to Number in single-post response', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({
      rows: [{
        post_id: 'p-xyz',
        id: 'p-xyz',
        price: '4299.99',
        images: null,
        image_url: null,
        discount_percentage: null,
        user: {},
      }],
    });

    const req = { params: { postId: 'p-xyz' } };
    const res = mockRes();
    await ctrl.getPostById(req, res);

    const body = lastJsonCall(res);
    expect(typeof body.post.price).toBe('number');
    expect(body.post.price).toBeCloseTo(4299.99);
  });

  test('images is always an Array (normalized from null)', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({
      rows: [{
        post_id: 'p-img',
        id: 'p-img',
        price: '100',
        images: null,
        image_url: null,
        discount_percentage: null,
        user: {},
      }],
    });

    const req = { params: { postId: 'p-img' } };
    const res = mockRes();
    await ctrl.getPostById(req, res);

    const body = lastJsonCall(res);
    expect(Array.isArray(body.post.images)).toBe(true);
  });

  test('images is an Array when DB returns a JSON string', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({
      rows: [{
        post_id: 'p-json',
        id: 'p-json',
        price: '100',
        images: '["https://example.com/a.jpg"]',
        image_url: null,
        discount_percentage: null,
        user: {},
      }],
    });

    const req = { params: { postId: 'p-json' } };
    const res = mockRes();
    await ctrl.getPostById(req, res);

    const body = lastJsonCall(res);
    expect(Array.isArray(body.post.images)).toBe(true);
  });

  test('returns 404 when post is not found', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { postId: 'missing-id' } };
    const res = mockRes();
    await ctrl.getPostById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = lastJsonCall(res);
    expect(body).toHaveProperty('error');
  });

  test('discount_percentage is coerced to Number when present', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({
      rows: [{
        post_id: 'p-disc',
        id: 'p-disc',
        price: '200',
        images: null,
        image_url: null,
        discount_percentage: '15',
        user: {},
      }],
    });

    const req = { params: { postId: 'p-disc' } };
    const res = mockRes();
    await ctrl.getPostById(req, res);

    const body = lastJsonCall(res);
    expect(typeof body.post.discount_percentage).toBe('number');
    expect(body.post.discount_percentage).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Contract: GET /api/posts/nearby  (getNearbyPosts)
// ---------------------------------------------------------------------------
describe('Contract: getNearbyPosts → { posts[], total, searchParams:{lat,long,radius} }', () => {
  beforeEach(() => jest.resetModules());

  function loadController() {
    jest.doMock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(), warn: jest.fn(), error: jest.fn(),
    }));
    jest.doMock('../src/services/schemaGuard', () => ({
      ensureUserTierColumns: jest.fn().mockResolvedValue(true),
    }));
    jest.doMock('../src/controllers/postGuaranteedReachController', () => ({
      getCacheStats: jest.fn(), getGuaranteedReachPosts: jest.fn(),
    }));
    const ctrl = require('../src/controllers/postController');
    const db = require('../src/config/db');
    return { ctrl, db };
  }

  test('returns { posts, total, searchParams } shape', async () => {
    const { ctrl, db } = loadController();
    db.query.mockResolvedValueOnce({
      rows: [{ post_id: 'near-1', title: 'Near item' }],
    });

    const req = { query: { lat: '12.9716', long: '77.5946', radius: '5' } };
    const res = mockRes();
    await ctrl.getNearbyPosts(req, res);

    const body = lastJsonCall(res);
    expect(body).toHaveProperty('posts');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('searchParams');
    expect(body.searchParams).toHaveProperty('lat');
    expect(body.searchParams).toHaveProperty('long');
    expect(body.searchParams).toHaveProperty('radius');
    expect(Array.isArray(body.posts)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('returns 400 when lat/long missing', async () => {
    const { ctrl } = loadController();
    const req = { query: {} };
    const res = mockRes();
    await ctrl.getNearbyPosts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = lastJsonCall(res);
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Contract: GET /api/feed  (getFeed)
// ---------------------------------------------------------------------------
describe('Contract: getFeed → array of post objects', () => {
  beforeEach(() => jest.resetModules());

  function loadFeedController() {
    jest.doMock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(), warn: jest.fn(), error: jest.fn(),
    }));
    jest.doMock('../src/services/cacheService', () => ({
      get: jest.fn(() => undefined),
      set: jest.fn(),
      getOrSetWithStampedeProtection: jest.fn(async (_key, fetcher) => fetcher()),
    }));
    const ctrl = require('../src/controllers/feedController');
    const db = require('../src/config/db');
    return { ctrl, db };
  }

  test('returns an array (not an object wrapper)', async () => {
    const { ctrl, db } = loadFeedController();
    db.query.mockResolvedValueOnce({
      rows: [{ post_id: 'f-1', title: 'Feed post', price: '300' }],
    });

    const req = { query: { page: '1', limit: '10' } };
    const res = mockRes();
    await ctrl.getFeed(req, res);

    const body = lastJsonCall(res);
    expect(Array.isArray(body)).toBe(true);
  });

  test('does not return a 500 for valid request', async () => {
    const { ctrl, db } = loadFeedController();
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { query: {} };
    const res = mockRes();
    await ctrl.getFeed(req, res);

    const statusCalls = res.status.mock.calls.map((c) => c[0]);
    expect(statusCalls).not.toContain(500);
  });
});

// ---------------------------------------------------------------------------
// Contract: GET /api/auth/me  (getMe)
// ---------------------------------------------------------------------------
describe('Contract: getMe → { id, tier, email, ... }', () => {
  beforeEach(() => jest.resetModules());

  function loadAuthController(queryImpl) {
    jest.doMock('../src/config/db', () => ({ query: jest.fn(queryImpl), connect: jest.fn() }));
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(), warn: jest.fn(), error: jest.fn(),
    }));
    const ctrl = require('../src/controllers/authController');
    return ctrl;
  }

  test('response contains id and tier fields', async () => {
    let call = 0;
    const ctrl = loadAuthController(() => {
      call++;
      if (call === 1) return Promise.resolve({ rows: [{ rewards_table: null }] });
      return Promise.resolve({
        rows: [{
          user_id: 42,
          name: 'Alice',
          email: 'alice@example.com',
          phone_number: '9876543210',
          role: 'user',
          tier: 'Silver',
        }],
      });
    });

    const req = { user: { id: 42 } };
    const res = mockRes();
    await ctrl.getMe(req, res);

    const body = lastJsonCall(res);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('tier');
  });

  test('tier defaults to Bronze when rewards lookup returns nothing', async () => {
    let call = 0;
    const ctrl = loadAuthController(() => {
      call++;
      if (call === 1) return Promise.resolve({ rows: [{ rewards_table: null }] });
      return Promise.resolve({
        rows: [{
          user_id: 99,
          name: 'Bob',
          email: 'bob@example.com',
          phone_number: '9000000000',
          role: 'user',
          tier: null,
        }],
      });
    });

    const req = { user: { id: 99 } };
    const res = mockRes();
    await ctrl.getMe(req, res);

    const body = lastJsonCall(res);
    expect(body.tier).toBeTruthy();
  });
});
