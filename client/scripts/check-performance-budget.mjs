import fs from "fs";
import path from "path";

const reportPath =
  process.env.PERF_BUDGET_REPORT_PATH ||
  process.env.PERF_BUDGET_REPORT ||
  path.resolve(process.cwd(), "lighthouse-report.json");

const allowMissing =
  String(process.env.PERF_BUDGET_ALLOW_MISSING || "false").toLowerCase() ===
  "true";

const thresholds = {
  performance: parseFloat(process.env.PERF_BUDGET_PERFORMANCE || "0.65"),
  accessibility: parseFloat(process.env.PERF_BUDGET_ACCESSIBILITY || "0.8"),
  bestPractices: parseFloat(
    process.env.PERF_BUDGET_BEST_PRACTICES || "0.8",
  ),
  seo: parseFloat(process.env.PERF_BUDGET_SEO || "0.8"),
};

const metricBudgets = {
  lcp: parseFloat(process.env.PERF_BUDGET_LCP_MS || "4000"),
  fcp: parseFloat(process.env.PERF_BUDGET_FCP_MS || "3000"),
  tbt: parseFloat(process.env.PERF_BUDGET_TBT_MS || "300"),
  cls: parseFloat(process.env.PERF_BUDGET_CLS || "0.15"),
};

function formatScore(score) {
  if (score === null || score === undefined) return "n/a";
  return Number(score).toFixed(2);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

if (!checkFileExists(reportPath)) {
  if (allowMissing) {
    console.warn(
      `[perf-budget] Report missing (${reportPath}); skipping budget checks.`,
    );
    process.exit(0);
  }
  console.error(`[perf-budget] Missing Lighthouse report at ${reportPath}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error(`[perf-budget] Failed to parse report: ${error.message}`);
  process.exit(1);
}

const categories = report?.categories || {};
const audits = report?.audits || {};

const failures = [];

const categoryScores = {
  performance: categories?.performance?.score,
  accessibility: categories?.accessibility?.score,
  bestPractices: categories?.["best-practices"]?.score,
  seo: categories?.seo?.score,
};

for (const [key, threshold] of Object.entries(thresholds)) {
  if (!Number.isFinite(threshold) || threshold <= 0) continue;
  const score = categoryScores[key];
  if (typeof score !== "number") {
    failures.push(
      `[perf-budget] Missing ${key} score in report (expected >= ${threshold}).`,
    );
    continue;
  }
  if (score < threshold) {
    failures.push(
      `[perf-budget] ${key} score ${formatScore(score)} below ${threshold}.`,
    );
  }
}

const metricValues = {
  lcp: audits?.["largest-contentful-paint"]?.numericValue,
  fcp: audits?.["first-contentful-paint"]?.numericValue,
  tbt: audits?.["total-blocking-time"]?.numericValue,
  cls: audits?.["cumulative-layout-shift"]?.numericValue,
};

for (const [metric, budget] of Object.entries(metricBudgets)) {
  if (!Number.isFinite(budget) || budget <= 0) continue;
  const value = metricValues[metric];
  if (typeof value !== "number") {
    failures.push(
      `[perf-budget] Missing ${metric.toUpperCase()} metric in report (expected <= ${budget}).`,
    );
    continue;
  }
  if (value > budget) {
    failures.push(
      `[perf-budget] ${metric.toUpperCase()} ${value} exceeds budget ${budget}.`,
    );
  }
}

console.log("[perf-budget] Lighthouse scores:");
for (const [key, score] of Object.entries(categoryScores)) {
  console.log(`- ${key}: ${formatScore(score)}`);
}

console.log("[perf-budget] Core metrics:");
for (const [metric, value] of Object.entries(metricValues)) {
  const display = typeof value === "number" ? value : "n/a";
  console.log(`- ${metric.toUpperCase()}: ${display}`);
}

if (failures.length) {
  failures.forEach((line) => console.error(line));
  console.error("[perf-budget] Performance budget checks failed.");
  process.exit(1);
}

console.log("[perf-budget] Performance budget checks passed.");
