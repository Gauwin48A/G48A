const fs = require('fs');
const FFFD = '\uFFFD';
const base = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui';
function findFile(name, dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) { const r = findFile(name, full); if (r) return r; }
    else if (f === name) return full;
  }
}

const p = findFile('ForYouScreen.kt', base);
const lines = fs.readFileSync(p, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (!l.includes(FFFD)) return;
  const lineNum = i + 1;
  if (l.includes('Near You')) lines[i] = l.replace(FFFD, '\uD83D\uDCCD');           // 📍
  else if (l.includes('Top Deals')) lines[i] = l.replace(FFFD, '\uD83D\uDD25');     // 🔥
  else if (l.includes('PRICE_ASC') && l.includes('\u2191')) lines[i] = l.replace(FFFD, '\uD83D\uDCB0'); // 💰
  else if (l.includes('PRICE_DESC') && l.includes('\u2193')) lines[i] = l.replace(FFFD, '\uD83D\uDCB0'); // 💰
  else if (l.includes('NEWEST') || l.includes('Newest')) lines[i] = l.replace(FFFD, '\uD83D\uDD52'); // 🕒
  else if (l.includes('POPULAR') || l.includes('Popular')) lines[i] = l.replace(FFFD, '\uD83D\uDC41'); // 👁
  else if (l.includes('TRENDING') || l.includes('Trending Near You') || (l.includes('Trending') && !l.includes('Near You'))) {
    lines[i] = l.replace(FFFD, '\uD83D\uDD25'); // 🔥
  }
  else if (l.includes('New Today')) lines[i] = l.replace(FFFD, '\u2728'); // ✨
  else if (l.includes('Based on Your Browsing')) lines[i] = l.replace(FFFD, '\uD83E\uDDE0'); // 🧠
  else if (lineNum >= 800 && lineNum <= 835 && l.trim().startsWith('emoji =')) {
    // AiSectionHeader emoji fields
    if (lineNum === 805) lines[i] = l.replace(FFFD, '\uD83D\uDD25');    // 🔥 Trending Near You
    else if (lineNum === 821) lines[i] = l.replace(FFFD, '\u2728');     // ✨ New Today
    else if (lineNum === 830) lines[i] = l.replace(FFFD, '\uD83E\uDDE0'); // 🧠 Based on Browsing
  }
  else lines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDD25'); // 🔥 fallback
});

fs.writeFileSync(p, lines.join('\n'), 'utf8');
const remaining = (fs.readFileSync(p, 'utf8').match(/\uFFFD/g) || []).length;
console.log('ForYouScreen FFFD remaining:', remaining);
