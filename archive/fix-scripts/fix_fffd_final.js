const fs = require('fs');
const FFFD = '\uFFFD';

// Fix ExploreScreen real estate line
let p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let text = fs.readFileSync(p, 'utf8');
const lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('real estate') && lines[i].includes(FFFD)) {
    lines[i] = lines[i].replace(FFFD, '\uD83C\uDFE0');
  }
}
text = lines.join('\n');
fs.writeFileSync(p, text, 'utf8');

// Fix RewardsScreen scratch None line
p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/rewards/RewardsScreen.kt';
text = fs.readFileSync(p, 'utf8');
const rlines = text.split('\n');
for (let i = 0; i < rlines.length; i++) {
  if (rlines[i].includes('None') && rlines[i].includes(FFFD)) {
    rlines[i] = rlines[i].replace(FFFD, '\uD83C\uDFB4');
  }
}
text = rlines.join('\n');
fs.writeFileSync(p, text, 'utf8');

// Verify
[
  'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt',
  'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/rewards/RewardsScreen.kt',
].forEach(fp => {
  const count = (fs.readFileSync(fp, 'utf8').match(/\uFFFD/g) || []).length;
  console.log(fp.split('/').pop(), ':', count === 0 ? 'CLEAN' : count + ' remaining');
});
