const fs = require('fs');
const base = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui';
function findFile(name, dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) { const r = findFile(name, full); if (r) return r; }
    else if (f === name) return full;
  }
}
const p = findFile('SocialScreens.kt', base);
const lines = fs.readFileSync(p, 'utf8').split('\n');
// Fix line 1190 - the "Continuous Improvement" FFFD
lines[1189] = lines[1189].replace('\uFFFD Continuous Improvement', '\uD83D\uDD04 Continuous Improvement');
fs.writeFileSync(p, lines.join('\n'), 'utf8');
const remaining = (fs.readFileSync(p, 'utf8').match(/\uFFFD/g) || []).length;
console.log('FFFD remaining in SocialScreens:', remaining);
