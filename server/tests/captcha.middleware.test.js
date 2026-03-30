jest.mock('https', () => ({
  request: jest.fn()
}));

const https = require('https');
const { verifyRecaptcha } = require('../src/middleware/captcha');

function mockVerifyResponse(payload) {
  https.request.mockImplementation((options, callback) => {
    const reqHandlers = {};
    const resHandlers = {};

    const req = {
      on: jest.fn((event, handler) => {
        reqHandlers[event] = handler;
        return req;
      }),
      write: jest.fn(),
      end: jest.fn(() => {
        const res = {
          on: (event, handler) => {
            resHandlers[event] = handler;
          }
        };
        callback(res);
        if (resHandlers.data) {
          resHandlers.data(JSON.stringify(payload));
        }
        if (resHandlers.end) {
          resHandlers.end();
        }
      }),
      destroy: jest.fn()
    };

    return req;
  });
}

describe('captcha middleware regression behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes when score threshold and action both match', async () => {
    mockVerifyResponse({
      success: true,
      score: 0.9,
      action: 'login',
      hostname: 'example.com'
    });

    const result = await verifyRecaptcha(
      'token-1',
      'login',
      { RECAPTCHA_SECRET_KEY: 'secret', RECAPTCHA_THRESHOLD: '0.5' }
    );

    expect(result.success).toBe(true);
    expect(result.actionMatches).toBe(true);
    expect(https.request).toHaveBeenCalledTimes(1);
  });

  it('fails when Google returns a different action than expected', async () => {
    mockVerifyResponse({
      success: true,
      score: 0.99,
      action: 'signup',
      hostname: 'example.com'
    });

    const result = await verifyRecaptcha(
      'token-2',
      'login',
      { RECAPTCHA_SECRET_KEY: 'secret', RECAPTCHA_THRESHOLD: '0.3' }
    );

    expect(result.success).toBe(false);
    expect(result.actionMatches).toBe(false);
  });

  it('skips verification cleanly when secret is not configured', async () => {
    const result = await verifyRecaptcha(
      'token-3',
      'login',
      {}
    );

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(https.request).not.toHaveBeenCalled();
  });
});
