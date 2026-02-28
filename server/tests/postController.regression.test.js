jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/controllers/postGuaranteedReachController', () => ({
  getCacheStats: jest.fn(),
  getGuaranteedReachPosts: jest.fn()
}));

jest.mock('../src/services/schemaGuard', () => ({
  ensureUserTierColumns: jest.fn().mockResolvedValue(true)
}));

const pool = require('../src/config/db');
const postController = require('../src/controllers/postController');

function createResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('postController regression coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllPosts caps limit and computes offset with sanitized pagination', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = {
      query: {
        page: '2',
        limit: '1000'
      }
    };
    const res = createResponse();

    await postController.getAllPosts(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const queryArg = pool.query.mock.calls[0][0];
    const values = queryArg.values;
    expect(values[values.length - 2]).toBe(100);
    expect(values[values.length - 1]).toBe(100);
    expect(res.json).toHaveBeenCalledWith({
      posts: [],
      total: 0,
      page: 2,
      limit: 100
    });
  });

  test('getAllPosts normalizes inverted min/max price filters', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = {
      query: {
        minPrice: '500',
        maxPrice: '100'
      }
    };
    const res = createResponse();

    await postController.getAllPosts(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values.slice(0, 2)).toEqual([100, 500]);
  });

  test('getUserPosts keeps optimized query pagination bounds stable', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = {
      query: {
        userId: 'u-1',
        page: '3',
        limit: '500'
      }
    };
    const res = createResponse();

    await postController.getUserPosts(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[2]).toBe(100);
    expect(queryArg.values[3]).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      posts: [],
      total: 0,
      page: 3,
      limit: 100
    });
  });
});
