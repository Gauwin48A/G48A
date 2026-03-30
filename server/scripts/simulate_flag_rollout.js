#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { evaluateFlag, validateFlagLifecycle, getFlagEnvVarNames } = require('../src/services/featureFlagService');
const { appendAuditEntry, readRecentEntries } = require('../src/services/flagAuditService');

const FLAG_KEY = 'ml_fraud_scoring_challenge';
const normalizedKey = FLAG_KEY.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
const envKeys = getFlagEnvVarNames(normalizedKey);

function cloneEnv(base = process.env) {
    return { ...base };
}

function setLifecycleMetadata(env) {
    env[envKeys.enabled] = 'true';
    env[envKeys.owner] = 'risk-engineering';
    env[envKeys.rollbackOwner] = 'platform-oncall';
    env[envKeys.changeTicket] = 'OPS-2741';
    env[envKeys.expiresOn] = '2026-04-30T00:00:00.000Z';
}

function evaluateCohortSample(env, sampleSize = 200) {
    let enabled = 0;
    for (let i = 1; i <= sampleSize; i += 1) {
        const decision = evaluateFlag(FLAG_KEY, { userId: `sim-user-${i}` }, env);
        if (decision.enabled) enabled += 1;
    }
    return {
        enabledUsers: enabled,
        sampleSize,
        enabledPercent: Number(((enabled / sampleSize) * 100).toFixed(2))
    };
}

function appendRolloutAuditEntry({ actor, action, reason, before, after, abortThreshold, env }) {
    return appendAuditEntry({
        flagKey: FLAG_KEY,
        actor,
        action,
        owner: env[envKeys.owner],
        rollbackOwner: env[envKeys.rollbackOwner],
        changeTicket: env[envKeys.changeTicket],
        reason,
        rolloutBefore: before,
        rolloutAfter: after,
        expiresOn: env[envKeys.expiresOn],
        abortThreshold,
        metadata: {
            cohortType: 'challenge-only',
            riskMode: 'observe_then_enforce'
        }
    }, env);
}

function ensureArtifactsDir() {
    const outputDir = path.resolve(__dirname, '..', 'docs', 'artifacts');
    fs.mkdirSync(outputDir, { recursive: true });
    return outputDir;
}

function writeReport(report) {
    const outputDir = ensureArtifactsDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `flag_rollout_simulation_${stamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
}

function main() {
    const env = cloneEnv();
    setLifecycleMetadata(env);
    env.FEATURE_FLAGS_ENABLED = 'true';
    env.FEATURE_FLAGS_KILL_SWITCH = 'false';

    const lifecycleCheck = validateFlagLifecycle(FLAG_KEY, env);
    if (lifecycleCheck.status !== 'pass') {
        throw new Error(`Flag lifecycle validation failed: ${lifecycleCheck.issues.join(', ')}`);
    }

    const rolloutPlan = [
        { action: 'canary', percent: 1, actor: 'release-manager', abortThreshold: '429_rate > 8%' },
        { action: 'ramp', percent: 5, actor: 'release-manager', abortThreshold: 'challenge_dropoff > 15%' },
        { action: 'broad', percent: 25, actor: 'release-manager', abortThreshold: 'support_tickets > 2x baseline' }
    ];

    const steps = [];
    let previous = 0;
    for (const step of rolloutPlan) {
        env[envKeys.rolloutPercent] = String(step.percent);
        appendRolloutAuditEntry({
            actor: step.actor,
            action: step.action,
            reason: `rollout_${step.action}`,
            before: previous,
            after: step.percent,
            abortThreshold: step.abortThreshold,
            env
        });
        const cohort = evaluateCohortSample(env);
        steps.push({
            ...step,
            previousPercent: previous,
            observedEnabledPercent: cohort.enabledPercent,
            enabledUsers: cohort.enabledUsers,
            sampleSize: cohort.sampleSize
        });
        previous = step.percent;
    }

    env[envKeys.rolloutPercent] = '0';
    env[envKeys.killSwitch] = 'true';
    appendRolloutAuditEntry({
        actor: 'platform-oncall',
        action: 'abort',
        reason: 'simulated_abort_threshold_hit',
        before: previous,
        after: 0,
        abortThreshold: 'manual_kill_switch',
        env
    });

    const postAbort = evaluateFlag(FLAG_KEY, { userId: 'sim-user-abort' }, env);
    const recentAuditEntries = readRecentEntries({ limit: 8, env });

    const report = {
        generatedAt: new Date().toISOString(),
        flagKey: FLAG_KEY,
        lifecycleCheck,
        rolloutPlan: steps,
        abortVerification: {
            killSwitch: true,
            flagEnabledAfterAbort: postAbort.enabled,
            reason: postAbort.reason
        },
        recentAuditEntries
    };

    const outputPath = writeReport(report);
    console.log(`FLAG_ROLLOUT_REPORT=${outputPath}`);
}

main();
