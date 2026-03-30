#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const pool = require('../src/config/db');
const { evaluateSafetyGate, parseIntSafe } = require('../src/services/failoverSafetyService');

function parseArgs(argv = process.argv.slice(2)) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const equalIndex = token.indexOf('=');
        if (equalIndex > 2) {
            const key = token.slice(2, equalIndex);
            const value = token.slice(equalIndex + 1) || 'true';
            args[key] = value;
            continue;
        }
        const key = token.slice(2);
        const hasInlineValue = argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith('--');
        const value = hasInlineValue ? argv[i + 1] : 'true';
        args[key] = value;
        if (hasInlineValue) i += 1;
    }
    return args;
}

async function collectReplicaLag(primaryUrl, replicaUrl) {
    const primary = new Client({ connectionString: primaryUrl });
    const replica = new Client({ connectionString: replicaUrl });

    await primary.connect();
    await replica.connect();

    try {
        const primaryRes = await primary.query(
            'SELECT NOT pg_is_in_recovery() AS is_primary, pg_current_wal_lsn() AS current_lsn'
        );
        const replicaRes = await replica.query(
            `SELECT
                pg_is_in_recovery() AS is_replica,
                pg_last_wal_replay_lsn() AS replay_lsn,
                COALESCE(EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())), 0)::int AS replay_delay_seconds`
        );

        const primaryInfo = primaryRes.rows[0] || {};
        const replicaInfo = replicaRes.rows[0] || {};

        let byteLag = null;
        if (primaryInfo.current_lsn && replicaInfo.replay_lsn) {
            const lagRes = await primary.query(
                'SELECT pg_wal_lsn_diff($1::pg_lsn, $2::pg_lsn)::bigint AS byte_lag',
                [primaryInfo.current_lsn, replicaInfo.replay_lsn]
            );
            byteLag = Number(lagRes.rows[0]?.byte_lag ?? 0);
        }

        return {
            status: 'COMPLETE',
            primary: {
                isPrimary: Boolean(primaryInfo.is_primary),
                currentLsn: primaryInfo.current_lsn || null
            },
            replica: {
                isReplica: Boolean(replicaInfo.is_replica),
                replayLsn: replicaInfo.replay_lsn || null,
                replayDelaySeconds: Number(replicaInfo.replay_delay_seconds ?? 0)
            },
            lag: {
                byteLag
            }
        };
    } finally {
        await Promise.allSettled([primary.end(), replica.end()]);
    }
}

