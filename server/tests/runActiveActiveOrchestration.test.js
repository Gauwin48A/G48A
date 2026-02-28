const {
    parseShiftSteps,
    renderTrafficCommand,
    buildSafetyAuditArgs,
    evaluatePreflight,
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

    it('builds safety-audit args from orchestration config', () => {
        const args = buildSafetyAuditArgs({
            regionA: 'https://region-a.example.com',
            regionB: 'https://region-b.example.com',
            healthPath: '/api/ready',
            timeoutMs: 4500,
            trafficCommandTemplate: 'shift --a {WEIGHT_A} --b {WEIGHT_B}',
            mode: 'execute'
        });

        expect(args).toEqual(expect.arrayContaining([
            '--region-a-url', 'https://region-a.example.com',
            '--region-b-url', 'https://region-b.example.com',
            '--health-path', '/api/ready',
            '--timeout-ms', '4500',
            '--traffic-command', 'shift --a {WEIGHT_A} --b {WEIGHT_B}',
            '--force-db-queue-audit', 'true'
        ]));
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

    it('blocks orchestration when execute preflight is not eligible', async () => {
        const preflight = evaluatePreflight(
            {
                mode: 'execute',
                trafficCommandTemplate: '',
                trafficCommandRequired: true,
                safetyGateRequired: true
            },
            {
                report: {
                    gate: {
                        status: 'BLOCKED'
                    }
                }
            }
        );

        const report = await runOrchestration(
            {
                regionA: 'http://a',
                regionB: 'http://b',
                healthPath: '/api/ready',
                timeoutMs: 100,
                settleMs: 0,
                rollbackOnFailure: true,
                syntheticProbe: false,
                shiftSteps: [{ weightA: 50, weightB: 50 }],
                preflight
            },
            {
                probeFn: async () => ({
                    ok: true,
                    statusCode: 200,
                    healthStatus: 'ready',
                    durationMs: 1
                }),
                commandRunner: async () => ({ mode: 'simulate' }),
                sleepFn: async () => undefined
            }
        );

        expect(report.finalStatus).toBe('blocked_preflight');
        expect(report.failures).toEqual(
            expect.arrayContaining(['missing_traffic_command_template', 'safety_gate_blocked'])
        );
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

    it('blocks when region-b is unhealthy before shift starts', async () => {
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
                    if (baseUrl === 'http://b') {
                        return { ok: false, statusCode: 503, healthStatus: 'not_ready', durationMs: 1 };
                    }
                    return { ok: true, statusCode: 200, healthStatus: 'ready', durationMs: 1 };
                },
                commandRunner: async () => ({ mode: 'simulate' }),
                sleepFn: async () => undefined
            }
        );

        expect(report.finalStatus).toBe('blocked_initial_unhealthy_region_b');
        expect(report.failures).toEqual(expect.arrayContaining(['Region-B is unhealthy before orchestration start']));
    });
});
