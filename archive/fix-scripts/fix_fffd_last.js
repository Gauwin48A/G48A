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

// CategoriesScreen - line-by-line based on keyword
const catPath = findFile('CategoriesScreen.kt', base);
let text = fs.readFileSync(catPath, 'utf8');
const catLines = text.split('\n');
catLines.forEach((l, i) => {
  if (!l.includes(FFFD)) return;
  const n = l.toLowerCase();
  if (n.includes('"electron"') || n.includes('"tech"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDCBB');
  else if (n.includes('"fashion"') || n.includes('"cloth"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDC57');
  else if (n.includes('"vehicle"') || n.includes('"car"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDE97');
  else if (n.includes('"furniture"') || n.includes('"home"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFE0');
  else if (n.includes('"book"') || n.includes('"education"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDCDA');
  else if (n.includes('"food"') || n.includes('"grocery"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDF54');
  else if (n.includes('"job"') || n.includes('"service"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDCBC');
  else if (n.includes('"real estate"') || n.includes('"property"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFE0');
  else if (n.includes('"toy"') || n.includes('"game"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFAE');
  else if (n.includes('"health"') || n.includes('"beauty"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDC84');
  else if (n.includes('"pet"') || n.includes('"animal"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDC3E');
  else if (n.includes('"music"') || n.includes('"instrument"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFB5');
  else if (n.includes('"art"') || n.includes('"craft"')) catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFA8');
  else catLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFF7\uFE0F');
});
fs.writeFileSync(catPath, catLines.join('\n'), 'utf8');
console.log('CategoriesScreen.kt: fixed');

// CommerceScreens - target specific FFFD instances
const commPath = findFile('CommerceScreens.kt', base);
text = fs.readFileSync(commPath, 'utf8');
const commLines = text.split('\n');
commLines.forEach((l, i) => {
  if (!l.includes(FFFD)) return;
  if (l.includes('"chat" to "')) commLines[i] = l.replace(FFFD, '\uD83D\uDCAC');      // 💬 Chat
  else if (l.includes('Buyer Notified')) commLines[i] = l.replace(FFFD, '\uD83D\uDCE3'); // 📣
  else commLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\u2705');
});
fs.writeFileSync(commPath, commLines.join('\n'), 'utf8');
console.log('CommerceScreens.kt: fixed');

// SocialScreens - remaining FFFD
const socPath = findFile('SocialScreens.kt', base);
text = fs.readFileSync(socPath, 'utf8');
const socLines = text.split('\n');
socLines.forEach((l, i) => {
  if (!l.includes(FFFD)) return;
  if (l.includes('Top Buyers')) socLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDED2'); // 🛒
  else if (l.includes('We Listen')) socLines[i] = l.replace(FFFD, '\uD83D\uDC42');    // 👂
  else if (l.includes('Continuous')) socLines[i] = l.replace(FFFD, '\uD83D\uDD04');   // 🔄
  else socLines[i] = l.replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83D\uDCAC');
});
fs.writeFileSync(socPath, socLines.join('\n'), 'utf8');
console.log('SocialScreens.kt: fixed');

// Final verification
function walkKt(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) files.push(...walkKt(full));
    else if (f.endsWith('.kt')) files.push(full);
  }
  return files;
}
let total = 0;
walkKt(base).forEach(p => {
  const count = (fs.readFileSync(p, 'utf8').match(/\uFFFD/g) || []).length;
  if (count > 0) { console.log('  STILL HAS FFFD:', p.split('/').pop(), count); total += count; }
});
console.log('Total FFFD remaining:', total);
