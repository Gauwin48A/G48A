#!/usr/bin/env node
// Inspect R8 mapping file: find obfuscated class, its members, and specific methods.
// Usage: node map_inspect.mjs <mapping.txt> <obfClass> [memberFilter]
import fs from 'fs';
import readline from 'readline';

const [mappingPath, obfClass, memberFilter] = process.argv.slice(2);
if (!mappingPath || !obfClass) {
  console.error('Usage: node map_inspect.mjs <mapping.txt> <obfClass> [memberFilter]');
  process.exit(1);
}

const wanted = obfClass.split('.').pop(); // support t6.a -> a
const results = [];
const classBlocks = new Map(); // obfName -> { orig, members: [] }

const rl = readline.createInterface({ input: fs.createReadStream(mappingPath, { encoding: 'utf8' }), crlfDelay: Infinity });
let cur = null;

rl.on('line', (line) => {
  if (line.startsWith('#')) return;
  const classMatch = line.match(/^(.*?) -> (.*):\s*$/);
  if (classMatch) {
    cur = { orig: classMatch[1], obf: classMatch[2], members: [] };
    if (!classBlocks.has(classMatch[2])) classBlocks.set(classMatch[2], []);
    classBlocks.get(classMatch[2]).push(cur);
    return;
  }
  if (cur) cur.members.push(line.trim());
});

rl.on('close', () => {
  // exact matches by full obf name, then by simple name
  let blocks = classBlocks.get(obfClass) || [];
  if (!blocks.length) {
    for (const [name, list] of classBlocks) {
      if (name.split('.').pop() === wanted) blocks = blocks.concat(list);
    }
  }
  if (!blocks.length) {
    console.log(`NO CLASS FOUND for obf=${obfClass}`);
    return;
  }
  for (const b of blocks) {
    console.log(`\n===== CLASS: ${b.orig}  ->  ${b.obf} =====`);
    const filter = memberFilter ? new RegExp(memberFilter) : null;
    let count = 0;
    for (const m of b.members) {
      if (filter && !filter.test(m)) continue;
      console.log(`  ${m}`);
      if (++count >= 30) { console.log('  ... (truncated)'); break; }
    }
  }
});
