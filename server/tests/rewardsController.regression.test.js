function loadControllerWithQueryMock(queryImpl) {
    jest.resetModules();

    const query = jest.fn(queryImpl);
    const logger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    };
    const cacheService = {
        getOrSetWithStampedeProtection: jest.fn(async (_key, producer) => producer()),
        del: jest.fn(),
        clearPattern: jest.fn()
    };

    jest.doMock('../src/config/db', () => ({ query }));
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/services/cacheService', () => cacheService);

    const controller = require('../src/controllers/rewardsController');
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

describe('rewardsController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getRewardLog resolves canonical user id for legacy auth identifiers', async () => {
        const canonicalId = '11111111-1111-4111-8111-111111111111';
        const { controller } = loadControllerWithQueryMock(async ({ text, values }) => {
            if (text.includes("table_name = 'users'") && text.includes("column_name = 'id'")) {
                return { rows: [{ available: true }] };
            }
            if (text.includes('SELECT user_id::text AS user_id') && text.includes('OR id::text = $1')) {
                expect(values).toEqual(['212']);
                return { rows: [{ user_id: canonicalId }] };
            }
            if (text.includes('FROM reward_log')) {
                expect(values).toEqual([canonicalId, 10]);
                return {
                    rows: [
                        { user_id: canonicalId, action: 'bonus', points: 25, description: 'Signup bonus', created_at: '2026-02-28T00:00:00.000Z' }
                    ]
                };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { id: '212' },
            query: { limit: '10' }
        };
        const res = createResponseMock();

        await controller.getRewardLog(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([
            expect.objectContaining({
                user_id: canonicalId,
                action: 'bonus',
                points: 25
            })
        ]);
    });

    it('getRewardsByUser accepts req.user.user_id and returns rewards payload', async () => {
        const canonicalId = '22222222-2222-4222-8222-222222222222';
        const { controller } = loadControllerWithQueryMock(async ({ text, values }) => {
            if (text.includes("table_name = 'users'") && text.includes("column_name = 'id'")) {
                return { rows: [{ available: false }] };
            }
            if (text.includes('SELECT user_id::text AS user_id') && text.includes('WHERE user_id::text = $1')) {
                expect(values).toEqual([canonicalId]);
                return { rows: [{ user_id: canonicalId }] };
            }
            if (text.includes('SELECT u.user_id, u.username, u.referral_code, p.full_name')) {
                expect(values).toEqual([canonicalId]);
                return { rows: [{ user_id: canonicalId, username: 'alice', referral_code: 'REF123', full_name: 'Alice Doe' }] };
            }
            if (text.includes('SELECT points, tier FROM rewards')) {
                expect(values).toEqual([canonicalId]);
                return { rows: [{ points: 100, tier: 'Bronze' }] };
            }
            if (text.includes('WITH RECURSIVE referral_chain')) {
                expect(values).toEqual([canonicalId]);
                return { rows: [] };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { user_id: canonicalId },
            query: {}
        };
        const res = createResponseMock();

        await controller.getRewardsByUser(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                user: expect.objectContaining({
                    id: canonicalId,
                    name: 'Alice Doe',
                    referralCode: 'REF123',
                    totalCoins: 100
                }),
                referralChain: []
            })
        );
    });
});
