function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

/**
 * Build a combined query mock that delegates to a custom handler for the
 * "interesting" queries and handles common schema-preflight queries
 * (to_regclass, information_schema.columns) automatically via defaults.
 *
 * @param {Function} customHandler - async ({ text, values }) => { ... }
 *   Return { rows: [...] } for queries you handle, or return undefined
 *   to fall through to the default handler.
 * @returns {Function} query mock implementation
 */
function buildFeedbackQueryHandler(customHandler) {
  return async ({ text, values }) => {
    if (customHandler) {
      const customResult = await customHandler({ text, values });
      if (customResult !== undefined) return customResult;
    }
    // Default handlers for schema preflight
    if (text.includes("to_regclass('public.feedback')")) {
      return { rows: [{ available: true }] };
    }
    if (text.includes('information_schema.columns')) {
      return { rows: [{ available: true }] };
    }
    if (text.includes('CREATE TABLE IF NOT EXISTS feedback')) {
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${text}`);
  };
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

    const { controller, query } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(async ({ text }) => {
        if (text.includes('FROM feedback') && text.includes('WHERE user_id = $1')) {
          return { rows: feedbackRows };
        }
      })
    );

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

    const { controller, query } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(async ({ text }) => {
        if (text.includes('INSERT INTO feedback')) {
          return { rows: [inserted] };
        }
      })
    );

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

  // ── Validation tests ───────────────────────────────────────────────

  it('createFeedback returns 400 when message is empty', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = {
      user: { userId: 'user-1' },
      body: { message: '', rating: 5 }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Message is required' });
  });

  it('createFeedback returns 400 when message is whitespace-only', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = {
      user: { userId: 'user-1' },
      body: { message: '   ', rating: 5 }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Message is required' });
  });

  it('createFeedback returns 400 when rating is below 1', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = {
      user: { userId: 'user-1' },
      body: { message: 'Bad rating', rating: 0 }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rating must be an integer between 1 and 5' });
  });

  it('createFeedback returns 400 when rating is above 5', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = {
      user: { userId: 'user-1' },
      body: { message: 'Bad rating', rating: 6 }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rating must be an integer between 1 and 5' });
  });

  it('createFeedback returns 400 when rating is NaN', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = {
      user: { userId: 'user-1' },
      body: { message: 'Bad rating', rating: 'abc' }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Rating must be an integer between 1 and 5' });
  });

  it('createFeedback returns 401 when not authenticated', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = {
      user: {},
      body: { message: 'Great app', rating: 5 }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('getMyFeedback returns 401 when not authenticated', async () => {
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(() => {})
    );

    const req = { user: {} };
    const res = createResponseMock();

    await controller.getMyFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('createFeedback uses defaults for missing rating and category', async () => {
    const inserted = {
      id: 'fb-3',
      user_id: 'user-1',
      message: 'Just a comment',
      rating: 5,
      category: 'general',
      status: 'open'
    };

    let capturedValues = null;
    const { controller } = loadFeedbackControllerWithQueryMock(
      buildFeedbackQueryHandler(async ({ text, values }) => {
        if (text.includes('INSERT INTO feedback')) {
          capturedValues = values;
          return { rows: [inserted] };
        }
      })
    );

    const req = {
      user: { userId: 'user-1' },
      body: { message: 'Just a comment' }
    };
    const res = createResponseMock();

    await controller.createFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(capturedValues).not.toBeNull();
    expect(capturedValues[2]).toBe(5);      // default rating
    expect(capturedValues[3]).toBe('general'); // default category
  });
});