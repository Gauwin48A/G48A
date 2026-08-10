/**
 * Fix mojibake in Kotlin source files caused by Windows-1252 re-encoding of UTF-8 content.
 * 
 * When UTF-8 encoded files are opened/saved in Windows-1252 encoding,
 * multi-byte UTF-8 sequences get interpreted as multiple Latin-1/Win-1252 chars.
 * This script reverses that damage.
 */
const fs = require('fs');
const path = require('path');

// Windows-1252 special mappings for 0x80-0x9F range
const win1252SpecialToCodePoint = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};
// Reverse: Unicode codepoint → original byte
const codePointToWin1252Byte = {};
for (const [b, cp] of Object.entries(win1252SpecialToCodePoint)) {
  codePointToWin1252Byte[cp] = parseInt(b);
}

/**
 * Get the original byte value for a character that may be a Win-1252 misinterpretation.
 * Win-1252 bytes 0x80–0x9F map to special Unicode codepoints (often > 0xFF).
 * Win-1252 bytes 0xA0–0xFF map directly to same Latin-1 codepoints.
 */
function getOrigByte(cp) {
  // Check Win-1252 special reverse map first (covers codepoints like U+20AC, U+201A, U+0178 etc.)
  if (codePointToWin1252Byte[cp] !== undefined) return codePointToWin1252Byte[cp];
  // Direct Latin-1 extended range (0x80–0xFF): byte value == codepoint value
  if (cp >= 0x80 && cp <= 0xFF) return cp;
  return null;
}

function fixMojibake(content) {
  let result = '';
  let i = 0;
  while (i < content.length) {
    const cp = content.codePointAt(i);
    const charLen = cp > 0xFFFF ? 2 : 1;

    // 2-byte UTF-8 lead: 0xC2–0xDF
    if (cp >= 0xC2 && cp <= 0xDF && i + 1 < content.length) {
      const next = content.codePointAt(i + 1);
      const nextByte = getOrigByte(next);
      if (nextByte !== null && nextByte >= 0x80 && nextByte <= 0xBF) {
        try {
          const decoded = Buffer.from([cp, nextByte]).toString('utf8');
          if (decoded.length === 1 && decoded.codePointAt(0) >= 0x80) {
            result += decoded; i += 2; continue;
          }
        } catch (e) {}
      }
    }

    // 3-byte UTF-8 lead: 0xE0–0xEF
    if (cp >= 0xE0 && cp <= 0xEF && i + 2 < content.length) {
      const n1 = content.codePointAt(i + 1);
      const n2 = content.codePointAt(i + 2);
      const b1 = getOrigByte(n1);
      const b2 = getOrigByte(n2);
      if (b1 !== null && b2 !== null && b1 >= 0x80 && b1 <= 0xBF && b2 >= 0x80 && b2 <= 0xBF) {
        try {
          const decoded = Buffer.from([cp, b1, b2]).toString('utf8');
          if (decoded.length === 1 && decoded.codePointAt(0) >= 0x800) {
            result += decoded; i += 3; continue;
          }
        } catch (e) {}
      }
    }

    // 4-byte UTF-8 lead: 0xF0–0xF7 (emoji and rare chars)
    if (cp >= 0xF0 && cp <= 0xF7 && i + 3 < content.length) {
      const n1 = content.codePointAt(i + 1);
      const n2 = content.codePointAt(i + 2);
      const n3 = content.codePointAt(i + 3);
      const b1 = getOrigByte(n1);
      const b2 = getOrigByte(n2);
      const b3 = getOrigByte(n3);
      if (b1 !== null && b2 !== null && b3 !== null &&
          b1 >= 0x80 && b1 <= 0xBF && b2 >= 0x80 && b2 <= 0xBF && b3 >= 0x80 && b3 <= 0xBF) {
        try {
          const decoded = Buffer.from([cp, b1, b2, b3]).toString('utf8');
          const dcp = decoded.codePointAt(0);
          if (decoded && dcp >= 0x10000) {
            result += decoded; i += 4; continue;
          }
        } catch (e) {}
      }
    }

    // Not mojibake — keep as-is (use substring to preserve surrogate pairs for emoji)
    result += content.substring(i, i + charLen);
    i += charLen;
  }
  return result;
}

function walkKt(dir, results) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'build') walkKt(full, results);
    else if (item.isFile() && item.name.endsWith('.kt')) results.push(full);
  }
  return results;
}

const srcDir = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java';
const files = walkKt(srcDir, []);

let totalFixed = 0;
for (const f of files) {
  const original = fs.readFileSync(f, 'utf8');
  const fixed = fixMojibake(original);
  if (fixed !== original) {
    fs.writeFileSync(f, fixed, 'utf8');
    const changes = [...original].filter((c, i) => c !== (fixed[i] || '')).length;
    console.log('Fixed: ' + f.split('/').slice(-3).join('/') + ' (' + changes + ' chars changed)');
    totalFixed++;
  }
}
console.log('Total files fixed: ' + totalFixed);
