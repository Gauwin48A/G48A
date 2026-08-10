const fs = require('fs');
const p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/categoryapp/ProductListingScreen.kt';
let content = fs.readFileSync(p, 'utf8');

// Normalize to \n for processing
content = content.replace(/\r\n/g, '\n');

// Remove duplicate/unneeded imports (these were added via replace_string_in_file but already exist or are unneeded)
const toRemove = [
  'import androidx.compose.foundation.layout.wrapContentWidth\n',
  'import androidx.compose.foundation.lazy.LazyRow\n',
  'import androidx.compose.foundation.lazy.items\n',  // conflicts with grid.items - use lazyItems alias instead
  'import androidx.compose.material3.ButtonDefaults\n',
  'import androidx.compose.material3.Card\n',
  'import androidx.compose.material3.CardDefaults\n',
  'import androidx.compose.material3.VerticalDivider\n',
  'import androidx.compose.foundation.lazy.rememberLazyListState\n',
  'import androidx.compose.material.icons.filled.Add\n',
  'import androidx.compose.material.icons.filled.Remove\n',
  'import androidx.compose.foundation.border\n',
  // duplicates that were already imported at top:
  'import androidx.compose.foundation.layout.Box\n',  // already imported line 8
];

let removed = 0;
for (const line of toRemove) {
  if (content.includes(line)) {
    content = content.replace(line, '');
    console.log('Removed: ' + line.trim());
    removed++;
  }
}

// Fix the lazy items conflict: rename usages in CompareProductsDialog to use grid items won't work there
// Actually LazyColumn's items comes from foundation.lazy, but we already have grid.items imported.
// The LazyColumn items() is in foundation.lazy.items — let's just add it as an alias.
// Replace `import androidx.compose.foundation.lazy.LazyColumn` with alias version
if (!content.includes('lazyItems')) {
  content = content.replace(
    'import androidx.compose.foundation.lazy.LazyColumn\n',
    'import androidx.compose.foundation.lazy.LazyColumn\nimport androidx.compose.foundation.lazy.items as lazyItems\n'
  );
  // Fix usages
  content = content.replace(/\bitems\(attrs\)/g, 'lazyItems(attrs)');
  content = content.replace(/\bitems\(allSpecKeys\)/g, 'lazyItems(allSpecKeys)');
  console.log('Added lazyItems alias');
}

// Restore missing semantics import if not present
if (!content.includes('import androidx.compose.ui.semantics.semantics')) {
  content = content.replace(
    'import androidx.compose.ui.semantics.contentDescription\n',
    'import androidx.compose.ui.semantics.contentDescription\nimport androidx.compose.ui.semantics.semantics\n'
  );
  console.log('Restored semantics import');
}

// Also check if contentDescription import is present; if not add both
if (!content.includes('import androidx.compose.ui.semantics.contentDescription')) {
  content = content.replace(
    'import androidx.compose.ui.Modifier\n',
    'import androidx.compose.ui.Modifier\nimport androidx.compose.ui.semantics.contentDescription\nimport androidx.compose.ui.semantics.semantics\n'
  );
  console.log('Added semantics imports');
}

// Write back with \r\n for Windows
content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(p, content, 'utf8');
console.log(`Done! Removed ${removed} duplicate imports.`);
