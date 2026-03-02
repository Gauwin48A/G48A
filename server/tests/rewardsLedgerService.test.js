function normalizeQueryArgs(arg, values) {
    if (typeof arg === 'string') {
        return { text: arg, values: values || [] };
    }
    if (arg && typeof arg === 'object' && typeof arg.text === 'string') {
        return { text: arg.text, values: arg.values || [] };
    }
    return { text: String(arg || ''), values: [] };
}

const {
    applyRewardDeltaInTransaction,
    InsufficientPointsError
} = require('../src/services/rewardsLedgerService');

describe('rewardsLedgerService', () => {
    it('applies positive reward delta and recalculates tier', async () => {
        const executed = [];
        const client = {
            query: jest.fn(async (arg, values) => {
                const normalized = normalizeQueryArgs(arg, values);
                executed.push(normalized);

                if (normalized.text.includes('SELECT points') && normalized.text.includes('FOR UPDATE')) {
                    return { rows: [{ points: 450 }] };
                }

                return { rows: [], rowCount: 1 };
            })
        };

        const result = await applyRewardDeltaInTransaction({
            client,
            userId: 'user-1',
            pointsDelta: 100,
            action: 'sale_completed',
            description: 'Sale reward'
        });

        expect(result).toEqual(
            expect.objectContaining({
                applied: true,
                duplicate: false,
                pointsBefore: 450,
                pointsAfter: 550,
                tier: 'Silver'
            })
        );

        expect(executed.some((entry) => entry.text.includes('UPDATE rewards'))).toBe(true);
        expect(executed.some((entry) => entry.text.includes('INSERT INTO reward_log'))).toBe(true);
    });

    it('rejects negative delta when balance would become negative', async () => {
        const client = {
            query: jest.fn(async (arg, values) => {
                const normalized = normalizeQueryArgs(arg, values);
                if (normalized.text.includes('SELECT points') && normalized.text.includes('FOR UPDATE')) {
                    return { rows: [{ points: 25 }] };
                }
                return { rows: [], rowCount: 1 };
            })
        };

        await expect(
            applyRewardDeltaInTransaction({
                client,
                userId: 'user-1',
                pointsDelta: -50,
                action: 'redemption',
                description: 'Redeem points'
            })
        ).rejects.toBeInstanceOf(InsufficientPointsError);
    });
});
