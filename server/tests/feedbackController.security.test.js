function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadFeedbackControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);

  const controller = require('../src/controllers/feedbackController');
  return { controller, query };
}

describe('feedbackController security behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('rejects non-admin feedback listing requests', async () => {
    const { controller, query } = loadFeedbackControllerWithQueryMock(async () => ({ rows: [] }));
    const req = {
      user: { userId: 'user-1', role: 'user' },
      query: {}
    };
    const res = createResponseMock();

    await controller.getFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin or moderator access required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('applies bounded pagination for admin feedback listing', async () => {
    const feedbackRows = [
      {
        id: 'fb-1',
        user_id: 'user-2',
        message: 'Looks good',
        rating: 5,
        category: 'general',
        status: 'open'
      }
    ];

    const { controller, query } = loadFeedbackControllerWithQueryMock(async ({ text, values }) => {
      if (text.includes('information_schema.columns')) {
        return { rows: [{ available: true }] };
      }
      if (text.includes('FROM feedback') && text.includes('LIMIT $1 OFFSET $2')) {
        expect(values).toEqual([200, 0]);
        return { rows: feedbackRows };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { userId: 'admin-1', role: 'admin' },
      query: { page: '1', limit: '999' }
    };
    const res = createResponseMock();

    await controller.getFeedback(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(feedbackRows);
  });
});
