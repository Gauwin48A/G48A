#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function toIsoWithOffset(baseDate, minutesOffset) {
    return new Date(baseDate.getTime() + minutesOffset * 60 * 1000).toISOString();
}

function buildTimeline(base = new Date()) {
    return [
        { tPlusMin: 0, phase: 'trigger', event: 'Region-A DB primary marked unhealthy by monitoring', owner: 'oncall-sre' },
        { tPlusMin: 2, phase: 'decision', event: 'Incident commander opened SEV-1 and declared regional failover', owner: 'incident-commander' },
        { tPlusMin: 5, phase: 'execution', event: 'Traffic weights shifted to Region-B at edge/load balancer', owner: 'platform-oncall' },
        { tPlusMin: 9, phase: 'execution', event: 'Session and cache validation passed in Region-B', owner: 'backend-oncall' },
        { tPlusMin: 12, phase: 'verification', event: 'Critical API probes green in Region-B', owner: 'qa-oncall' },
        { tPlusMin: 18, phase: 'stabilization', event: 'Primary user traffic operating from Region-B', owner: 'incident-commander' },
        { tPlusMin: 34, phase: 'rollback-prep', event: 'Region-A restored and replication healthy', owner: 'db-oncall' },
        { tPlusMin: 41, phase: 'rollback', event: 'Traffic gradually restored to Region-A', owner: 'platform-oncall' },
        { tPlusMin: 46, phase: 'closeout', event: 'Incident closed after post-checks and customer comms', owner: 'incident-commander' }
    ].map((row) => ({ ...row, timestamp: toIsoWithOffset(base, row.tPlusMin) }));
}

function computeRtoRpo(timeline) {
    const trigger = timeline.find((row) => row.phase === 'trigger');
    const stabilization = timeline.find((row) => row.phase === 'stabilization');
    const dbRestorePointMinutes = 4;

    const rtoMinutes = trigger && stabilization ? stabilization.tPlusMin - trigger.tPlusMin : null;
    const rpoMinutes = dbRestorePointMinutes;

    return {
        rtoMinutes,
        rpoMinutes,
        assumptions: [
            'WAL shipping interval at 60 seconds with 4-minute worst-case replay lag under incident load.',
            'Edge DNS and load balancer propagation complete within 3 minutes.',
            'No schema drift between active regions.'
        ]
    };
}

function buildReport() {
    const generatedAt = new Date();
    const timeline = buildTimeline(generatedAt);
    const metrics = computeRtoRpo(timeline);

    return {
        generatedAt: generatedAt.toISOString(),
        exerciseType: 'tabletop-simulation',
        scope: 'multi-region failover and rollback',
        participants: [
            'incident-commander',
            'platform-oncall',
            'backend-oncall',
            'db-oncall',
            'qa-oncall'
        ],
        timeline,
        metrics,
        unresolvedDependencies: [
            'Cross-region write conflict automation is still manual.',
            'Message queue failover replay has not been validated with production traffic volume.',
            'Synthetic failover probes are not yet wired into CI release gates.'
        ]
    };
}

function writeReport(report) {
    const outputDir = path.resolve(__dirname, '..', 'docs', 'artifacts');
    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `failover_tabletop_${stamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
}

function main() {
    const report = buildReport();
    const outputPath = writeReport(report);
    console.log(`FAILOVER_DRILL_REPORT=${outputPath}`);
}

main();
