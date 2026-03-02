#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const allowedModes = new Set(['quick', 'standard', 'strict']);

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInt(rawValue, fallback, { allowZero = false } = {}) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (allowZero && parsed === 0) return 0;
  if (parsed > 0) return parsed;
  return fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const equalsIndex = token.indexOf('=');
    if (equalsIndex > 2) {
      args[token.slice(2, equalsIndex)] = token.slice(equalsIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const hasValue = next !== undefined && !String(next).startsWith('--');
    args[key] = hasValue ? next : 'true';
    if (hasValue) index += 1;
  }
  return args;
}

function resolveNpmInvocation(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      commandArgs: ['/d', '/s', '/c', 'npm', ...args]
    };
  }
  return {
    command: 'npm',
    commandArgs: args
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runNpmScript(scriptName) {
  const invocation = resolveNpmInvocation(['run', scriptName]);
  return spawnSync(invocation.command, invocation.commandArgs, {
    cwd: rootDir,
    shell: false,
    env: process.env,
    stdio: 'inherit'
  });
}

function buildSteps(mode, autoResolve) {
  const steps = [];

  if (mode !== 'quick') {
    steps.push({
      phase: 'analyze',
      script: 'audit:worktree',
      blocking: mode === 'strict',
      description: 'Workspace hygiene risk audit'
    });
    steps.push({
      phase: 'analyze',
      script: 'doctor',
      blocking: mode === 'strict',
      description: 'Environment and runtime readiness doctor'
    });
  }

  steps.push({
    phase: 'identify',
    script: 'check:proactive-workflow-contract',
    blocking: true,
    description: 'Workflow contract gate'
  });

  steps.push({
    phase: 'identify',
    script: 'proactive:test',
    blocking: true,
    description: 'Full proactive quality matrix'
  });

  if (autoResolve) {
    if (mode === 'strict') {
      steps.push({
        phase: 'resolve',
        script: 'backup:evidence:refresh',
        blocking: true,
        description: 'Refresh backup drill evidence for strict operational gating'
      });
    }

    steps.push({
      phase: 'resolve',
      script: 'optimize:run',
      blocking: false,
      description: 'Automated optimization and cleanup pipeline'
    });
  }

  steps.push({
    phase: 'validate',
    script: mode === 'strict' ? 'ops:gate:strict:enforced' : 'ops:gate',
    blocking: mode === 'strict',
    description: 'Operational failover and backup evidence gate'
  });

  return steps;
}

function ensureReportDir(reportPath) {
  const parent = path.dirname(reportPath);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
}

function summarizeCycle(cycleResult) {
  const passed = cycleResult.steps.filter((step) => step.ok).length;
  const failed = cycleResult.steps.length - passed;
  const blockingFailures = cycleResult.steps.filter((step) => !step.ok && step.blocking).length;
  return { passed, failed, blockingFailures };
}

function runCycle(cycleNumber, options) {
  const startedAt = new Date().toISOString();
  const steps = buildSteps(options.mode, options.autoResolve);
  const results = [];

  for (const step of steps) {
    console.log(`\n[Loop][Cycle ${cycleNumber}][${step.phase}] ${step.description}`);
    console.log(`[Loop] command: npm run ${step.script}`);

    const stepStart = Date.now();
    const execution = runNpmScript(step.script);
    const durationMs = Date.now() - stepStart;
    const exitCode = execution.status === null || execution.status === undefined
      ? 1
      : execution.status;
    const ok = !execution.error && exitCode === 0;

    const result = {
      phase: step.phase,
      script: step.script,
      description: step.description,
      blocking: step.blocking,
      ok,
      exitCode,
      durationMs
    };
    results.push(result);

    if (!ok) {
      console.error(`[Loop] step failed (${step.script}) with exit code ${exitCode}`);
      if (step.blocking && options.failFast) {
        console.error('[Loop] fail-fast active; stopping current cycle.');
        break;
      }
    } else {
      console.log(`[Loop] step passed in ${durationMs}ms`);
    }
  }

  const summary = summarizeCycle({ steps: results });
  return {
    cycle: cycleNumber,
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: options.mode,
    steps: results,
    summary
  };
}

function computeGlobalSummary(cycles) {
  const allSteps = cycles.flatMap((cycle) => cycle.steps);
  const passed = allSteps.filter((step) => step.ok).length;
  const failed = allSteps.length - passed;
  const blockingFailures = allSteps.filter((step) => !step.ok && step.blocking).length;
  return {
    cycleCount: cycles.length,
    stepCount: allSteps.length,
    passed,
    failed,
    blockingFailures
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode || process.env.CONTINUOUS_IMPROVEMENT_MODE || 'standard')
    .trim()
    .toLowerCase();

  if (!allowedModes.has(mode)) {
    console.error(`Invalid mode "${mode}". Allowed modes: quick, standard, strict.`);
    process.exit(1);
  }

  const watch = parseBoolean(args.watch ?? process.env.CONTINUOUS_IMPROVEMENT_WATCH, false);
  const requestedCycles = parsePositiveInt(
    args.cycles ?? process.env.CONTINUOUS_IMPROVEMENT_CYCLES,
    watch ? 0 : 1,
    { allowZero: true }
  );
  const maxCycles = watch && requestedCycles === 0 ? Number.POSITIVE_INFINITY : requestedCycles || 1;
  const intervalSeconds = parsePositiveInt(
    args['interval-seconds'] ?? process.env.CONTINUOUS_IMPROVEMENT_INTERVAL_SECONDS,
    300
  );
  const intervalMs = intervalSeconds * 1000;
  const failFast = parseBoolean(
    args['fail-fast'] ?? process.env.CONTINUOUS_IMPROVEMENT_FAIL_FAST,
    mode === 'strict'
  );
  const autoResolve = parseBoolean(
    args['auto-resolve'] ?? process.env.CONTINUOUS_IMPROVEMENT_AUTO_RESOLVE,
    mode !== 'quick'
  );
  const reportPath = path.resolve(
    rootDir,
    args.report || process.env.CONTINUOUS_IMPROVEMENT_REPORT || path.join('docs', 'CONTINUOUS_IMPROVEMENT_REPORT.json')
  );

  console.log('[Loop] Continuous improvement runner started');
  console.log(`[Loop] mode=${mode}`);
  console.log(`[Loop] watch=${watch}`);
  console.log(`[Loop] cycles=${Number.isFinite(maxCycles) ? maxCycles : 'infinite'}`);
  console.log(`[Loop] interval_seconds=${intervalSeconds}`);
  console.log(`[Loop] auto_resolve=${autoResolve}`);
  console.log(`[Loop] fail_fast=${failFast}`);
  console.log(`[Loop] report=${path.relative(rootDir, reportPath)}`);

  const cycleResults = [];
  let encounteredBlockingFailure = false;
  let cycleNumber = 1;

  while (cycleNumber <= maxCycles) {
    const cycleResult = runCycle(cycleNumber, { mode, autoResolve, failFast });
    cycleResults.push(cycleResult);

    if (cycleResult.summary.blockingFailures > 0) {
      encounteredBlockingFailure = true;
    }

    if (cycleResult.summary.blockingFailures > 0 && failFast) {
      console.error('[Loop] stopping because blocking failures were found and fail-fast is enabled.');
      break;
    }

    if (cycleNumber >= maxCycles) break;

    console.log(`\n[Loop] waiting ${intervalSeconds}s before next cycle...`);
    await sleep(intervalMs);
    cycleNumber += 1;
  }

  const finalSummary = computeGlobalSummary(cycleResults);
  const report = {
    generatedAt: new Date().toISOString(),
    options: {
      mode,
      watch,
      maxCycles: Number.isFinite(maxCycles) ? maxCycles : 'infinite',
      intervalSeconds,
      autoResolve,
      failFast
    },
    summary: finalSummary,
    cycles: cycleResults
  };

  ensureReportDir(reportPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n[Loop] execution summary');
  console.log(`[Loop] cycles_run=${finalSummary.cycleCount}`);
  console.log(`[Loop] steps_total=${finalSummary.stepCount}`);
  console.log(`[Loop] steps_passed=${finalSummary.passed}`);
  console.log(`[Loop] steps_failed=${finalSummary.failed}`);
  console.log(`[Loop] blocking_failures=${finalSummary.blockingFailures}`);
  console.log(`[Loop] report_written=${path.relative(rootDir, reportPath)}`);

  if (encounteredBlockingFailure) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[Loop] runner crashed: ${error.message}`);
  process.exit(1);
});
