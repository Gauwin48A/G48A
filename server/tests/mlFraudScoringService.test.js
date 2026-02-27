const { scoreLoginAttempt } = require('../src/services/mlFraudScoringService');

describe('mlFraudScoringService', () => {
    it('returns SKIP when flag is disabled', async () => {
        const result = await scoreLoginAttempt(
            { userId: 'user-1', signals: { impossibleTravel: true } },
            {
                FEATURE_FLAGS_ENABLED: 'true',
                FF_ML_FRAUD_SCORING_ENABLED: 'false'
            }
        );

        expect(result.enabled).toBe(false);
        expect(result.recommendedAction).toBe('SKIP');
        expect(result.score).toBeNull();
    });

    it('returns explainable risk score in shadow mode', async () => {
        const result = await scoreLoginAttempt(
            {
                userId: 'user-2',
                signals: {
                    impossibleTravel: true,
                    gpsIpMismatchKm: 240,
                    recentFailedLogins: 3
                }
            },
            {
                FEATURE_FLAGS_ENABLED: 'true',
                FF_ML_FRAUD_SCORING_ENABLED: 'true',
                FF_ML_FRAUD_SCORING_ROLLOUT_PERCENT: '100',
                FRAUD_ML_SHADOW_MODE: 'true'
            }
        );

        expect(result.enabled).toBe(true);
        expect(result.score).toBeGreaterThan(70);
        expect(result.recommendedAction).toMatch(/ALLOW|CHALLENGE|BLOCK/);
        expect(Array.isArray(result.explainability)).toBe(true);
        expect(result.explainability.length).toBeGreaterThan(0);
        expect(result.shouldEnforce).toBe(false);
    });
});
