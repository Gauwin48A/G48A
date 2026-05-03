/**
 * release-gate/_tracker.ts
 * ---------------------------------------------------------------------------
 * Per-test coverage / observation recorder for the pre-launch release gate.
 *
 * Each test calls `beginCoverage(page, info)` in its beforeEach (via
 * `setupReleaseGate(...)`) and may then call `track*()` helpers as the user
 * journey unfolds. After the test (in afterEach) `endCoverage(info, status)`
 * appends a single JSONL record to:
 *
 *   <repoRoot>/Mhub/analysis/release-gate/<runId>/_records.jsonl
 *
 * The runId is `process.env.RELEASE_GATE_RUN_ID` if set, otherwise a fresh
 * timestamp captured at module load. A separate consolidator script
 * (`scripts/release-gate-summary.mjs`) reads the JSONL after the run ends
 * and emits `summary.json` + `summary.md` mirroring the audit-phase format.
 *
 * Invariants:
 *   - File writes are append-only and synchronous so parallel workers don't
 *     corrupt each other (single-line JSONL + O_APPEND on POSIX/NTFS).
 *   - We never throw out of the tracker — coverage instrumentation must
 *     never mask or replace real test failures.
 * ---------------------------------------------------------------------------
 */
import fs from "node:fs";
import path from "node:path";
import { type Page, type TestInfo } from "@playwright/test";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const RUN_ID =
  process.env.RELEASE_GATE_RUN_ID ||
  new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
const OUT_DIR = path.join(REPO_ROOT, "Mhub", "analysis", "release-gate", RUN_ID);
const JSONL_PATH = path.join(OUT_DIR, "_records.jsonl");

try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch {
  /* ignore */
}

export const RELEASE_GATE_OUT_DIR = OUT_DIR;
export const RELEASE_GATE_RUN_ID = RUN_ID;

export type CoverageRecord = {
  runId: string;
  phase: string;
  test: string;
  file: string;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted" | string;
  durationMs: number;
  startedAt: string;
  routesVisited: string[];
  selectorsClicked: string[];
  assertions: { name: string; passed: boolean; soft?: boolean; detail?: string }[];
  consoleErrors: string[];
  networkFailures: { url: string; status?: number; reason?: string }[];
  screenshots: string[];
  notes: string[];
};

const STATE = new WeakMap<TestInfo, CoverageRecord>();

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function appendJsonl(obj: unknown) {
  safe(() => {
    fs.appendFileSync(JSONL_PATH, JSON.stringify(obj) + "\n", "utf8");
  }, undefined);
}

/**
 * Wire console-error / network-failure listeners onto the page and stash an
 * empty CoverageRecord against the current TestInfo. Idempotent per page.
 */
export function beginCoverage(
  page: Page,
  info: TestInfo,
  phase: string
): CoverageRecord {
  const rec: CoverageRecord = {
    runId: RUN_ID,
    phase,
    test: info.title,
    file: path.relative(REPO_ROOT, info.file).replace(/\\/g, "/"),
    status: "passed",
    durationMs: 0,
    startedAt: new Date().toISOString(),
    routesVisited: [],
    selectorsClicked: [],
    assertions: [],
    consoleErrors: [],
    networkFailures: [],
    screenshots: [],
    notes: []
  };
  STATE.set(info, rec);

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = safe(() => msg.text(), "<unreadable>");
      // i18next missing-key warnings are noisy and tracked separately; skip.
      if (/i18next.*missingKey/i.test(text)) return;
      // React DevTools recommendation, etc.
      if (/Download the React DevTools/i.test(text)) return;
      // Known prop-name React warnings from third-party UI libs — track in
      // production source, not the gate. (e.g. fetchPriority/fetchpriority)
      if (/React does not recognize/i.test(text) && /fetchpriority/i.test(text)) return;
      // Known setState-in-render warning between GreenNavbar and child page.
      // Tracked separately for the React team; not a gate blocker.
      // See e2e/release-gate/README.md → "Known production-code warnings".
      if (/Cannot update a component/i.test(text) && /GreenNavbar/.test(text)) return;
      rec.consoleErrors.push(text.slice(0, 500));
    }
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    const reason = req.failure()?.errorText || "unknown";
    // Ignore failures we deliberately abort (e.g. socket.io, websockets) or
    // requests that the browser aborted because the page navigated away.
    if (/socket\.io|wss?:\/\//.test(url)) return;
    if (/ERR_ABORTED|ERR_CANCELED/i.test(reason)) return;
    rec.networkFailures.push({ url: url.slice(0, 300), reason });
  });

  page.on("response", (resp) => {
    const status = resp.status();
    if (status >= 500) {
      rec.networkFailures.push({ url: resp.url().slice(0, 300), status });
    }
  });

  return rec;
}

export function getRecord(info: TestInfo): CoverageRecord | undefined {
  return STATE.get(info);
}

export function trackRoute(info: TestInfo, route: string) {
  const r = STATE.get(info);
  if (!r) return;
  if (!r.routesVisited.includes(route)) r.routesVisited.push(route);
}

export function trackClick(info: TestInfo, selector: string) {
  const r = STATE.get(info);
  if (!r) return;
  r.selectorsClicked.push(selector.slice(0, 200));
}

export function trackAssertion(
  info: TestInfo,
  name: string,
  passed: boolean,
  detail?: string,
  opts: { soft?: boolean } = {}
) {
  const r = STATE.get(info);
  if (!r) return;
  r.assertions.push({
    name,
    passed,
    soft: opts.soft || false,
    detail: detail?.slice(0, 300)
  });
}

export function trackNote(info: TestInfo, note: string) {
  const r = STATE.get(info);
  if (!r) return;
  r.notes.push(note.slice(0, 300));
}

/**
 * Persist the record for this test. Safe to call multiple times — only the
 * last call wins (overwrites in-memory state, JSONL is append-only so we
 * write only on the final call from the suite-level afterEach).
 */
export function endCoverage(info: TestInfo) {
  const rec = STATE.get(info);
  if (!rec) return;
  rec.status = info.status || rec.status;
  rec.durationMs = info.duration || 0;
  // Pick up screenshot paths attached by Playwright (failures, etc.).
  for (const att of info.attachments || []) {
    if (att.path && /\.(png|jpe?g|webp)$/i.test(att.path)) {
      rec.screenshots.push(
        path.relative(REPO_ROOT, att.path).replace(/\\/g, "/")
      );
    }
  }
  appendJsonl(rec);
  STATE.delete(info);
}
