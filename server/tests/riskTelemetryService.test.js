const riskTelemetryService = require('../src/services/riskTelemetryService');

describe('riskTelemetryService', () => {
    beforeEach(() => {
        riskTelemetryService.setPersistenceEnabled(false);
        riskTelemetryService.reset();
    });

    it('records risk decisions and produces aggregated metrics', async () => {
        riskTelemetryService.recordDecision({
            userId: 'u1',
            flow: 'auth_login',
            enabled: true,
            score: 83,
            recommendedAction: 'BLOCK',
            shouldChallenge: true,
            shouldEnforce: true,
            flagReason: 'rollout',
            explainability: [{ feature: 'impossible_travel' }]
        });

        riskTelemetryService.recordDecision({
            userId: 'u2',
            flow: 'auth_login',
            enabled: true,
            score: 35,
            recommendedAction: 'ALLOW',
            shouldChallenge: false,
            shouldEnforce: false,
            flagReason: 'rollout',
            explainability: []
        });

        const metrics = await riskTelemetryService.getMetrics({ lookbackMinutes: 60 });
        expect(metrics.totalEvents).toBe(2);
        expect(metrics.byAction.BLOCK).toBe(1);
        expect(metrics.byAction.ALLOW).toBe(1);
        expect(metrics.challengeCount).toBe(1);
        expect(metrics.enforceCount).toBe(1);
        expect(metrics.avgScore).toBe(59);
        expect(metrics.source).toBe('memory');
    });

    it('returns recent events snapshot for export workflow', async () => {
        riskTelemetryService.recordDecision({
            userId: 'u-export',
            flow: 'auth_login',
            enabled: true,
            score: 64,
            recommendedAction: 'CHALLENGE',
            shouldChallenge: true,
            shouldEnforce: false,
            flagReason: 'rollout',
            explainability: [{ feature: 'device_reputation' }]
        });

        const result = await riskTelemetryService.getRecentEvents({ lookbackMinutes: 30, limit: 10 });
        expect(result.source).toBe('memory');
        expect(result.events.length).toBe(1);
        expect(result.events[0].recommendedAction || result.events[0].recommended_action).toBe('CHALLENGE');
    });
});
