#!/usr/bin/env node
// Deobfuscate an R8 mapping file stack trace.
// Usage: node deobfuscate.mjs <mapping.txt> <stacktrace.txt>
import fs from 'fs';
import readline from 'readline';

const mappingPath = process.argv[2];
const tracePath = process.argv[3];

if (!mappingPath || !tracePath) {
  console.error('Usage: node deobfuscate.mjs <mapping.txt> <stacktrace.txt>');
  process.exit(1);
}

const classMap = new Map(); // obfuscatedName -> originalName

const rl = readline.createInterface({
  input: fs.createReadStream(mappingPath, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  // Class header:  original.name -> obfuscated.name:
  // Note: nested classes also match:  original.Outer$Inner -> obf.Outer$Renamed:
  const classMatch = line.match(/^(.*?) -> (.*):$/);
  if (classMatch && !line.trimStart().startsWith('#')) {
    classMap.set(classMatch[2], classMatch[1]);
  }
});

rl.on('close', () => {
  console.error(`Loaded ${classMap.size} class mappings`);
  const traceLines = fs.readFileSync(tracePath, 'utf8').split('\n');
  for (const raw of traceLines) {
    // Match:  at obfuscated.Class.method(SourceFile:123)  (also handles package prefixes)
    const m = raw.match(/^\s*(.*?)\s+at\s+([\w.$]+)\.([\w$<>]+)\((.*?)\)\s*$/);
    if (!m) {
      console.log(raw);
      continue;
    }
    const cls = m[2];
    const method = m[3];
    const rest = m[4];
    // Try exact match first, then try to match the rightmost segment as obfuscated name
    let orig = classMap.get(cls);
    if (!orig) {
      // e.g. cls = "t0.S4" -> try "S4"
      const seg = cls.split('.').pop();
      orig = classMap.get(seg);
      if (orig) {
        console.log(`at ${orig}.${method}(${rest})   [obf=${cls}]`);
        continue;
      }
      console.log(raw);
      continue;
    }
    console.log(`at ${orig}.${method}(${rest})   [obf=${cls}]`);
  }
});
