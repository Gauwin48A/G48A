const fs = require('fs');
const p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/feed/FeedScreen.kt';
let text = fs.readFileSync(p, 'utf8');

const FFFD = '\uFFFD';

// Fix sort dropdown labels - replace specific FFFD patterns by context
text = text.replace(
  '"Shuffle" to "' + FFFD + ' Shuffle"',
  '"Shuffle" to "\uD83D\uDD00 Shuffle"'
);
text = text.replace(
  '"Recent" to "' + FFFD + ' Newest"',
  '"Recent" to "\uD83D\uDD52 Newest"'
);
text = text.replace(
  '"Updated" to "' + FFFD + ' Updated"',
  '"Updated" to "\u26A1 Updated"'
);
text = text.replace(
  '"Views" to "' + FFFD + ' Popular"',
  '"Views" to "\uD83D\uDC41 Popular"'
);
text = text.replace(
  '"Title" to "' + FFFD + ' Title"',
  '"Title" to "\uD83D\uDDD2 Title"'
);

// Fix inline comments
text = text.replace(
  '"Great listing! ' + FFFD + '" to "User_A"',
  '"Great listing! \uD83D\uDC4D" to "User_A"'
);
text = text.replace(
  '"Amazing price ' + FFFD + '" to "User_C"',
  '"Amazing price \uD83D\uDCB0" to "User_C"'
);

fs.writeFileSync(p, text, 'utf8');
console.log('Fixed FeedScreen emojis');
