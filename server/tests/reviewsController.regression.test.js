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
        getOrSetWithStampedeProtection: jest.fn()
    };

    jest.doMock('../src/config/db', () => ({ query }));
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/services/cacheService', () => cacheService);

    const controller = require('../src/controllers/reviewsController');
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

describe('reviewsController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('createReview falls back to created_at when reviews.updated_at is missing', async () => {
        const nowIso = '2026-02-28T00:00:00.000Z';
        const { controller, query } = loadControllerWithQueryMock(async ({ text }) => {
            if (text.includes('information_schema.columns') && text.includes("column_name = 'updated_at'")) {
                return { rows: [{ available: false }] };
            }
            if (text.includes('SELECT COUNT(*)::int AS review_count')) {
                return { rows: [{ review_count: 0 }] };
            }
            if (text.includes('SELECT review_id,') && text.includes('FROM reviews')) {
                return { rows: [] };
            }
            if (text.includes('INSERT INTO reviews')) {
                return {
                    rows: [{
                        review_id: 'rev-1',
                        reviewer_id: 'u-1',
                        reviewee_id: 'u-2',
                        post_id: null,
                        rating: 5,
                        title: 'Great',
                        comment: 'Excellent deal',
                        verified_purchase: false,
                        helpful_count: 0,
                        seller_response: null,
                        seller_response_at: null,
                        is_hidden: false,
                        hidden_reason: null,
                        hidden_by: null,
                        hidden_at: null,
                        flag_count: 0,
                        abuse_score: 0,
                        created_at: nowIso,
                        updated_at: nowIso
                    }]
                };
            }
            return { rows: [] };
        });

        const req = {
            user: { user_id: 'u-1' },
            body: {
                reviewee_id: 'u-2',
                rating: 5,
                title: 'Great',
                comment: 'Excellent deal'
            }
        };
        const res = createResponseMock();

        await controller.createReview(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Review submitted successfully',
            review: expect.objectContaining({
                review_id: 'rev-1',
                updated_at: nowIso
            })
        });

        const insertQueryText = query.mock.calls.find((call) => call[0].text.includes('INSERT INTO reviews'))[0].text;
        expect(insertQueryText).toContain('created_at AS updated_at');
        expect(insertQueryText).not.toContain('updated_at = NOW()');
    });

    it('flagReview avoids updated_at writes when column is missing', async () => {
        const { controller, query } = loadControllerWithQueryMock(async ({ text }) => {
            if (text.includes('information_schema.columns') && text.includes("column_name = 'updated_at'")) {
                return { rows: [{ available: false }] };
            }
            if (text.includes('SELECT review_id, reviewer_id, reviewee_id, flag_count')) {
                return { rows: [{ review_id: 'rev-2', reviewer_id: 'u-2', reviewee_id: 'u-3', flag_count: 0 }] };
            }
            if (text.includes('INSERT INTO review_flags')) {
                return { rows: [{ flag_id: 10 }] };
            }
            if (text.includes('UPDATE reviews') && text.includes('SET flag_count')) {
                return { rows: [{ review_id: 'rev-2', reviewee_id: 'u-3', flag_count: 1, is_hidden: false, hidden_reason: null }] };
            }
            return { rows: [] };
        });

        const req = {
            user: { user_id: 'u-1' },
            params: { reviewId: 'rev-2' },
            body: { reason: 'spam' }
        };
        const res = createResponseMock();

        await controller.flagReview(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Review flagged for moderation',
            moderation: expect.objectContaining({
                review_id: 'rev-2',
                flag_count: 1
            })
        });

        const flagUpdateQueryText = query.mock.calls.find(
            (call) => call[0].text.includes('UPDATE reviews') && call[0].text.includes('SET flag_count')
        )[0].text;
        expect(flagUpdateQueryText).not.toContain('updated_at = NOW()');
    });
});
