#!/usr/bin/env node
// Accurate R8 mapping deobfuscator handling class merging.
// Usage: node deobfuscate2.mjs <mapping.txt> <stacktrace.txt>
import fs from 'fs';
import readline from 'readline';

const mappingPath = process.argv[2];
const tracePath = process.argv[3];
if (!mappingPath || !tracePath) {
  console.error('Usage: node deobfuscate2.mjs <mapping.txt> <stacktrace.txt>');
  process.exit(1);
}

const classMap = new Map(); // obfuscatedName -> [original1, original2, ...]

const rl = readline.createInterface({
  input: fs.createReadStream(mappingPath, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  // Class header: original -> obfuscated:  (skip comments like # {...})
  if (line.startsWith('#')) return;
  const m = line.match(/^([^ ].*?) -> (.*):\s*$/);
  if (!m) return;
  const orig = m[1];
  const obf = m[2];
  // Only top-level class declarations: original may contain dots/$; obfuscated is short
  if (obf.includes('.') && !obf.includes('$')) {
    // nested class references (package.Outer.Inner) - store anyway
  }
  if (!classMap.has(obf)) classMap.set(obf, []);
  const list = classMap.get(obf);
  if (!list.includes(orig)) list.push(orig);
});

rl.on('close', () => {
  console.error(`Loaded ${classMap.size} obfuscated names`);
  const traceLines = fs.readFileSync(tracePath, 'utf8').split('\n');
  for (const raw of traceLines) {
    const m = raw.match(/^\s*(.*?)\s+at\s+([\w.$]+)\.([\w$<>]+)\((.*?)\)\s*$/);
    if (!m) { console.log(raw); continue; }
    const cls = m[2];
    const method = m[3];
    const rest = m[4];
    // Try full name, then rightmost segment
    let origs = classMap.get(cls);
    if (!origs) {
      const seg = cls.split('.').pop();
      origs = classMap.get(seg);
      if (origs) cls.replace(seg, '');
    }
    if (origs) {
      const label = origs.length === 1 ? origs[0] : origs.join(' | ');
      console.log(`at ${label}.${method}(${rest})   [obf=${cls}]`);
    } else {
      console.log(raw);
    }
  }
});
