const fs = require('fs');
const p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/categoryapp/ProductListingScreen.kt';
let content = fs.readFileSync(p, 'utf8');

// Remove unused/duplicate imports that I added
const toRemove = [
  'import androidx.compose.foundation.layout.wrapContentWidth\n',
  'import androidx.compose.foundation.lazy.LazyRow\n',
  'import androidx.compose.foundation.lazy.items\n',  // conflicts with grid.items
  'import androidx.compose.material3.ButtonDefaults\n',
  'import androidx.compose.material3.Card\n',
  'import androidx.compose.material3.CardDefaults\n',
  'import androidx.compose.material3.VerticalDivider\n',
  'import androidx.compose.ui.graphics.Color\n',
  'import androidx.compose.foundation.lazy.rememberLazyListState\n',
  'import androidx.compose.material.icons.filled.Add\n',
  'import androidx.compose.material.icons.filled.Remove\n',
  'import androidx.compose.ui.res.stringResource\n',
  'import com.mhub.app.R\n',
  'import androidx.compose.foundation.layout.Box\n',  // duplicate (already at top)
  'import androidx.compose.foundation.border\n',
  'import androidx.compose.ui.unit.sp\n',
];

for (const line of toRemove) {
  if (content.includes(line)) {
    content = content.replace(line, '');
    console.log('Removed: ' + line.trim());
  }
}

// Add alias for lazy items to avoid conflict
content = content.replace(
  'import androidx.compose.foundation.lazy.LazyColumn\n',
  'import androidx.compose.foundation.lazy.LazyColumn\nimport androidx.compose.foundation.lazy.items as lazyItems\n'
);

// Fix usages in CompareProductsDialog to use lazyItems
content = content.replace(
  /items\(attrs\)/g,
  'lazyItems(attrs)'
);
content = content.replace(
  /items\(allSpecKeys\)/g,
  'lazyItems(allSpecKeys)'
);

fs.writeFileSync(p, content, 'utf8');
console.log('Done!');
