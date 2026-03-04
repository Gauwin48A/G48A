#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const allowedModes = new Set(['quick', 'standard', 'strict']);
const allowedOptimizeProfiles = new Set(['standard', 'aggressive', 'aggressive-with-install']);
const allowedDeployStrategies = new Set(['none', 'canary', 'blue-green']);

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

function runNpmScript(scriptName) {
  const invocation = resolveNpmInvocation(['run', scriptName]);
  return spawnSync(invocation.command, invocation.commandArgs, {
    cwd: rootDir,
    shell: false,
    env: process.env,
    stdio: 'inherit'
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ensureReportDir(reportPath) {
  const parent = path.dirname(reportPath);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
}

function resolveOptimizeScript(optimizeProfile) {
  if (optimizeProfile === 'aggressive') return 'optimize:run:aggressive';
  if (optimizeProfile === 'aggressive-with-install') return 'optimize:run:aggressive:with-install';
  return 'optimize:run';
}

function deploymentStrategyGuidance(strategy) {
  if (strategy === 'blue-green') {
    return 'Use blue-green deployment for fast rollback at infrastructure cost.';
  }
  if (strategy === 'canary') {
    return 'Use canary deployment for progressive exposure and smaller blast radius.';
  }
  return 'Deployment strategy not selected; run validation artifacts before production rollout.';
}

function buildSteps(options) {
  const steps = [];
  const optimizeScript = resolveOptimizeScript(options.optimizeProfile);
  const isStrictMode = options.mode === 'strict';
  const useEnforcedGate = isStrictMode && options.enforceOpsGate;

  if (options.mode !== 'quick') {
    steps.push({
      phase: 'initiation',
      script: 'audit:worktree',
      blocking: options.mode === 'strict',
      description: 'Workspace risk triage before optimization'
    });
    steps.push({
      phase: 'initiation',
      script: 'doctor',
      blocking: options.mode === 'strict',
      description: 'Environment readiness and runtime diagnostics'
    });
  }

  steps.push({
    phase: 'planning',
    script: 'check:proactive-workflow-contract',
    blocking: true,
    description: 'Workflow contract gate'
  });
  steps.push({
    phase: 'planning',
    script: 'check:testcase-catalog',
    blocking: true,
    description: 'Testcase catalog coverage gate'
  });

  steps.push({
    phase: 'baseline',
    script: 'footprint:report',
    blocking: true,
    description: 'Baseline footprint snapshot'
  });
  steps.push({
    phase: 'baseline',
    script: 'proactive:test',
    blocking: true,
    description: 'Baseline full-stack quality matrix'
  });

  if (options.autoOptimize) {
    if (isStrictMode && options.refreshBackupEvidence) {
      steps.push({
        phase: 'execution',
        script: 'backup:evidence:refresh',
        blocking: true,
        description: 'Refresh backup evidence before strict operational gate'
      });
    }

    steps.push({
      phase: 'execution',
      script: optimizeScript,
      blocking: options.mode === 'strict',
      description: `Automated optimization pipeline (${options.optimizeProfile})`
    });
  }

  steps.push({
    phase: 'validation',
    script: 'proactive:test',
    blocking: true,
    description: 'Post-change full-stack quality matrix'
  });
  steps.push({
    phase: 'validation',
    script: isStrictMode
      ? (useEnforcedGate ? 'ops:gate:strict:enforced' : 'ops:gate:strict')
      : 'ops:gate',
    blocking: isStrictMode,
    description: 'Operational failover and backup evidence gate'
  });
  steps.push({
    phase: 'closure',
    script: 'cleanup:checklist',
    blocking: false,
    description: 'Release cleanup checklist generation'
  });
  steps.push({
    phase: 'closure',
    script: 'footprint:report',
    blocking: false,
    description: 'Final footprint snapshot'
  });

  return steps;
}

function summarizeCycle(cycleResult) {
  const passed = cycleResult.steps.filter((step) => step.ok).length;
  const failed = cycleResult.steps.length - passed;
  const blockingFailures = cycleResult.steps.filter((step) => !step.ok && step.blocking).length;
  return {
    passed,
    failed,
    blockingFailures
  };
}

function runCycle(cycleNumber, options) {
  const startedAt = new Date().toISOString();
  const steps = buildSteps(options);
  const results = [];

  for (const step of steps) {
    console.log(`\n[Safe-Impl][Cycle ${cycleNumber}][${step.phase}] ${step.description}`);
    console.log(`[Safe-Impl] command: npm run ${step.script}`);

    let durationMs = 0;
    let exitCode = 0;
    let ok = true;

    if (options.dryRun) {
      console.log('[Safe-Impl] dry-run enabled; command not executed.');
    } else {
      const stepStart = Date.now();
      const execution = runNpmScript(step.script);
      durationMs = Date.now() - stepStart;
      exitCode = execution.status === null || execution.status === undefined
        ? 1
        : execution.status;
      ok = !execution.error && exitCode === 0;
    }

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
      console.error(`[Safe-Impl] step failed (${step.script}) with exit code ${exitCode}`);
      if (step.blocking && options.failFast) {
        console.error('[Safe-Impl] fail-fast active; stopping current cycle.');
        break;
      }
    } else {
      console.log(`[Safe-Impl] step passed in ${durationMs}ms`);
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

function formatStepStatus(step) {
  const statusLabel = step.ok ? 'PASS' : 'FAIL';
  return `- [${statusLabel}] ${step.phase} :: ${step.script} (${step.durationMs}ms, blocking=${step.blocking}, exit=${step.exitCode})`;
}

function toMarkdown(report) {
  const lines = [
    '# Safe End-to-End Implementation Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Configuration',
    `- mode: ${report.options.mode}`,
    `- watch: ${report.options.watch}`,
    `- max_cycles: ${report.options.maxCycles}`,
    `- interval_seconds: ${report.options.intervalSeconds}`,
    `- fail_fast: ${report.options.failFast}`,
    `- auto_optimize: ${report.options.autoOptimize}`,
    `- refresh_backup_evidence: ${report.options.refreshBackupEvidence}`,
    `- enforce_ops_gate: ${report.options.enforceOpsGate}`,
    `- optimize_profile: ${report.options.optimizeProfile}`,
    `- deployment_strategy: ${report.options.deploymentStrategy}`,
    '',
    '## Summary',
    `- cycles_run: ${report.summary.cycleCount}`,
    `- steps_total: ${report.summary.stepCount}`,
    `- steps_passed: ${report.summary.passed}`,
    `- steps_failed: ${report.summary.failed}`,
    `- blocking_failures: ${report.summary.blockingFailures}`,
    '',
    '## Deployment Guidance',
    `- ${report.deploymentGuidance}`,
    ''
  ];

  for (const cycle of report.cycles) {
    lines.push(`## Cycle ${cycle.cycle}`);
    lines.push(`- started_at: ${cycle.startedAt}`);
    lines.push(`- finished_at: ${cycle.finishedAt}`);
    lines.push(`- passed: ${cycle.summary.passed}`);
    lines.push(`- failed: ${cycle.summary.failed}`);
    lines.push(`- blocking_failures: ${cycle.summary.blockingFailures}`);
    lines.push('');
    for (const step of cycle.steps) {
      lines.push(formatStepStatus(step));
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode || process.env.SAFE_IMPL_MODE || 'standard').trim().toLowerCase();
  const optimizeProfile = String(
    args['optimize-profile'] ||
    process.env.SAFE_IMPL_OPTIMIZE_PROFILE ||
    'standard'
  ).trim().toLowerCase();
  const deploymentStrategy = String(
    args['deployment-strategy'] ||
    process.env.SAFE_IMPL_DEPLOYMENT_STRATEGY ||
    'none'
  ).trim().toLowerCase();

  if (!allowedModes.has(mode)) {
    console.error(`Invalid mode "${mode}". Allowed modes: quick, standard, strict.`);
    process.exit(1);
  }
  if (!allowedOptimizeProfiles.has(optimizeProfile)) {
    console.error(
      `Invalid optimize profile "${optimizeProfile}". Allowed: standard, aggressive, aggressive-with-install.`
    );
    process.exit(1);
  }
  if (!allowedDeployStrategies.has(deploymentStrategy)) {
    console.error(`Invalid deployment strategy "${deploymentStrategy}". Allowed: none, canary, blue-green.`);
    process.exit(1);
  }

  const watch = parseBoolean(args.watch ?? process.env.SAFE_IMPL_WATCH, false);
  const requestedCycles = parsePositiveInt(
    args.cycles ?? process.env.SAFE_IMPL_CYCLES,
    watch ? 0 : 1,
    { allowZero: true }
  );
  const maxCycles = watch && requestedCycles === 0 ? Number.POSITIVE_INFINITY : requestedCycles || 1;
  const intervalSeconds = parsePositiveInt(
    args['interval-seconds'] ?? process.env.SAFE_IMPL_INTERVAL_SECONDS,
    300
  );
  const failFast = parseBoolean(
    args['fail-fast'] ?? process.env.SAFE_IMPL_FAIL_FAST,
    mode === 'strict'
  );
  const autoOptimize = parseBoolean(
    args['auto-optimize'] ?? process.env.SAFE_IMPL_AUTO_OPTIMIZE,
    mode !== 'quick'
  );
  const refreshBackupEvidence = parseBoolean(
    args['refresh-backup-evidence'] ?? process.env.SAFE_IMPL_REFRESH_BACKUP_EVIDENCE,
    mode === 'strict'
  );
  const enforceOpsGate = parseBoolean(
    args['enforce-ops-gate'] ?? process.env.SAFE_IMPL_ENFORCE_OPS_GATE,
    mode === 'strict'
  );
  const dryRun = parseBoolean(
    args['dry-run'] ?? process.env.SAFE_IMPL_DRY_RUN,
    false
  );
  const reportBasePath = path.resolve(
    rootDir,
    args.report || process.env.SAFE_IMPL_REPORT || path.join('docs', 'SAFE_E2E_IMPLEMENTATION_REPORT')
  );
  const reportJsonPath = reportBasePath.endsWith('.json')
    ? reportBasePath
    : `${reportBasePath}.json`;
  const reportMarkdownPath = reportBasePath.endsWith('.md')
    ? reportBasePath
    : `${reportBasePath}.md`;

  console.log('[Safe-Impl] runner started');
  console.log(`[Safe-Impl] mode=${mode}`);
  console.log(`[Safe-Impl] watch=${watch}`);
  console.log(`[Safe-Impl] cycles=${Number.isFinite(maxCycles) ? maxCycles : 'infinite'}`);
  console.log(`[Safe-Impl] interval_seconds=${intervalSeconds}`);
  console.log(`[Safe-Impl] fail_fast=${failFast}`);
  console.log(`[Safe-Impl] auto_optimize=${autoOptimize}`);
  console.log(`[Safe-Impl] refresh_backup_evidence=${refreshBackupEvidence}`);
  console.log(`[Safe-Impl] enforce_ops_gate=${enforceOpsGate}`);
  console.log(`[Safe-Impl] dry_run=${dryRun}`);
  console.log(`[Safe-Impl] optimize_profile=${optimizeProfile}`);
  console.log(`[Safe-Impl] deployment_strategy=${deploymentStrategy}`);
  console.log(`[Safe-Impl] report_json=${path.relative(rootDir, reportJsonPath)}`);
  console.log(`[Safe-Impl] report_markdown=${path.relative(rootDir, reportMarkdownPath)}`);

  if (mode === 'strict' && !refreshBackupEvidence) {
    console.warn('[Safe-Impl] strict mode is running without automatic backup evidence refresh.');
  }
  if (mode === 'strict' && !enforceOpsGate) {
    console.warn('[Safe-Impl] strict mode is running without enforced operational gate.');
  }

  const cycleResults = [];
  let encounteredBlockingFailure = false;
  let cycleNumber = 1;

  while (cycleNumber <= maxCycles) {
    const cycleResult = runCycle(cycleNumber, {
      mode,
      failFast,
      autoOptimize,
      refreshBackupEvidence,
      enforceOpsGate,
      optimizeProfile,
      dryRun
    });
    cycleResults.push(cycleResult);

    if (cycleResult.summary.blockingFailures > 0) {
      encounteredBlockingFailure = true;
    }

    if (cycleResult.summary.blockingFailures > 0 && failFast) {
      console.error('[Safe-Impl] stopping because blocking failures were found and fail-fast is enabled.');
      break;
    }

    if (cycleNumber >= maxCycles) break;

    console.log(`\n[Safe-Impl] waiting ${intervalSeconds}s before next cycle...`);
    await sleep(intervalSeconds * 1000);
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
      failFast,
      autoOptimize,
      refreshBackupEvidence,
      enforceOpsGate,
      dryRun,
      optimizeProfile,
      deploymentStrategy
    },
    deploymentGuidance: deploymentStrategyGuidance(deploymentStrategy),
    summary: finalSummary,
    cycles: cycleResults
  };

  ensureReportDir(reportJsonPath);
  ensureReportDir(reportMarkdownPath);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMarkdownPath, `${toMarkdown(report)}\n`, 'utf8');

  console.log('\n[Safe-Impl] execution summary');
  console.log(`[Safe-Impl] cycles_run=${finalSummary.cycleCount}`);
  console.log(`[Safe-Impl] steps_total=${finalSummary.stepCount}`);
  console.log(`[Safe-Impl] steps_passed=${finalSummary.passed}`);
  console.log(`[Safe-Impl] steps_failed=${finalSummary.failed}`);
  console.log(`[Safe-Impl] blocking_failures=${finalSummary.blockingFailures}`);
  console.log(`[Safe-Impl] report_json_written=${path.relative(rootDir, reportJsonPath)}`);
  console.log(`[Safe-Impl] report_markdown_written=${path.relative(rootDir, reportMarkdownPath)}`);

  if (encounteredBlockingFailure) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[Safe-Impl] runner crashed: ${error.message}`);
  process.exit(1);
});
