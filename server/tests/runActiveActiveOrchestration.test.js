const {
    parseShiftSteps,
    renderTrafficCommand,
    runOrchestration
} = require('../scripts/run_active_active_orchestration');

describe('run_active_active_orchestration', () => {
    it('parses valid shift steps and rejects invalid ones', () => {
        const steps = parseShiftSteps('90:10,75:25,0:100');
        expect(steps).toEqual([
            { weightA: 90, weightB: 10 },
            { weightA: 75, weightB: 25 },
            { weightA: 0, weightB: 100 }
        ]);

        expect(() => parseShiftSteps('80:10')).toThrow('sum to 100');
    });

    it('renders traffic command templates with placeholders', () => {
        const cmd = renderTrafficCommand(
            'shift --a {WEIGHT_A} --b {WEIGHT_B} --ra {REGION_A} --rb {REGION_B}',
            { weightA: 25, weightB: 75, regionA: 'ra', regionB: 'rb' }
        );
        expect(cmd).toContain('--a 25');
        expect(cmd).toContain('--b 75');
        expect(cmd).toContain('--ra ra');
        expect(cmd).toContain('--rb rb');
    });

    it('completes orchestration when probes stay healthy', async () => {
        const calls = [];
        const report = await runOrchestration(
            {
                regionA: 'http://a',
                regionB: 'http://b',
                healthPath: '/api/ready',
                timeoutMs: 100,
                settleMs: 0,
                rollbackOnFailure: true,
                syntheticProbe: false,
                shiftSteps: [{ weightA: 50, weightB: 50 }, { weightA: 0, weightB: 100 }]
            },
            {
                probeFn: async () => ({
                    ok: true,
                    statusCode: 200,
                    healthStatus: 'ready',
                    durationMs: 1
                }),
                commandRunner: async (weights) => {
                    calls.push(weights);
                    return { mode: 'simulate' };
                },
                sleepFn: async () => undefined
            }
        );

        expect(report.finalStatus).toBe('completed');
        expect(calls).toEqual([{ weightA: 50, weightB: 50 }, { weightA: 0, weightB: 100 }]);
        expect(report.timeline.length).toBeGreaterThan(2);
    });

    it('rolls back when a probe becomes unhealthy', async () => {
        let probeCallCount = 0;
        const commandCalls = [];
        const report = await runOrchestration(
            {
                regionA: 'http://a',
                regionB: 'http://b',
                healthPath: '/api/ready',
                timeoutMs: 100,
                settleMs: 0,
                rollbackOnFailure: true,
                syntheticProbe: false,
                shiftSteps: [{ weightA: 50, weightB: 50 }]
            },
            {
                probeFn: async (baseUrl) => {
                    probeCallCount += 1;
                    if (probeCallCount === 4 && baseUrl === 'http://b') {
                        return { ok: false, statusCode: 500, healthStatus: 'not_ready', durationMs: 1 };
                    }
                    return { ok: true, statusCode: 200, healthStatus: 'ready', durationMs: 1 };
                },
                commandRunner: async (weights) => {
                    commandCalls.push(weights);
                    return { mode: 'simulate' };
                },
                sleepFn: async () => undefined
            }
        );

        expect(report.finalStatus).toBe('rolled_back');
        expect(commandCalls).toEqual([{ weightA: 50, weightB: 50 }, { weightA: 100, weightB: 0 }]);
        expect(report.failures.length).toBe(1);
    });
});
