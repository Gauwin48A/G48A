function loadControllerWithQueryMock(queryImpl) {
    jest.resetModules();

    const query = jest.fn(queryImpl);
    const logger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    };
    const cacheService = {
        clearPattern: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        getOrSetWithStampedeProtection: jest.fn()
    };

    jest.doMock('../src/config/db', () => ({ query }));
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/services/cacheService', () => cacheService);

    const controller = require('../src/controllers/paymentController');
    return { controller, query, logger, cacheService };
}

function createResponseMock() {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };
    res.status.mockReturnValue(res);
    return res;
}

describe('paymentController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('submitPayment resolves canonical UUID user_id when auth token carries legacy numeric id', async () => {
        const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
            const sql = String(text || '').replace(/\s+/g, ' ').trim();
            if (/ALTER TABLE payments/i.test(sql) || /UPDATE payments SET purchase_type/i.test(sql)) {
                return { rows: [] };
            }
            if (sql.includes("table_name = 'payments'") && sql.includes("column_name IN ('user_id', 'retry_count', 'updated_at')")) {
                return {
                    rows: [
                        { column_name: 'user_id', data_type: 'uuid' },
                        { column_name: 'updated_at', data_type: 'timestamp with time zone' }
                    ]
                };
            }
            if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
                return { rows: [{ available: true }] };
            }
            if (sql.includes('SELECT user_id::text AS canonical_user_id') && sql.includes('id::text AS legacy_user_id')) {
                expect(values).toEqual(['212']);
                return { rows: [{ canonical_user_id: '11111111-1111-4111-8111-111111111111', legacy_user_id: '212' }] };
            }
            if (sql.includes('SELECT id FROM payments WHERE transaction_id = $1')) {
                return { rows: [] };
            }
            if (sql.includes("WHERE user_id::text = $1") && sql.includes("plan_purchased = $2") && sql.includes("status = 'pending'")) {
                expect(values[0]).toBe('11111111-1111-4111-8111-111111111111');
                return { rows: [] };
            }
            if (sql.includes('INSERT INTO payments')) {
                expect(values[0]).toBe('11111111-1111-4111-8111-111111111111');
                return { rows: [{ id: 'pay-1', created_at: '2026-02-28T00:00:00.000Z' }] };
            }
            if (sql.includes('INSERT INTO notifications')) {
                expect(values[0]).toBe('11111111-1111-4111-8111-111111111111');
                return { rows: [] };
            }
            return { rows: [] };
        });

        const req = {
            user: { id: '212' },
            body: {
                plan_type: 'silver',
                transaction_id: 'TXN123456',
                upi_id: 'user@upi'
            }
        };
        const res = createResponseMock();

        await controller.submitPayment(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            payment_id: 'pay-1',
            status: 'pending'
        }));
        const insertPaymentQuery = query.mock.calls.find((call) => call[0].text.includes('INSERT INTO payments'))[0].text;
        expect(insertPaymentQuery).toContain('purchase_type, boost_type, post_id, metadata');
    });

    it('retryPayment works when payments.retry_count column is absent', async () => {
        const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
            const sql = String(text || '').replace(/\s+/g, ' ').trim();
            if (/ALTER TABLE payments/i.test(sql) || /UPDATE payments SET purchase_type/i.test(sql)) {
                return { rows: [] };
            }
            if (sql.includes("table_name = 'payments'") && sql.includes("column_name IN ('user_id', 'retry_count', 'updated_at')")) {
                return {
                    rows: [
                        { column_name: 'user_id', data_type: 'text' }
                    ]
                };
            }
            if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
                return { rows: [{ available: false }] };
            }
            if (sql.includes('SELECT user_id::text AS canonical_user_id') && sql.includes('NULL::text AS legacy_user_id')) {
                expect(values).toEqual(['u-100']);
                return { rows: [{ canonical_user_id: 'u-100', legacy_user_id: null }] };
            }
            if (sql.includes('SELECT status FROM payments WHERE id = $1 AND user_id::text = $2')) {
                return { rows: [{ status: 'rejected' }] };
            }
            if (sql.includes('SELECT id FROM payments WHERE transaction_id = $1')) {
                return { rows: [] };
            }
            if (sql.includes("UPDATE payments SET status = 'pending', transaction_id = $1") && sql.includes('WHERE id = $2')) {
                expect(values).toEqual(['NEWTXN1', 'pay-9']);
                return { rows: [] };
            }
            throw new Error(`Unexpected query: ${sql}`);
        });

        const req = {
            user: { user_id: 'u-100' },
            params: { id: 'pay-9' },
            body: { transaction_id: 'NEWTXN1' }
        };
        const res = createResponseMock();

        await controller.retryPayment(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Payment resubmitted',
            retry_count: null
        });

        const updateQueryCall = query.mock.calls.find((call) => {
            const sql = String(call[0]?.text || '').replace(/\s+/g, ' ').trim();
            return sql.includes("UPDATE payments SET status = 'pending', transaction_id = $1") && sql.includes('WHERE id = $2');
        });
        expect(updateQueryCall).toBeTruthy();
        const updateQueryText = updateQueryCall[0].text;
        expect(updateQueryText).not.toContain('retry_count');
    });

    it('getPaymentStatus resolves canonical payment user id for mixed auth identifiers', async () => {
        const { controller, query, cacheService } = loadControllerWithQueryMock(async ({ text, values }) => {
            const sql = String(text || '').replace(/\s+/g, ' ').trim();
            if (/ALTER TABLE payments/i.test(sql) || /UPDATE payments SET purchase_type/i.test(sql)) {
                return { rows: [] };
            }
            if (sql.includes("table_name = 'payments'") && sql.includes("column_name IN ('user_id', 'retry_count', 'updated_at')")) {
                return {
                    rows: [
                        { column_name: 'user_id', data_type: 'uuid' }
                    ]
                };
            }
            if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
                return { rows: [{ available: true }] };
            }
            if (sql.includes('SELECT user_id::text AS canonical_user_id') && sql.includes('id::text AS legacy_user_id')) {
                expect(values).toEqual(['212']);
                return { rows: [{ canonical_user_id: '11111111-1111-4111-8111-111111111111', legacy_user_id: '212' }] };
            }
            if (sql.includes('FROM payments') && sql.includes('WHERE user_id::text = $1')) {
                expect(values[0]).toEqual('11111111-1111-4111-8111-111111111111');
                return {
                    rows: [{
                        total_count: 1,
                        id: 'pay-1',
                        amount: 499,
                        plan_purchased: 'silver',
                        status: 'pending',
                        transaction_id: 'TXN123',
                        created_at: '2026-02-28T00:00:00.000Z',
                        verified_at: null,
                        expires_at: '2026-03-02T00:00:00.000Z'
                    }]
                };
            }
            throw new Error(`Unexpected query: ${sql}`);
        });
        cacheService.getOrSetWithStampedeProtection.mockImplementation(async (_cacheKey, producer) => producer());

        const req = { user: { id: '212' }, query: {} };
        const res = createResponseMock();

        await controller.getPaymentStatus(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            payments: [expect.objectContaining({ id: 'pay-1', status: 'pending' })],
            has_pending: true,
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
        }));
    });

    it('rejectPayment uses canonical admin user id when token carries legacy id', async () => {
        const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
            if (text.includes("table_name = 'users'") && text.includes("column_name = 'id'")) {
                return { rows: [{ available: true }] };
            }
            if (text.includes('SELECT user_id::text AS canonical_user_id') && text.includes('WHERE user_id::text = $1 OR id::text = $1')) {
                expect(values).toEqual(['901']);
                return { rows: [{ canonical_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] };
            }
            if (text.includes('SELECT id, user_id, status') && text.includes('FROM payments')) {
                return { rows: [{ id: 'pay-77', user_id: '11111111-1111-4111-8111-111111111111', status: 'pending' }] };
            }
            if (text.includes('UPDATE payments') && text.includes("SET status = 'rejected'")) {
                expect(values[0]).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
                return { rows: [] };
            }
            if (text.includes('INSERT INTO notifications') && text.includes('payment_rejected')) {
                return { rows: [] };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { id: '901' },
            params: { id: 'pay-77' },
            body: { reason: 'invalid txn' }
        };
        const res = createResponseMock();

        await controller.rejectPayment(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Payment rejected',
            payment_id: 'pay-77'
        });
    });
});
