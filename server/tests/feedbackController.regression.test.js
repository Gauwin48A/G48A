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
  return { controller, query, logger };
}

describe('feedbackController regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getMyFeedback accepts req.user.user_id when id is absent', async () => {
    const feedbackRows = [
      {
        id: 'fb-1',
        user_id: 'user-legacy',
        message: 'Works great',
        rating: 5,
        category: 'general',
        status: 'open'
      }
    ];

    const { controller, query } = loadFeedbackControllerWithQueryMock(async ({ text }) => {
      if (text.includes('information_schema.columns')) {
        return { rows: [{ available: true }] };
      }
      if (text.includes('FROM feedback') && text.includes('WHERE user_id = $1')) {
        return { rows: feedbackRows };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = { user: { user_id: 'user-legacy' } };
    const res = createResponseMock();

    await controller.getMyFeedback(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ feedback: feedbackRows });
    const feedbackQuery = query.mock.calls.find((call) => call[0].text.includes('WHERE user_id = $1'));
    expect(feedbackQuery[0].values[0]).toBe('user-legacy');
  });

  it('createFeedback accepts req.user.user_id when id is absent', async () => {
    const inserted = {
      id: 'fb-2',
      user_id: 'user-legacy',
      message: '[Bug] Found issue',
      rating: 4,
      category: 'general',
      status: 'open'
    };

    const { controller, query } = loadFeedbackControllerWithQueryMock(async ({ text }) => {
      if (text.includes('information_schema.columns')) {
        return { rows: [{ available: true }] };
      }
      if (text.includes('INSERT INTO feedback')) {
        return { rows: [inserted] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { user_id: 'user-legacy' },
      body: {
        message: 'Found issue',
        rating: 4,
        category: 'general',
        subject: 'Bug'
      }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Feedback submitted successfully',
      feedback: inserted
    });
    const insertCall = query.mock.calls.find((call) => call[0].text.includes('INSERT INTO feedback'));
    expect(insertCall[0].values[0]).toBe('user-legacy');
  });
});
