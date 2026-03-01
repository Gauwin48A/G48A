import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const cacheDir = resolve(process.cwd(), 'node_modules', '.vite');
const viteBin = process.platform === 'win32'
  ? resolve(process.cwd(), 'node_modules', '.bin', 'vite.cmd')
  : resolve(process.cwd(), 'node_modules', '.bin', 'vite');

try {
  rmSync(cacheDir, { recursive: true, force: true });
  console.log('[dev-safe] Cleared Vite cache at node_modules/.vite');
} catch (error) {
  console.warn('[dev-safe] Unable to clear Vite cache:', error.message);
}

const child = spawn(viteBin, ['--force', '--strictPort'], {
  stdio: 'inherit',
  shell: false,
  env: process.env
});

child.on('exit', (code) => {
  process.exit(typeof code === 'number' ? code : 1);
});

child.on('error', (error) => {
  console.error('[dev-safe] Failed to start Vite:', error.message);
  process.exit(1);
});
