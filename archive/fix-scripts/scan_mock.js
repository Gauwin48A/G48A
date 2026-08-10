const fs = require('fs');
const p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/data/mock/MockDataProvider.kt';
const lines = fs.readFileSync(p, 'utf8').split('\n');
console.log('Total lines:', lines.length);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('productsForCategory') || lines[i].includes('vehicle') || lines[i].includes('others') || lines[i].includes('agriculture') || lines[i].includes('grocery') || lines[i].includes('furniture')) {
    console.log(i+1, lines[i]);
  }
}
