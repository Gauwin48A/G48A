#!/usr/bin/env node
/**
 * scripts/release-gate-run.mjs
 * ---------------------------------------------------------------------------
 * One-shot orchestrator: free stale Vite ports, mint a runId, run the
 * release-gate Playwright project at both 360x800 and 412x915, then emit the
 * consolidated summary.
 *
 * Usage:
 *   npm run test:release-gate            (single run)
 *   npm run test:release-gate -- --loop=3 (re-run N times until 3 clean)
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
let loops = 1;
let want = 1;
for (const a of args) {
  if (a.startsWith("--loop=")) loops = parseInt(a.split("=")[1], 10) || 1;
  if (a.startsWith("--clean=")) want = parseInt(a.split("=")[1], 10) || 1;
}

function freePorts() {
  if (process.platform !== "win32") return;
  const cmd = `Get-NetTCPConnection -State Listen -LocalPort 4173,5173 -EA SilentlyContinue | % { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }`;
  spawnSync("powershell", ["-NoProfile", "-Command", cmd], { stdio: "ignore" });
}

function runOnce(runId) {
  freePorts();
  const env = { ...process.env, RELEASE_GATE_RUN_ID: runId };
  const projects = ["release-gate", "release-gate-pixel7"];
  for (const p of projects) {
    console.log(`\n▶ release-gate iteration ${runId} :: project=${p}`);
    const r = spawnSync(
      `npx playwright test -c playwright.config.mjs --project=${p} --workers=4 --reporter=list`,
      { cwd: CLIENT_DIR, env, stdio: "inherit", shell: true }
    );
    if (r.status !== 0) console.log(`  (project ${p} exited ${r.status})`);
  }
  const s = spawnSync("node", ["scripts/release-gate-summary.mjs"], {
    cwd: CLIENT_DIR,
    env,
    stdio: "inherit"
  });
  return s.status === 0;
}

let cleanRuns = 0;
for (let i = 1; i <= loops; i++) {
  const runId =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "") + `_iter${i}`;
  const ok = runOnce(runId);
  if (ok) cleanRuns++;
  else cleanRuns = 0;
  console.log(`\n— iter ${i}/${loops} ${ok ? "✅" : "❌"}  cleanInARow=${cleanRuns}/${want}`);
  if (cleanRuns >= want) {
    console.log(`\n✅ release-gate achieved ${want} clean consecutive run(s).`);
    process.exit(0);
  }
}
console.log(`\n🟡 release-gate did not converge after ${loops} iteration(s).`);
process.exit(1);