async function collectQueueReplayAudit(lookbackHours) {
    const summary = {
        status: 'COMPLETE',
        lookbackHours,
        payments: {
            duplicateGroupCount: 0,
            duplicateRowCount: 0
        },
        translationQueue: {
            duplicateGroupCount: 0
        },
        warnings: []
    };

    try {
        const paymentRes = await pool.query(
            `
                WITH duplicate_tx AS (
                    SELECT transaction_id, COUNT(*)::int AS occurrences
                    FROM payments
                    WHERE transaction_id IS NOT NULL
                      AND transaction_id <> ''
                      AND created_at >= NOW() - ($1::text || ' hours')::interval
                    GROUP BY transaction_id
                    HAVING COUNT(*) > 1
                )
                SELECT
                    COUNT(*)::int AS duplicate_group_count,
                    COALESCE(SUM(occurrences), 0)::int AS duplicate_row_count
                FROM duplicate_tx
            `,
            [String(lookbackHours)]
        );

        summary.payments.duplicateGroupCount = Number(paymentRes.rows[0]?.duplicate_group_count || 0);
        summary.payments.duplicateRowCount = Number(paymentRes.rows[0]?.duplicate_row_count || 0);
    } catch (err) {
        summary.status = 'PENDING';
        summary.warnings.push(`payments_duplicate_audit_failed:${err.message}`);
    }

    try {
        const translationRes = await pool.query(
            `
                SELECT COUNT(*)::int AS duplicate_group_count
                FROM (
                    SELECT post_id, target_lang, status, COUNT(*) AS occurrences
                    FROM translation_queue
                    WHERE status IN ('pending', 'processing')
                    GROUP BY post_id, target_lang, status
                    HAVING COUNT(*) > 1
                ) dup
            `
        );
        summary.translationQueue.duplicateGroupCount = Number(translationRes.rows[0]?.duplicate_group_count || 0);
    } catch (err) {
        summary.status = 'PENDING';
        summary.warnings.push(`translation_duplicate_audit_failed:${err.message}`);
    }

    return summary;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const primaryUrl = (args['primary-url'] || process.env.FAILOVER_PRIMARY_DB_URL || '').trim();
    const replicaUrl = (args['replica-url'] || process.env.FAILOVER_REPLICA_DB_URL || '').trim();
    const lookbackHours = parseIntSafe(args['queue-lookback-hours'] || process.env.FAILOVER_QUEUE_AUDIT_LOOKBACK_HOURS, 24, { min: 1, max: 24 * 30 });
    const outputDir = path.resolve(
        process.cwd(),
        args['output-dir'] || process.env.FAILOVER_DB_QUEUE_AUDIT_OUTPUT_DIR || 'docs/artifacts'
    );

    const thresholds = {
        maxReplicaLagBytes: parseIntSafe(process.env.FAILOVER_MAX_REPLICA_LAG_BYTES, 16 * 1024 * 1024),
        maxReplicaReplayDelaySeconds: parseIntSafe(process.env.FAILOVER_MAX_REPLAY_DELAY_SECONDS, 60),
        maxQueueDuplicateGroups: parseIntSafe(process.env.FAILOVER_MAX_QUEUE_DUPLICATE_GROUPS, 0),
        maxQueueDuplicateRows: parseIntSafe(process.env.FAILOVER_MAX_QUEUE_DUPLICATE_ROWS, 0),
        maxTranslationDuplicateGroups: parseIntSafe(process.env.FAILOVER_MAX_TRANSLATION_DUPLICATE_GROUPS, 0)
    };

    let replicaLagAudit = {
        status: 'BLOCKED',
        reason: 'missing_primary_or_replica_connection'
    };

    if (primaryUrl && replicaUrl) {
        try {
            replicaLagAudit = await collectReplicaLag(primaryUrl, replicaUrl);
        } catch (err) {
            replicaLagAudit = {
                status: 'BLOCKED',
                reason: `replica_lag_collection_failed:${err.message}`
            };
        }
    }

    const queueReplayAudit = await collectQueueReplayAudit(lookbackHours);
    const gate = evaluateSafetyGate({
        infraConfigured: Boolean(primaryUrl && replicaUrl),
        replicaLagBytes: replicaLagAudit?.lag?.byteLag,
        replicaReplayDelaySeconds: replicaLagAudit?.replica?.replayDelaySeconds,
        queueDuplicateGroups: queueReplayAudit.payments.duplicateGroupCount,
        queueDuplicateRows: queueReplayAudit.payments.duplicateRowCount,
        translationDuplicateGroups: queueReplayAudit.translationQueue.duplicateGroupCount,
        thresholds
    });

    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `failover_db_queue_audit_${stamp}.json`);
    const report = {
        generatedAt: new Date().toISOString(),
        gate,
        thresholds,
        replicaLagAudit,
        queueReplayAudit,
        dependencies: {
            primaryUrlConfigured: Boolean(primaryUrl),
            replicaUrlConfigured: Boolean(replicaUrl)
        }
    };
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`FAILOVER_DB_QUEUE_AUDIT=${outputPath}`);
    console.log(`FAILOVER_DB_QUEUE_STATUS=${gate.status}`);
}

main().catch((err) => {
    console.error(`FAILOVER_DB_QUEUE_ERROR=${err.message}`);
    process.exitCode = 1;
});
