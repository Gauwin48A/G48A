#!/usr/bin/env node
/**
 * Apply `::text` casts to BOTH sides of every category/subcategory JOIN
 * condition across server/src.
 *
 * WHY: the live DB has posts.category_id / subcategory_id as TEXT while the
 * (newly created) categories / subcategories tables use UUID. Joining them
 * without casts throws `operator does not exist: text = uuid`.
 *
 * SAFETY: uses a replacement *function* (not `$1..$4` group-ref strings) so
 * it is immune to shell interpolation — the previous attempt was corrupted
 * because bash expanded `$1..$4` to empty strings before Node executed the
 * inline `node -e` script, collapsing every JOIN clause into `::text::text`.
 *
 * Idempotent: already-cast joins are left untouched.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");

const patterns = [
  /(JOIN categories c ON )(\w+)\.category_id( = )(\w+)\.category_id/g,
  /(JOIN categories c ON )(\w+)\.category_id( = )(\w+)\.category_id /g, // trailing space variant
  /(JOIN subcategories sc ON )(\w+)\.subcategory_id( = )(\w+)\.subcategory_id/g,
  /(JOIN subcategories sc ON )(\w+)\.subcategory_id( = )(\w+)\.subcategory_id /g,
];

function castLine(line) {
  let out = line;
  for (const re of patterns) {
    out = out.replace(re, (match, prefix, left, eq, right) => {
      // Skip if already cast
      if (left.endsWith("::text") || right.endsWith("::text")) return match;
      return `${prefix}${left}::text${eq}${right}::text`;
    });
  }
  return out;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (entry.endsWith(".js")) {
      const before = fs.readFileSync(p, "utf8");
      const after = castLine(before);
      if (after !== before) {
        fs.writeFileSync(p, after, "utf8");
        console.log(`CASTED ${path.relative(ROOT, p)}`);
      }
    }
  }
}

walk(ROOT);
console.log("DONE");
