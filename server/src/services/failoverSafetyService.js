function parseIntSafe(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function evaluateSafetyGate({
    replicaLagBytes = null,
    replicaReplayDelaySeconds = null,
    queueDuplicateGroups = 0,
    queueDuplicateRows = 0,
    translationDuplicateGroups = 0,
    infraConfigured = false,
    thresholds = {}
} = {}) {
    const maxReplicaLagBytes = parseIntSafe(thresholds.maxReplicaLagBytes, 16 * 1024 * 1024);
    const maxReplicaReplayDelaySeconds = parseIntSafe(thresholds.maxReplicaReplayDelaySeconds, 60);
    const maxQueueDuplicateGroups = parseIntSafe(thresholds.maxQueueDuplicateGroups, 0);
    const maxQueueDuplicateRows = parseIntSafe(thresholds.maxQueueDuplicateRows, 0);
    const maxTranslationDuplicateGroups = parseIntSafe(thresholds.maxTranslationDuplicateGroups, 0);

    if (!infraConfigured) {
        return {
            status: 'BLOCKED',
            eligible: false,
            reasons: ['missing_primary_or_replica_connection'],
            thresholds: {
                maxReplicaLagBytes,
                maxReplicaReplayDelaySeconds,
                maxQueueDuplicateGroups,
                maxQueueDuplicateRows,
                maxTranslationDuplicateGroups
            }
        };
    }

    const reasons = [];
    if (Number.isFinite(replicaLagBytes) && replicaLagBytes > maxReplicaLagBytes) {
        reasons.push('replica_lag_bytes_exceeded');
    }
    if (Number.isFinite(replicaReplayDelaySeconds) && replicaReplayDelaySeconds > maxReplicaReplayDelaySeconds) {
        reasons.push('replica_replay_delay_exceeded');
    }
    if (queueDuplicateGroups > maxQueueDuplicateGroups) {
        reasons.push('queue_duplicate_groups_exceeded');
    }
    if (queueDuplicateRows > maxQueueDuplicateRows) {
        reasons.push('queue_duplicate_rows_exceeded');
    }
    if (translationDuplicateGroups > maxTranslationDuplicateGroups) {
        reasons.push('translation_duplicate_groups_exceeded');
    }

    return {
        status: reasons.length === 0 ? 'COMPLETE' : 'PENDING',
        eligible: reasons.length === 0,
        reasons,
        thresholds: {
            maxReplicaLagBytes,
            maxReplicaReplayDelaySeconds,
            maxQueueDuplicateGroups,
            maxQueueDuplicateRows,
            maxTranslationDuplicateGroups
        }
    };
}

module.exports = {
    parseIntSafe,
    evaluateSafetyGate
};
