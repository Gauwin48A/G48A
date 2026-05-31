const fs = require('fs');
function walkKt(dir, results) {
  const items = fs.readdirSync(dir, {withFileTypes: true});
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'build') walkKt(full, results);
    else if (item.isFile() && item.name.endsWith('.kt')) results.push(full);
  }
  return results;
}
const files = walkKt('C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java', []);
let total = 0;
const mojibakeChars = /[\u00f0\u00c5\u00c2\u0080\u0090\u009c\u009d\u00e2\u00e2\u00cb\u00e2\u0098\u0099\u009e\u009f]/;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (mojibakeChars.test(line)) {
      total++;
      const shortFile = f.split('/').slice(-3).join('/');
      console.log(shortFile + ':' + (i+1) + ': ' + line.trim().substring(0, 120));
    }
  }
}
console.log('Total mojibake lines: ' + total);
