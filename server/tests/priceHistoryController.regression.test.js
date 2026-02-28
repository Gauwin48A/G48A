function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadPriceHistoryControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);

  const controller = require('../src/controllers/priceHistoryController');
  return { controller, query };
}

describe('priceHistoryController regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('recordPriceChange accepts req.user.user_id when id is absent', async () => {
    const inserted = {
      history_id: 'hist-1',
      post_id: 'post-1',
      old_price: 100,
      new_price: 80,
      percentage_change: -20,
      changed_by: 'legacy-user'
    };

    const { controller, query } = loadPriceHistoryControllerWithQueryMock(async ({ text }) => {
      if (text.includes('INSERT INTO price_history')) {
        return { rows: [inserted] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { user_id: 'legacy-user' },
      body: {
        postId: 'post-1',
        oldPrice: 100,
        newPrice: 80,
        reason: 'price_drop'
      }
    };
    const res = createResponseMock();

    await controller.recordPriceChange(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Price change recorded',
      history: inserted
    });
    const insertCall = query.mock.calls.find((call) =>
      call[0].text.includes('INSERT INTO price_history')
    );
    expect(insertCall[0].values[4]).toBe('legacy-user');
  });
});
