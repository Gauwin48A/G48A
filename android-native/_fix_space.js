const fs = require('fs');
const path = 'android-native/app/src/main/res/values/strings.xml';
let c = fs.readFileSync(path, 'utf8');
const oldStr = '<string name="feed_share_text_prefix">Check out this knowledge post: </string>';
const newStr = '<string name="feed_share_text_prefix">Check out this knowledge post:\u0020</string>';
if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  fs.writeFileSync(path, c, 'utf8');
  console.log('Fixed trailing space using \\u0020');
} else {
  console.log('Pattern not found, checking...');
  const idx = c.indexOf('feed_share_text_prefix');
  if (idx >= 0) console.log('Found at', idx, 'Context:', JSON.stringify(c.substring(idx, idx + 80)));
  else console.log('feed_share_text_prefix not found at all');
}
