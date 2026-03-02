function normalizeQueryArgs(arg, values) {
    if (typeof arg === 'string') {
        return { text: arg, values: values || [] };
    }
    if (arg && typeof arg === 'object' && typeof arg.text === 'string') {
        return { text: arg.text, values: arg.values || [] };
    }
    return { text: String(arg || ''), values: [] };
}

function loadControllerWithPoolMock(queryImpl, options = {}) {
    jest.resetModules();

    const poolQuery = jest.fn((arg, values) => queryImpl(normalizeQueryArgs(arg, values)));
    const clientQuery = jest.fn((arg, values) => {
        const normalized = normalizeQueryArgs(arg, values);
        if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized.text)) {
            return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return queryImpl(normalized);
    });
    const connect = jest.fn(async () => ({
        query: clientQuery,
        release: jest.fn()
    }));
    const logger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    };
    class MockInsufficientPointsError extends Error {
        constructor(availablePoints) {
            super('Insufficient reward points');
            this.availablePoints = availablePoints;
        }
    }
    class MockInvalidRewardInputError extends Error {}
    const rewardsLedgerService = {
        applyRewardDeltaInTransaction: jest.fn(
            options.applyRewardDeltaInTransaction
            || (async () => ({
                applied: true,
                duplicate: false,
                pointsAfter: 800
            }))
        ),
        afterCommitRewardMutation: jest.fn(),
        InsufficientPointsError: MockInsufficientPointsError,
        InvalidRewardInputError: MockInvalidRewardInputError
    };

    jest.doMock('../src/config/db', () => ({ query: poolQuery, connect }));
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/services/rewardsLedgerService', () => rewardsLedgerService);

    const controller = require('../src/controllers/rewardController');
    return { controller, poolQuery, clientQuery, connect, logger, rewardsLedgerService };
}

function createResponseMock() {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };
    res.status.mockReturnValue(res);
    return res;
}

describe('rewardController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getMyRewards resolves canonical user id and uses text-safe filters', async () => {
        const { controller, poolQuery } = loadControllerWithPoolMock(async ({ text, values }) => {
            if (text.includes("table_name = 'reward_log'") && text.includes("column_name = 'id'")) {
                return { rows: [{ available: false }] };
            }
            if (text.includes("table_name = 'users'") && text.includes("column_name = 'id'")) {
                return { rows: [{ available: true }] };
            }
            if (text.includes('SELECT user_id::text AS user_id') && text.includes('OR id::text = $1')) {
                expect(values).toEqual(['212']);
                return { rows: [{ user_id: '11111111-1111-4111-8111-111111111111' }] };
            }
            if (text.includes('SELECT points, tier FROM rewards')) {
                expect(text).toContain('user_id::text = $1');
                expect(values).toEqual(['11111111-1111-4111-8111-111111111111']);
                return { rows: [{ points: 150, tier: 'Silver' }] };
            }
            if (text.includes('FROM reward_log')) {
                expect(text).toContain('user_id::text = $1');
                expect(values).toEqual(['11111111-1111-4111-8111-111111111111']);
                return { rows: [{ id: 'log-1', action: 'bonus', points: 50, description: 'Welcome', created_at: '2026-02-28T00:00:00.000Z' }] };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = { user: { user_id: '212' } };
        const res = createResponseMock();

        await controller.getMyRewards(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            points: 150,
            tier: 'Silver',
            history: [expect.objectContaining({ action: 'bonus', points: 50 })]
        });

        const rewardsQueryText = poolQuery.mock.calls.find((call) => {
            const arg = normalizeQueryArgs(call[0], call[1]);
            return arg.text.includes('SELECT points, tier FROM rewards');
        });
        expect(normalizeQueryArgs(rewardsQueryText[0], rewardsQueryText[1]).text).toContain('user_id::text = $1');
    });

    it('redeemRewards updates balances with text-safe user id filters', async () => {
        const { controller, clientQuery, rewardsLedgerService } = loadControllerWithPoolMock(async ({ text, values }) => {
            if (text.includes("table_name = 'users'") && text.includes("column_name = 'id'")) {
                return { rows: [{ available: true }] };
            }
            if (text.includes('SELECT user_id::text AS user_id') && text.includes('OR id::text = $1')) {
                return { rows: [{ user_id: '11111111-1111-4111-8111-111111111111' }] };
            }
            if (text.includes('UPDATE users SET post_credits = post_credits + $1')) {
                expect(text).toContain('WHERE user_id::text = $2');
                expect(values).toEqual([2, '11111111-1111-4111-8111-111111111111']);
                return { rowCount: 1, rows: [] };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { id: '212' },
            body: { points: 200 }
        };
        const res = createResponseMock();

        await controller.redeemRewards(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            message: 'Redeemed 200 points for 2 post credits',
            creditsGranted: 2,
            remainingPoints: 800,
            duplicate: false
        });
        expect(rewardsLedgerService.applyRewardDeltaInTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: '11111111-1111-4111-8111-111111111111',
                pointsDelta: -200,
                action: 'redemption'
            })
        );
        expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    });
});
