function loadControllerWithQueryMock(queryImpl) {
    jest.resetModules();

    const query = jest.fn(queryImpl);
    const logger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    };

    jest.doMock('../src/config/db', () => ({ query }));
    jest.doMock('../src/utils/logger', () => logger);

    const controller = require('../src/controllers/inquiryController');
    return { controller, query, logger };
}

function createResponseMock() {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };
    res.status.mockReturnValue(res);
    return res;
}

describe('inquiryController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('updateInquiryStatus succeeds without buyer profile and updated_at columns', async () => {
        const { controller, query } = loadControllerWithQueryMock(async ({ text }) => {
            if (text.includes('information_schema.columns') && text.includes("table_name = 'buyer_inquiries'")) {
                return {
                    rows: [
                        { column_name: 'inquiry_id' },
                        { column_name: 'post_id' },
                        { column_name: 'buyer_id' },
                        { column_name: 'message' },
                        { column_name: 'status' },
                        { column_name: 'created_at' }
                    ]
                };
            }
            if (text.includes('FROM buyer_inquiries bi') && text.includes('JOIN posts p')) {
                return {
                    rows: [{
                        inquiry_id: 'inq-1',
                        post_id: 'post-1',
                        buyer_id: 'buyer-1',
                        message: 'Interested',
                        status: 'pending',
                        created_at: '2026-02-28T00:00:00.000Z',
                        seller_id: 'seller-1'
                    }]
                };
            }
            if (text.includes('UPDATE buyer_inquiries') && text.includes('SET status = $1')) {
                return {
                    rows: [{
                        inquiry_id: 'inq-1',
                        post_id: 'post-1',
                        buyer_id: 'buyer-1',
                        buyer_name: null,
                        phone: null,
                        address: null,
                        message: 'Interested',
                        status: 'closed',
                        is_spam: false,
                        seller_reply: null,
                        reply_at: null,
                        created_at: '2026-02-28T00:00:00.000Z',
                        updated_at: '2026-02-28T00:00:00.000Z'
                    }]
                };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { user_id: 'seller-1' },
            params: { inquiryId: 'inq-1' },
            body: { status: 'closed' }
        };
        const res = createResponseMock();

        await controller.updateInquiryStatus(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            inquiry: expect.objectContaining({
                inquiry_id: 'inq-1',
                status: 'closed'
            })
        });

        const updateQueryText = query.mock.calls.find((call) => call[0].text.includes('UPDATE buyer_inquiries'))[0].text;
        expect(updateQueryText).not.toContain('updated_at = NOW()');
        expect(updateQueryText).toContain('created_at AS updated_at');
    });

    it('replyToInquiry returns 503 when seller_reply column is unavailable', async () => {
        const { controller } = loadControllerWithQueryMock(async ({ text }) => {
            if (text.includes('information_schema.columns') && text.includes("table_name = 'buyer_inquiries'")) {
                return {
                    rows: [
                        { column_name: 'inquiry_id' },
                        { column_name: 'post_id' },
                        { column_name: 'buyer_id' },
                        { column_name: 'message' },
                        { column_name: 'status' },
                        { column_name: 'created_at' }
                    ]
                };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { user_id: 'seller-1' },
            params: { inquiryId: 'inq-2' },
            body: { reply_text: 'Please call me' }
        };
        const res = createResponseMock();

        await controller.replyToInquiry(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Inquiry reply feature is unavailable on current schema'
        });
    });
});
