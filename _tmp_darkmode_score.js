const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(process.cwd(), 'client', 'src', 'pages');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.jsx')) out.push(full);
  }
  return out;
}

const CLASSNAME_REGEX = /className\s*[:=]\s*(?:\{\s*)?(?:\"([^\"]*)\"|'([^']*)'|`([\s\S]*?)`)\s*\}?/g;

function stripTemplateExpr(str) {
  return str.replace(/\$\{[\s\S]*?\}/g, ' ');
}

function countTokens(str) {
  const tokens = String(str).split(/\s+/).filter(Boolean);
  let total = 0;
  let dark = 0;
  for (const raw of tokens) {
    const parts = raw.split(':');
    const baseRaw = parts[parts.length - 1] || '';
    const base = baseRaw.replace(/^!/, '');
    const isDark = parts.includes('dark');
    if (base.startsWith('bg-') || base.startsWith('text-') || base.startsWith('border-')) {
      total += 1;
      if (isDark) dark += 1;
    }
  }
  return { total, dark };
}

function scoreFromCoverage(coverage, hasTokens) {
  if (!hasTokens) return 1;
  if (coverage >= 0.5) return 5;
  if (coverage >= 0.4) return 4;
  if (coverage >= 0.3) return 3;
  if (coverage >= 0.2) return 2;
  return 1;
}

const files = walk(PAGES_DIR).sort((a, b) => a.localeCompare(b));
const rows = [];
const scoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let total = 0;
  let dark = 0;
  let m;
  while ((m = CLASSNAME_REGEX.exec(text)) !== null) {
    const raw = m[1] || m[2] || m[3] || '';
    const chunk = m[3] ? stripTemplateExpr(raw) : raw;
    const counts = countTokens(chunk);
    total += counts.total;
    dark += counts.dark;
  }
  const hasTokens = total > 0;
  const coverage = hasTokens ? dark / total : null;
  const score = scoreFromCoverage(coverage ?? 0, hasTokens);
  scoreCounts[score] += 1;
  rows.push({
    page: path.relative(PAGES_DIR, file).replace(/\\/g, '/'),
    score,
    coverage,
  });
}

const totalPages = rows.length;
const summaryParts = [5, 4, 3, 2, 1]
  .filter((s) => scoreCounts[s] > 0)
  .map((s) => `${scoreCounts[s]} pages at ${s}`);
let summary = `Summary: ${totalPages} pages total. Scores: ${summaryParts.join(', ')}.`;
if (scoreCounts[4] === 0 && scoreCounts[5] === 0) {
  summary += ' None reached 4–5 with this heuristic.';
}
console.log(summary);
console.log('');
console.log('Page\tScore (1-5)\tCoverage');
for (const row of rows) {
  const coverageStr = row.coverage === null ? 'n/a' : row.coverage.toFixed(2);
  console.log(`${row.page}\t${row.score}\t${coverageStr}`);
}
