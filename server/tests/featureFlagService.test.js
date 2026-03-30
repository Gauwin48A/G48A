const { evaluateFlag, validateFlagLifecycle } = require('../src/services/featureFlagService');

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

    it('honors global and per-flag kill switch', () => {
        const globalKill = evaluateFlag('ml_fraud_scoring', { userId: 'u-2' }, {
            FEATURE_FLAGS_ENABLED: 'true',
            FEATURE_FLAGS_KILL_SWITCH: 'true',
            FF_ML_FRAUD_SCORING_ENABLED: 'true',
            FF_ML_FRAUD_SCORING_ROLLOUT_PERCENT: '100'
        });
        expect(globalKill.enabled).toBe(false);
        expect(globalKill.reason).toBe('kill_switch');

        const perFlagKill = evaluateFlag('ml_fraud_scoring', { userId: 'u-2' }, {
            FEATURE_FLAGS_ENABLED: 'true',
            FF_ML_FRAUD_SCORING_ENABLED: 'true',
            FF_ML_FRAUD_SCORING_ROLLOUT_PERCENT: '100',
            FF_ML_FRAUD_SCORING_KILL_SWITCH: 'true'
        });
        expect(perFlagKill.enabled).toBe(false);
        expect(perFlagKill.reason).toBe('kill_switch');
    });

    it('validates lifecycle metadata and catches expired flags', () => {
        const pass = validateFlagLifecycle('ml_fraud_scoring', {
            FF_ML_FRAUD_SCORING_OWNER: 'risk-team',
            FF_ML_FRAUD_SCORING_ROLLBACK_OWNER: 'platform-oncall',
            FF_ML_FRAUD_SCORING_CHANGE_TICKET: 'OPS-221',
            FF_ML_FRAUD_SCORING_EXPIRES_ON: '2026-03-31T00:00:00.000Z'
        }, new Date('2026-03-01T00:00:00.000Z'));
        expect(pass.status).toBe('pass');
        expect(pass.issues).toEqual([]);

        const fail = validateFlagLifecycle('ml_fraud_scoring', {
            FF_ML_FRAUD_SCORING_OWNER: 'risk-team',
            FF_ML_FRAUD_SCORING_ROLLBACK_OWNER: 'platform-oncall',
            FF_ML_FRAUD_SCORING_CHANGE_TICKET: 'OPS-221',
            FF_ML_FRAUD_SCORING_EXPIRES_ON: '2026-01-01T00:00:00.000Z'
        }, new Date('2026-03-01T00:00:00.000Z'));
        expect(fail.status).toBe('fail');
        expect(fail.issues).toContain('expired_flag');
    });
});
