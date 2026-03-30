function loadControllerWithQueryMock(queryImpl) {
    jest.resetModules();

    const query = jest.fn(queryImpl);
    const logger = {
        warn: jest.fn(),
        error: jest.fn()
    };

    jest.doMock('../src/config/db', () => ({ query }));
    jest.doMock('../src/utils/logger', () => logger);

    const controller = require('../src/controllers/complaintsController');
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

describe('complaintsController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns an empty complaints list when complaints table is missing', async () => {
        const { controller } = loadControllerWithQueryMock(async () => ({
            rows: [{ available: false }]
        }));

        const req = {
            user: { userId: 'mod-1', role: 'moderator' },
            query: { page: '2', limit: '15' }
        };
        const res = createResponseMock();

        await controller.getComplaints(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            complaints: [],
            pagination: {
                page: 2,
                limit: 15,
                total: 0
            }
        });
    });

    it('returns 503 for complaint creation when complaints table is missing', async () => {
        const { controller } = loadControllerWithQueryMock(async () => ({
            rows: [{ available: false }]
        }));

        const req = {
            user: { user_id: 'u-1' },
            body: {
                post_id: 'p-1',
                complaint_type: 'delivery_delay',
                description: 'Late delivery'
            }
        };
        const res = createResponseMock();

        await controller.createComplaint(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Complaints service unavailable',
            details: 'Complaints table is not initialized'
        });
    });

    it('uses single-query pagination and text-safe joins for complaint listing', async () => {
        const { controller, query } = loadControllerWithQueryMock(async ({ text }) => {
            if (text.includes("SELECT to_regclass('public.complaints') IS NOT NULL AS available")) {
                return { rows: [{ available: true }] };
            }
            if (text.includes('ALTER TABLE complaints') || text.includes('CREATE INDEX IF NOT EXISTS idx_complaints')) {
                return { rows: [] };
            }
            if (text.includes('SELECT COUNT(*) FROM complaints c')) {
                throw new Error('Legacy count query should not be used');
            }
            if (text.includes('UPDATE complaints') && text.includes('SET sla_breached_at = NOW()')) {
                return { rows: [] };
            }
            if (text.includes('COUNT(*) OVER()::int AS total_count') && text.includes('FROM complaints c')) {
                return {
                    rows: [{
                        total_count: 1,
                        complaint_id: 'cmp-1',
                        buyer_id: 'buyer-1',
                        seller_id: 'seller-1',
                        post_id: 'post-1',
                        complaint_type: 'delivery_delay',
                        description: 'Delayed delivery',
                        secret_code: null,
                        status: 'open',
                        severity: 'medium',
                        evidence_metadata: {},
                        sla_due_at: null,
                        sla_breached_at: null,
                        status_history: [],
                        last_status_change_at: '2026-02-28T00:00:00.000Z',
                        admin_response: null,
                        resolved_by: null,
                        resolved_at: null,
                        created_at: '2026-02-28T00:00:00.000Z',
                        updated_at: '2026-02-28T00:00:00.000Z',
                        buyer_name: 'Buyer',
                        seller_name: 'Seller'
                    }]
                };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { userId: 'mod-1', role: 'moderator' },
            query: { page: '1', limit: '20' }
        };
        const res = createResponseMock();

        await controller.getComplaints(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            complaints: [expect.objectContaining({ complaint_id: 'cmp-1' })],
            pagination: {
                page: 1,
                limit: 20,
                total: 1
            }
        });

        const listQueryText = query.mock.calls.find((call) => call[0].text.includes('COUNT(*) OVER()::int AS total_count'))[0].text;
        expect(listQueryText).toContain('c.buyer_id::text = bu.user_id::text');
        expect(listQueryText).toContain('c.seller_id::text = su.user_id::text');
    });
});
