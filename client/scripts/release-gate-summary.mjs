#!/usr/bin/env node
/**
 * scripts/release-gate-summary.mjs
 * ---------------------------------------------------------------------------
 * Consolidate release-gate JSONL records into:
 *   Mhub/analysis/release-gate/<runId>/summary.json
 *   Mhub/analysis/release-gate/<runId>/summary.md
 *
 * Run after `playwright test --project=release-gate`.
 * Reads <runId> from RELEASE_GATE_RUN_ID env if set, else uses the most
 * recently modified subdirectory of Mhub/analysis/release-gate.
 * ---------------------------------------------------------------------------
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const ROOT = path.join(REPO_ROOT, "Mhub", "analysis", "release-gate");

function pickRunDir() {
  if (process.env.RELEASE_GATE_RUN_ID) {
    const p = path.join(ROOT, process.env.RELEASE_GATE_RUN_ID);
    if (fs.existsSync(p)) return p;
  }
  if (!fs.existsSync(ROOT)) return null;
  const entries = fs
    .readdirSync(ROOT)
    .map((n) => ({ n, full: path.join(ROOT, n) }))
    .filter((e) => fs.statSync(e.full).isDirectory())
    .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
  return entries.length ? entries[0].full : null;
}

const runDir = pickRunDir();
if (!runDir) {
  console.error("✖ No release-gate run directory found.");
  process.exit(1);
}

const jsonl = path.join(runDir, "_records.jsonl");
if (!fs.existsSync(jsonl)) {
  console.error(`✖ No _records.jsonl in ${runDir}`);
  process.exit(1);
}

const records = fs
  .readFileSync(jsonl, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// Dedupe: same (file, test) may appear multiple times due to Playwright
// retries. Keep the BEST attempt (passed > anything else); for ties, keep
// the latest. This matches Playwright's own "flaky" semantic — a test that
// eventually passed on retry is reported as a pass.
const STATUS_RANK = { passed: 3, skipped: 2, failed: 1, timedOut: 1, interrupted: 1 };
const dedupedMap = new Map();
for (const r of records) {
  const key = `${r.file}::${r.test}`;
  const prev = dedupedMap.get(key);
  if (
    !prev ||
    (STATUS_RANK[r.status] || 0) > (STATUS_RANK[prev.status] || 0)
  ) {
    dedupedMap.set(key, r);
  }
}
const dedupedRecords = [...dedupedMap.values()];

const byPhase = new Map();
for (const r of dedupedRecords) {
  if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
  byPhase.get(r.phase).push(r);
}

const phaseRows = [];
let totalTests = 0;
let passed = 0;
let failed = 0;
let totalRoutes = new Set();
let totalAssertions = 0;
let assertFailures = 0;
let consoleErrs = 0;
let netFailures = 0;

for (const [phase, recs] of [...byPhase.entries()].sort()) {
  const p = recs.filter((r) => r.status === "passed").length;
  const f = recs.filter((r) => r.status === "failed" || r.status === "timedOut").length;
  const routes = new Set();
  let aTotal = 0;
  let aFail = 0;
  let aSoftFail = 0;
  let consoles = 0;
  let nets = 0;
  for (const r of recs) {
    r.routesVisited.forEach((rt) => {
      routes.add(rt);
      totalRoutes.add(rt);
    });
    aTotal += r.assertions.length;
    aFail += r.assertions.filter((a) => !a.passed && !a.soft).length;
    aSoftFail += r.assertions.filter((a) => !a.passed && a.soft).length;
    consoles += r.consoleErrors.length;
    nets += r.networkFailures.length;
  }
  totalTests += recs.length;
  passed += p;
  failed += f;
  totalAssertions += aTotal;
  assertFailures += aFail;
  consoleErrs += consoles;
  netFailures += nets;
  phaseRows.push({
    phase,
    tests: recs.length,
    passed: p,
    failed: f,
    routes: [...routes].sort(),
    assertions: aTotal,
    assertionFailures: aFail,
    softAssertionFailures: aSoftFail,
    consoleErrors: consoles,
    networkFailures: nets
  });
}

const summary = {
  runId: path.basename(runDir),
  generatedAt: new Date().toISOString(),
  totals: {
    tests: totalTests,
    passed,
    failed,
    routes: totalRoutes.size,
    assertions: totalAssertions,
    assertionFailures: assertFailures,
    consoleErrors: consoleErrs,
    networkFailures: netFailures,
    rawAttempts: records.length,
    flakyRecovered: records.length - dedupedRecords.length
  },
  phases: phaseRows,
  records: dedupedRecords
};

fs.writeFileSync(
  path.join(runDir, "summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8"
);

const md = [];
md.push(`# Release-gate run \`${summary.runId}\``);
md.push("");
md.push(`Generated: ${summary.generatedAt}`);
md.push("");
md.push(`## Totals`);
md.push("");
md.push(`| metric | value |`);
md.push(`| --- | --- |`);
for (const [k, v] of Object.entries(summary.totals)) md.push(`| ${k} | ${v} |`);
md.push("");
md.push(`## Per-phase`);
md.push("");
md.push(
  `| phase | tests | passed | failed | routes | assertions | hard-fails | soft-fails | console-errs | net-fails |`
);
md.push(`| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |`);
for (const p of phaseRows) {
  md.push(
    `| ${p.phase} | ${p.tests} | ${p.passed} | ${p.failed} | ${p.routes.length} | ${p.assertions} | ${p.assertionFailures} | ${p.softAssertionFailures} | ${p.consoleErrors} | ${p.networkFailures} |`
  );
}
md.push("");
md.push(`## Routes covered (${totalRoutes.size})`);
md.push("");
for (const r of [...totalRoutes].sort()) md.push(`- \`${r}\``);
md.push("");
const fails = dedupedRecords.filter(
  (r) => r.status === "failed" || r.status === "timedOut" || r.assertions.some((a) => !a.passed && !a.soft)
);
if (fails.length) {
  md.push(`## Failures (${fails.length})`);
  md.push("");
  for (const r of fails) {
    md.push(`### ${r.phase} — ${r.test}`);
    md.push(`- file: \`${r.file}\``);
    md.push(`- status: \`${r.status}\` (${r.durationMs}ms)`);
    const failedAssertions = r.assertions.filter((a) => !a.passed && !a.soft);
    if (failedAssertions.length) {
      md.push(`- failed assertions:`);
      for (const a of failedAssertions)
        md.push(`  - **${a.name}** — ${a.detail || ""}`);
    }
    if (r.consoleErrors.length) {
      md.push(`- console errors:`);
      for (const e of r.consoleErrors.slice(0, 5)) md.push(`  - \`${e}\``);
    }
    if (r.networkFailures.length) {
      md.push(`- network failures:`);
      for (const e of r.networkFailures.slice(0, 5))
        md.push(`  - \`${e.url}\` (${e.status || e.reason || ""})`);
    }
    md.push("");
  }
}

fs.writeFileSync(path.join(runDir, "summary.md"), md.join("\n"), "utf8");

const okMark = failed === 0 && assertFailures === 0 ? "✅" : "❌";
console.log(
  `${okMark} release-gate ${summary.runId}: ${passed}/${totalTests} tests, ${assertFailures} assertion failures, ${consoleErrs} console errors, ${netFailures} net failures`
);
console.log(`   summary: ${path.join(runDir, "summary.md")}`);

process.exit(failed === 0 && assertFailures === 0 ? 0 : 1);
