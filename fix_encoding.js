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

function fixMojibake(content) {
  let result = '';
  let i = 0;
  while (i < content.length) {
    const cp = content.codePointAt(i);
    const charLen = cp > 0xFFFF ? 2 : 1;
    
    // Check if this char could be the start of a mojibake sequence
    // Original UTF-8 multi-byte sequences start with 0xC2-0xF4
    // After Win-1252 re-encoding:
    //   0xC2-0xDF → shows as U+00C2-U+00DF (Latin chars like Â, Ã, Ä...)
    //   0xE0-0xEF → shows as U+00E0-U+00EF (à, á, â, ã, ä, å...)
    //   0xF0-0xF7 → shows as U+00F0-U+00F7 (ð, ñ, ò, ó, ô, õ, ö, ÷)
    
    if (cp >= 0xC0 && cp <= 0xDF && i + 1 < content.length) {
      // Possible 2-byte UTF-8 sequence
      const next = content.codePointAt(i + 1);
      const nextByte = next >= 0x80 && next < 0xA0 ? codePointToWin1252Byte[next] : next < 0x100 ? next : null;
      if (nextByte !== null && nextByte >= 0x80 && nextByte <= 0xBF) {
        const bytes = [cp, nextByte];
        try {
          const decoded = Buffer.from(bytes).toString('utf8');
          if (decoded.length === 1 && decoded.codePointAt(0) >= 0x80) {
            result += decoded;
            i += 2;
            continue;
          }
        } catch (e) {}
      }
    }
    
    if (cp >= 0xE0 && cp <= 0xEF && i + 2 < content.length) {
      // Possible 3-byte UTF-8 sequence
      const next1 = content.codePointAt(i + 1);
      const next2 = content.codePointAt(i + 2);
      const b1 = next1 >= 0x80 && next1 < 0xA0 ? codePointToWin1252Byte[next1] : next1 < 0x100 ? next1 : null;
      const b2 = next2 >= 0x80 && next2 < 0xA0 ? codePointToWin1252Byte[next2] : next2 < 0x100 ? next2 : null;
      if (b1 !== null && b2 !== null && b1 >= 0x80 && b1 <= 0xBF && b2 >= 0x80 && b2 <= 0xBF) {
        const bytes = [cp, b1, b2];
        try {
          const decoded = Buffer.from(bytes).toString('utf8');
          if (decoded.length === 1 && decoded.codePointAt(0) >= 0x800) {
            result += decoded;
            i += 3;
            continue;
          }
        } catch (e) {}
      }
    }
    
    if (cp >= 0xF0 && cp <= 0xF7 && i + 3 < content.length) {
      // Possible 4-byte UTF-8 sequence (emoji)
      const next1 = content.codePointAt(i + 1);
      const next2 = content.codePointAt(i + 2);
      const next3 = content.codePointAt(i + 3);
      const b1 = next1 >= 0x80 && next1 < 0xA0 ? codePointToWin1252Byte[next1] : next1 < 0x100 ? next1 : null;
      const b2 = next2 >= 0x80 && next2 < 0xA0 ? codePointToWin1252Byte[next2] : next2 < 0x100 ? next2 : null;
      const b3 = next3 >= 0x80 && next3 < 0xA0 ? codePointToWin1252Byte[next3] : next3 < 0x100 ? next3 : null;
      if (b1 !== null && b2 !== null && b3 !== null &&
          b1 >= 0x80 && b1 <= 0xBF && b2 >= 0x80 && b2 <= 0xBF && b3 >= 0x80 && b3 <= 0xBF) {
        const bytes = [cp, b1, b2, b3];
        try {
          const decoded = Buffer.from(bytes).toString('utf8');
          const dcp = decoded.codePointAt(0);
          if (decoded && dcp >= 0x10000) {
            result += decoded;
            i += 4;
            continue;
          }
        } catch (e) {}
      }
    }
    
    // Not mojibake, keep as-is
    result += content[i];
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
