import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const cacheDir = resolve(process.cwd(), 'node_modules', '.vite');
const viteCli = resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const STALE_DEP_PATTERNS = [
  /Outdated Optimize Dep/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /ERR_ABORTED 504/i
];

const userArgs = process.argv.slice(2);
const forceFresh = userArgs.includes('--fresh') || String(process.env.MHUB_DEV_FRESH || '').toLowerCase() === 'true';
const strictPort = '--strictPort';

function clearViteCache() {
  try {
    rmSync(cacheDir, { recursive: true, force: true });
    console.log('[dev-safe] Cleared Vite cache at node_modules/.vite');
  } catch (error) {
    console.warn('[dev-safe] Unable to clear Vite cache:', error.message);
  }
}

function runVite(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [viteCli, ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      env: process.env
    });

    let outputBuffer = '';
    const handleChunk = (chunk, writer) => {
      const text = chunk.toString();
      outputBuffer += text;
      writer.write(text);
    };

    child.stdout.on('data', (chunk) => handleChunk(chunk, process.stdout));
    child.stderr.on('data', (chunk) => handleChunk(chunk, process.stderr));

    const forwardSignal = (signal) => {
      try {
        child.kill(signal);
      } catch {
        // no-op
      }
    };

    const sigintHandler = () => forwardSignal('SIGINT');
    const sigtermHandler = () => forwardSignal('SIGTERM');
    process.once('SIGINT', sigintHandler);
    process.once('SIGTERM', sigtermHandler);

    child.on('error', (error) => {
      process.removeListener('SIGINT', sigintHandler);
      process.removeListener('SIGTERM', sigtermHandler);
      rejectRun(error);
    });

    child.on('exit', (code, signal) => {
      process.removeListener('SIGINT', sigintHandler);
      process.removeListener('SIGTERM', sigtermHandler);
      resolveRun({
        code: typeof code === 'number' ? code : 1,
        signal,
        output: outputBuffer
      });
    });
  });
}

function looksLikeStaleDepFailure(output) {
  return STALE_DEP_PATTERNS.some((pattern) => pattern.test(output));
}

async function main() {
  const baseArgs = [strictPort, ...userArgs.filter((arg) => arg !== '--fresh')];

  if (forceFresh) {
    clearViteCache();
    const freshRun = await runVite(['--force', ...baseArgs]);
    process.exit(freshRun.code);
    return;
  }

  const firstRun = await runVite(baseArgs);
  if (firstRun.code === 0) {
    process.exit(0);
    return;
  }

  if (!looksLikeStaleDepFailure(firstRun.output)) {
    process.exit(firstRun.code);
    return;
  }

  console.log('[dev-safe] Detected stale optimize-deps issue. Retrying with clean cache and --force...');
  clearViteCache();
  const retryRun = await runVite(['--force', ...baseArgs]);
  process.exit(retryRun.code);
}

main().catch((error) => {
  console.error('[dev-safe] Failed to start Vite:', error.message);
  process.exit(1);
});
