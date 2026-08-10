#!/usr/bin/env node
/**
 * Repair JOIN clauses that a previous bulk-edit script corrupted.
 *
 * The previous script applied regex replacements of the form
 *   /(JOIN categories c ON )(p\.category_id)( = )(c\.category_id)/g
 *   -> '$1$2::text$3$4::text'
 * but it was invoked through bash, so `$1`..`$4` were expanded to empty
 * strings BEFORE node saw them. The entire match therefore collapsed to
 * `::text::text`, turning e.g.
 *   LEFT JOIN categories c ON p.category_id = c.category_id
 * into
 *   LEFT ::text::text
 *
 * This script restores each corrupted line from the git diff of the same
 * file (the `-`/original side of each replacement hunk), then applies the
 * intended `::text` cast to BOTH sides of the JOIN condition (the live DB
 * has posts.category_id / subcategory_id as TEXT while categories /
 * subcategories are UUID).
 *
 * The untracked searchController.js has no git history, so its (only
 * categories join on products p) is reconstructed explicitly.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd(); // server/

const FILES = [
  "src/controllers/postController.js",
  "src/controllers/saleController.js",
  "src/routes/posts.js",
  "src/routes/transactions.js",
];

const castJoins = (line) =>
  line
    .replace(/(\w+)\.category_id = (\w+)\.category_id/g, "$1.category_id::text = $2.category_id::text")
    .replace(/(\w+)\.subcategory_id = (\w+)\.subcategory_id/g, "$1.subcategory_id::text = $2.subcategory_id::text");

/** Extract (corruptedLine -> originalLine) pairs in order from a git diff. */
function parseDiff(diff) {
  const pairs = [];
  const minusQueue = [];
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("@@") || raw.startsWith("diff ") || raw.startsWith("index ") ||
        raw.startsWith("---") || raw.startsWith("+++")) {
      minusQueue.length = 0;
      continue;
    }
    if (raw.startsWith("-") && /JOIN (categories|subcategories) /.test(raw)) {
      minusQueue.push(raw.slice(1));
    } else if (raw.startsWith("+")) {
      const added = raw.slice(1);
      if (added.includes("::text::text") && minusQueue.length > 0) {
        pairs.push({ corrupted: added, original: minusQueue.shift() });
      }
    } else {
      // context line — flush any pending minus lines that were pure removals
      minusQueue.length = 0;
    }
  }
  return pairs;
}

let totalFixed = 0;

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  const lines = src.split("\n");

  let diff = "";
  try {
    diff = execSync(`git diff -- ${rel}`, { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    console.log(`NO DIFF for ${rel}: ${e.message}`);
  }
  const pairs = parseDiff(diff);

  // Corrupted lines appear in the same order as the diff `+` lines.
  const corruptedLineNumbers = [];
  lines.forEach((l, i) => {
    if (l.includes("::text::text")) corruptedLineNumbers.push(i);
  });

  if (corruptedLineNumbers.length !== pairs.length) {
    console.error(
      `MISMATCH in ${rel}: ${corruptedLineNumbers.length} corrupted lines vs ${pairs.length} diff pairs. Aborting this file.`
    );
    continue;
  }

  let changed = false;
  for (let k = 0; k < corruptedLineNumbers.length; k += 1) {
    const lineIdx = corruptedLineNumbers[k];
    const original = pairs[k].original;
    // Preserve the current indentation but use the original JOIN wording.
    const indentMatch = lines[lineIdx].match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : "";
    const fixed = castJoins(original.trim());
    lines[lineIdx] = indent + fixed;
    changed = true;
    totalFixed += 1;
    console.log(`  ${rel}:${lineIdx + 1} -> ${fixed}`);
  }

  if (changed) {
    fs.writeFileSync(abs, lines.join("\n"), "utf8");
  }
}

// ── searchController.js (untracked): products p join categories c ──
{
  const rel = "src/controllers/searchController.js";
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  let fixed = src;
  const before = (fixed.match(/::text::text/g) || []).length;
  fixed = fixed.replace(/LEFT ::text::text/g,
    "LEFT JOIN categories c ON p.category_id::text = c.category_id::text");
  fixed = fixed.replace(/::text::text/g,
    "JOIN categories c ON p.category_id::text = c.category_id::text");
  const after = (fixed.match(/::text::text/g) || []).length;
  if (before !== after) {
    console.error(`searchController.js: ${before - after} remnants could not be resolved`);
  }
  fs.writeFileSync(abs, fixed, "utf8");
  console.log(`searchController.js fixed (${before} remnants resolved)`);
  totalFixed += before - after;
}

console.log(`DONE — total fixed: ${totalFixed}`);
