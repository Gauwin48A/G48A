const { evaluateSafetyGate } = require('../src/services/failoverSafetyService');

describe('failoverSafetyService', () => {
    it('returns BLOCKED when infra connection details are missing', () => {
        const gate = evaluateSafetyGate({
            infraConfigured: false
        });

        expect(gate.status).toBe('BLOCKED');
        expect(gate.eligible).toBe(false);
        expect(gate.reasons).toContain('missing_primary_or_replica_connection');
    });

    it('returns COMPLETE when all values are under thresholds', () => {
        const gate = evaluateSafetyGate({
            infraConfigured: true,
            replicaLagBytes: 512,
            replicaReplayDelaySeconds: 2,
            queueDuplicateGroups: 0,
            queueDuplicateRows: 0,
            translationDuplicateGroups: 0,
            thresholds: {
                maxReplicaLagBytes: 1024,
                maxReplicaReplayDelaySeconds: 5,
                maxQueueDuplicateGroups: 0,
                maxQueueDuplicateRows: 0,
                maxTranslationDuplicateGroups: 0
            }
        });

        expect(gate.status).toBe('COMPLETE');
        expect(gate.eligible).toBe(true);
        expect(gate.reasons).toHaveLength(0);
    });

    it('returns PENDING when queue/idempotency thresholds are breached', () => {
        const gate = evaluateSafetyGate({
            infraConfigured: true,
            replicaLagBytes: 512,
            replicaReplayDelaySeconds: 2,
            queueDuplicateGroups: 2,
            queueDuplicateRows: 7,
            translationDuplicateGroups: 1,
            thresholds: {
                maxReplicaLagBytes: 1024,
                maxReplicaReplayDelaySeconds: 5,
                maxQueueDuplicateGroups: 0,
                maxQueueDuplicateRows: 0,
                maxTranslationDuplicateGroups: 0
            }
        });

        expect(gate.status).toBe('PENDING');
        expect(gate.eligible).toBe(false);
        expect(gate.reasons).toEqual(
            expect.arrayContaining([
                'queue_duplicate_groups_exceeded',
                'queue_duplicate_rows_exceeded',
                'translation_duplicate_groups_exceeded'
            ])
        );
    });
});
