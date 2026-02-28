const {
    parseArgs,
    buildConfig,
    buildDbQueueAuditArgs,
    evaluateDependencies
} = require('../scripts/run_active_active_dependency_gate');

describe('run_active_active_dependency_gate', () => {
    it('parses mixed --key value and --key=value argument styles', () => {
        const args = parseArgs([
            '--skip-probe=true',
            '--timeout-ms', '3500',
            '--region-a-url=https://region-a.example.com',
            '--force-db-queue-audit'
        ]);

        expect(args).toEqual(expect.objectContaining({
            'skip-probe': 'true',
            'timeout-ms': '3500',
            'region-a-url': 'https://region-a.example.com',
            'force-db-queue-audit': 'true'
        }));
    });

    it('defaults region urls to orchestration-compatible localhost values', () => {
        const config = buildConfig({}, {});
        expect(config.regionA).toBe('http://127.0.0.1:5055');
        expect(config.regionB).toBe('http://127.0.0.1:6055');
    });

    it('forwards explicit db urls into db/queue audit command args', () => {
        const args = buildDbQueueAuditArgs({
            dbQueueAuditScript: 'scripts/run_failover_db_queue_audit.js',
            primaryDbUrl: 'postgres://primary',
            replicaDbUrl: 'postgres://replica',
            outputDir: 'docs/artifacts'
        });

        expect(args).toEqual([
            'scripts/run_failover_db_queue_audit.js',
            '--primary-url', 'postgres://primary',
            '--replica-url', 'postgres://replica',
            '--output-dir', 'docs/artifacts'
        ]);
    });

    it('returns BLOCKED when core live dependencies are missing', () => {
        const result = evaluateDependencies({
            config: {
                trafficCommand: '',
                regionA: '',
                regionB: '',
                primaryDbUrl: '',
                replicaDbUrl: ''
            },
            probeRegionA: { ok: false, healthStatus: 'missing_url' },
            probeRegionB: { ok: false, healthStatus: 'missing_url' },
            dbQueueAudit: {
                status: 'BLOCKED',
                report: {
                    gate: {
                        status: 'BLOCKED',
                        reasons: ['missing_primary_or_replica_connection']
                    }
                }
            }
        });

        expect(result.status).toBe('BLOCKED');
        expect(result.eligible).toBe(false);
        expect(result.reasons).toEqual(
            expect.arrayContaining([
                'traffic_manager_command',
                'region_a_endpoint',
                'region_b_endpoint',
                'replica_connection_inputs',
                'db_queue_safety_gate'
            ])
        );
    });

    it('returns COMPLETE when all prerequisites are healthy', () => {
        const result = evaluateDependencies({
            config: {
                trafficCommand: 'shift --a {WEIGHT_A} --b {WEIGHT_B}',
                regionA: 'https://region-a.example.com',
                regionB: 'https://region-b.example.com',
                primaryDbUrl: 'postgres://primary',
                replicaDbUrl: 'postgres://replica'
            },
            probeRegionA: { ok: true, statusCode: 200, healthStatus: 'ready' },
            probeRegionB: { ok: true, statusCode: 200, healthStatus: 'ready' },
            dbQueueAudit: {
                status: 'COMPLETE',
                report: {
                    gate: {
                        status: 'COMPLETE',
                        reasons: []
                    }
                }
            }
        });

        expect(result.status).toBe('COMPLETE');
        expect(result.eligible).toBe(true);
        expect(result.blockedCount).toBe(0);
    });
});
