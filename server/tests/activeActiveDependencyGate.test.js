const { evaluateDependencies } = require('../scripts/run_active_active_dependency_gate');

describe('run_active_active_dependency_gate', () => {
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

