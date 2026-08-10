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

// ExploreScreen line 395 - furniture emoji
let p = findFile('ExploreScreen.kt', base);
let lines = fs.readFileSync(p, 'utf8').split('\n');
if (lines[394].includes(FFFD)) {
  lines[394] = lines[394].replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDFE0');
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log('ExploreScreen.kt furniture fixed');
}

// HomeScreen line 1231 - Great Deals emoji
p = findFile('HomeScreen.kt', base);
lines = fs.readFileSync(p, 'utf8').split('\n');
if (lines[1230].includes(FFFD)) {
  lines[1230] = lines[1230].replace(new RegExp(FFFD + '\uFE0F?', 'g'), '\uD83C\uDF81');
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
  console.log('HomeScreen.kt Great Deals fixed');
}

// Final check
let total = 0;
function walk(dir) { const r=[]; for(const f of fs.readdirSync(dir)){const full=dir+'/'+f; if(fs.statSync(full).isDirectory())r.push(...walk(full)); else if(f.endsWith('.kt'))r.push(full);} return r; }
walk(base).forEach(fp => {
  const c = (fs.readFileSync(fp,'utf8').match(/\uFFFD/g)||[]).length;
  if (c > 0) { console.log('  STILL:', fp.split('/').pop(), c); total += c; }
});
console.log('Total FFFD remaining:', total);
