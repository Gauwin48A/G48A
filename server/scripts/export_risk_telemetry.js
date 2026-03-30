#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const riskTelemetryService = require('../src/services/riskTelemetryService');

function parseArgs(argv = process.argv.slice(2)) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const key = token.slice(2);
        const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
        args[key] = value;
        if (value !== 'true') i += 1;
    }
    return args;
}

function parseIntSafe(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function chunk(list, size) {
    if (!Array.isArray(list) || list.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < list.length; i += size) {
        chunks.push(list.slice(i, i + size));
    }
    return chunks;
}

async function pushToSink(sinkUrl, batches, runId) {
    const delivery = [];
    for (let index = 0; index < batches.length; index += 1) {
        const payload = {
            runId,
            batchIndex: index,
            batchSize: batches[index].length,
            events: batches[index]
        };
        const startedAt = Date.now();
        try {
            const response = await fetch(sinkUrl, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const responseText = await response.text();
            delivery.push({
                batchIndex: index,
                ok: response.ok,
                statusCode: response.status,
                durationMs: Date.now() - startedAt,
                responseSnippet: responseText.slice(0, 500)
            });
        } catch (err) {
            delivery.push({
                batchIndex: index,
                ok: false,
                statusCode: 0,
                durationMs: Date.now() - startedAt,
                error: err.message
            });
        }
    }

    return delivery;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const lookbackMinutes = parseIntSafe(args['lookback-minutes'] || process.env.RISK_TELEMETRY_EXPORT_LOOKBACK_MINUTES, 60, { min: 1, max: 24 * 60 });
    const limit = parseIntSafe(args.limit || process.env.RISK_TELEMETRY_EXPORT_LIMIT, 1000, { min: 1, max: 10000 });
    const batchSize = parseIntSafe(args['batch-size'] || process.env.RISK_TELEMETRY_EXPORT_BATCH_SIZE, 200, { min: 1, max: 1000 });
    const sinkUrl = (args['sink-url'] || process.env.RISK_TELEMETRY_EXPORT_SINK_URL || '').trim();
    const outputDir = path.resolve(process.cwd(), args['output-dir'] || process.env.RISK_TELEMETRY_EXPORT_OUTPUT_DIR || 'docs/artifacts');
    const runId = `risk-export-${Date.now()}`;

    const result = await riskTelemetryService.getRecentEvents({ lookbackMinutes, limit });
    const batches = chunk(result.events, batchSize);

    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ndjsonPath = path.join(outputDir, `risk_telemetry_export_${stamp}.ndjson`);
    const summaryPath = path.join(outputDir, `risk_telemetry_export_${stamp}.json`);

    const ndjson = result.events.map((event) => JSON.stringify(event)).join('\n');
    fs.writeFileSync(ndjsonPath, ndjson ? `${ndjson}\n` : '', 'utf8');

    const delivery = sinkUrl && batches.length > 0
        ? await pushToSink(sinkUrl, batches, runId)
        : [];

    const summary = {
        generatedAt: new Date().toISOString(),
        runId,
        lookbackMinutes,
        limit,
        source: result.source,
        totalEvents: result.events.length,
        sinkUrl: sinkUrl || null,
        batchSize,
        batchCount: batches.length,
        delivery,
        output: {
            ndjsonPath,
            summaryPath
        }
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`RISK_TELEMETRY_EXPORT_NDJSON=${ndjsonPath}`);
    console.log(`RISK_TELEMETRY_EXPORT_SUMMARY=${summaryPath}`);
    console.log(`RISK_TELEMETRY_EXPORT_TOTAL=${result.events.length}`);
}

main().catch((err) => {
    console.error(`RISK_TELEMETRY_EXPORT_ERROR=${err.message}`);
    process.exitCode = 1;
});
