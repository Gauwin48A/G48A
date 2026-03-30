#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function parseArgs(argv = process.argv.slice(2)) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;

        const eqIndex = token.indexOf('=');
        if (eqIndex > 2) {
            const key = token.slice(2, eqIndex);
            args[key] = token.slice(eqIndex + 1) || 'true';
            continue;
        }

        const key = token.slice(2);
        const hasValue = argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith('--');
        args[key] = hasValue ? argv[i + 1] : 'true';
        if (hasValue) i += 1;
    }
    return args;
}

function parseIntSafe(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildConfig(args) {
    const serverRoot = path.resolve(__dirname, '..');
    const defaultFiles = [
        'add_admin_moderation_contract.sql',
        'add_complaint_sla_and_evidence.sql',
        'add_kyc_review_queue.sql',
        'add_otp_delivery_tracking.sql',
        'add_query_path_indexes_20260227.sql',
        'add_review_moderation_controls.sql'
    ];

    const migrationFiles = String(args.files || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return {
        runId: args['run-id'] || `migration-rerun-${Date.now()}`,
        passes: parseIntSafe(args.passes, 2),
        files: migrationFiles.length > 0 ? migrationFiles : defaultFiles,
        outputDir: path.resolve(serverRoot, args['output-dir'] || 'docs/artifacts'),
        runMigrationScript: path.resolve(serverRoot, args['runner-script'] || 'run_migration.js'),
        serverRoot
    };
}

function runMigration(config, migrationFile) {
    const relPath = `database/migrations/${migrationFile}`;
    const startedAt = new Date().toISOString();

    try {
        const stdout = execFileSync('node', [config.runMigrationScript, relPath], {
            cwd: config.serverRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        return {
            file: migrationFile,
            status: 'COMPLETE',
            startedAt,
            finishedAt: new Date().toISOString(),
            command: `node run_migration.js ${relPath}`,
            output: String(stdout || '').trim()
        };
    } catch (error) {
        return {
            file: migrationFile,
            status: 'BLOCKED',
            startedAt,
            finishedAt: new Date().toISOString(),
            command: `node run_migration.js ${relPath}`,
            error: error.message
        };
    }
}

function writeArtifact(config, report) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(config.outputDir, `migration_apply_rerun_${stamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    return outputPath;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = buildConfig(args);

    const passResults = [];
    let failed = false;
    for (let pass = 1; pass <= config.passes; pass += 1) {
        const results = [];
        for (const file of config.files) {
            const result = runMigration(config, file);
            results.push(result);
            if (result.status !== 'COMPLETE') {
                failed = true;
            }
        }
        passResults.push({
            pass,
            status: results.every((item) => item.status === 'COMPLETE') ? 'COMPLETE' : 'BLOCKED',
            results
        });
    }

    const report = {
        generatedAt: new Date().toISOString(),
        runId: config.runId,
        status: failed ? 'BLOCKED' : 'COMPLETE',
        passes: config.passes,
        files: config.files,
        summary: {
            totalRuns: passResults.reduce((sum, pass) => sum + pass.results.length, 0),
            completeCount: passResults.reduce((sum, pass) => sum + pass.results.filter((r) => r.status === 'COMPLETE').length, 0),
            blockedCount: passResults.reduce((sum, pass) => sum + pass.results.filter((r) => r.status === 'BLOCKED').length, 0)
        },
        passResults
    };

    const artifactPath = writeArtifact(config, report);
    console.log(`MIGRATION_APPLY_RERUN_REPORT=${artifactPath}`);
    console.log(`MIGRATION_APPLY_RERUN_STATUS=${report.status}`);

    if (failed) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArgs,
    buildConfig
};
