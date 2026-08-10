#!/usr/bin/env node
/**
 * Repair corrupted category/subcategory JOIN clauses.
 *
 * A previous bulk script applied regex replacements of the form
 *   /(JOIN categories c ON )(\w+)\.category_id( = )(\w+)\.category_id/g
 * with a replacement FUNCTION that returned `${prefix}${left}::text${eq}${right}::text`
 * — dropping the `.category_id` suffix from both sides. That turned:
 *   LEFT JOIN categories c ON p.category_id = c.category_id
 * into:
 *   LEFT JOIN categories c ON p::text = c::text
 *
 * `p::text = c::text` compares whole-row text representations, which never
 * match, so category_name / subcategory_name come back NULL everywhere.
 * That breaks category scoping (For You feed leaks posts across categories),
 * subcategory filtering, and category labels in every feed/search result.
 *
 * This script restores the correct form:
 *   LEFT JOIN categories c ON p.category_id::text = c.category_id::text
 *   LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
 *
 * Uses replacement functions (immune to shell interpolation). Idempotent.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");

const PATTERNS = [
  // categories c ON <alias>::text = c::text
  {
    re: /(JOIN categories c ON )([a-z_]+)::text = c::text/g,
    repl: (m, prefix, left) => `${prefix}${left}.category_id::text = c.category_id::text`,
  },
  // categories c ON c::text = <alias>::text  (reversed operand order)
  {
    re: /(JOIN categories c ON )c::text = ([a-z_]+)::text/g,
    repl: (m, prefix, right) => `${prefix}c.category_id::text = ${right}.category_id::text`,
  },
  // subcategories sc ON <alias>::text = sc::text
  {
    re: /(JOIN subcategories sc ON )([a-z_]+)::text = sc::text/g,
    repl: (m, prefix, left) => `${prefix}${left}.subcategory_id::text = sc.subcategory_id::text`,
  },
  // subcategories sc ON sc::text = <alias>::text (reversed)
  {
    re: /(JOIN subcategories sc ON )sc::text = ([a-z_]+)::text/g,
    repl: (m, prefix, right) => `${prefix}sc.subcategory_id::text = ${right}.subcategory_id::text`,
  },
];

function fixLine(line) {
  let out = line;
  for (const { re, repl } of PATTERNS) {
    out = out.replace(re, repl);
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
      const after = fixLine(before);
      if (after !== before) {
        fs.writeFileSync(p, after, "utf8");
        const changed = before.split("\n").filter((l, i) => l !== after.split("\n")[i]).length;
        console.log(`FIXED ${path.relative(ROOT, p)} (${changed} lines)`);
      }
    }
  }
}

walk(ROOT);
console.log("DONE");
