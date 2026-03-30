const path = require('path');

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    sendFile: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadAdminDocControllerWithMocks({ queryImpl, accessImpl }) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const access = jest.fn(accessImpl || (async () => {}));
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/services/kycAutomationService', () => ({
    listReviewQueue: jest.fn(),
    reviewQueueItem: jest.fn()
  }));
  jest.doMock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
      ...actual,
      promises: {
        ...actual.promises,
        access
      }
    };
  });

  const controller = require('../src/controllers/adminDocController');
  return { controller, query, access, logger };
}

describe('adminDocController regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('rejects unsafe traversal filename before file access', async () => {
    const { controller, query, access } = loadAdminDocControllerWithMocks({
      queryImpl: async ({ text }) => {
        if (text.includes('FROM verification_documents')) {
          return {
            rows: [{ document_id: 'doc-1', user_id: 'user-2', filename: '../secret.pdf' }]
          };
        }
        throw new Error(`Unexpected query: ${text}`);
      }
    });

    const req = {
      user: { user_id: 'admin-1', role: 'admin' },
      params: { id: 'doc-1' }
    };
    const res = createResponseMock();

    await controller.viewDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid document path' });
    expect(res.sendFile).not.toHaveBeenCalled();
    expect(access).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('serves safe document from private root when present', async () => {
    const { controller, query, access } = loadAdminDocControllerWithMocks({
      queryImpl: async ({ text }) => {
        if (text.includes('FROM verification_documents')) {
          return {
            rows: [{ document_id: 'doc-2', user_id: 'user-2', filename: 'kyc_doc.pdf' }]
          };
        }
        if (text.includes('INSERT INTO audit_logs')) {
          return { rows: [] };
        }
        throw new Error(`Unexpected query: ${text}`);
      },
      accessImpl: async () => {}
    });

    const req = {
      user: { user_id: 'admin-1', role: 'admin' },
      params: { id: 'doc-2' }
    };
    const res = createResponseMock();

    await controller.viewDocument(req, res);

    expect(access).toHaveBeenCalledWith(
      path.join(controller.PRIVATE_UPLOADS_DIR, 'kyc_doc.pdf'),
      expect.anything()
    );
    expect(res.sendFile).toHaveBeenCalledWith(
      'kyc_doc.pdf',
      expect.objectContaining({ root: controller.PRIVATE_UPLOADS_DIR })
    );
  });
});
