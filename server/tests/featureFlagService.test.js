const { evaluateFlag } = require('../src/services/featureFlagService');

describe('featureFlagService', () => {
    it('disables all flags when global switch is off', () => {
        const result = evaluateFlag('ml_fraud_scoring', { userId: 'u-1' }, {
            FEATURE_FLAGS_ENABLED: 'false',
            FF_ML_FRAUD_SCORING_ENABLED: 'true',
            FF_ML_FRAUD_SCORING_ROLLOUT_PERCENT: '100'
        });

        expect(result.enabled).toBe(false);
        expect(result.reason).toBe('feature_flags_disabled');
    });

    it('supports deterministic percentage rollout', () => {
        const env = {
            FEATURE_FLAGS_ENABLED: 'true',
            FF_ML_FRAUD_SCORING_ENABLED: 'true',
            FF_ML_FRAUD_SCORING_ROLLOUT_PERCENT: '50'
        };

        const first = evaluateFlag('ml_fraud_scoring', { userId: 'same-user' }, env);
        const second = evaluateFlag('ml_fraud_scoring', { userId: 'same-user' }, env);

        expect(first.bucket).toBe(second.bucket);
        expect(first.enabled).toBe(second.enabled);
    });
});
