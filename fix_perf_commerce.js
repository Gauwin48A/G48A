const fs = require('fs');
let content = fs.readFileSync('app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt', 'utf8');

// File uses \r\n line endings
const EOL = '\r\n';

// ── 1. Add import for withTimeout ──
const importTarget = 'import kotlinx.coroutines.flow.asStateFlow';
const importReplacement = 'import kotlinx.coroutines.TimeoutCancellationException' + EOL +
  'import kotlinx.coroutines.withTimeout' + EOL +
  'import kotlinx.coroutines.flow.asStateFlow';

const idxImport = content.indexOf(importTarget);
if (idxImport >= 0) {
  content = content.substring(0, idxImport) + importReplacement + content.substring(idxImport + importTarget.length);
  console.log('✅ Import added');
} else {
  console.log('❌ Import target not found');
}

// ── 2. SoldPostsViewModel.load() ──
// Pattern with exact whitespace and CRLF endings
const soldOld = [
  '    fun load() {',
  '        viewModelScope.launch {',
  '            _state.value = PostListUiState(loading = true)',
  '            when (val r = repo.sold()) {',
  '                is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)',
  '                is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)',
  '            }',
  '        }',
  '    }',
].join(EOL);

const soldNew = [
  '    fun load() {',
  '        viewModelScope.launch {',
  '            _state.value = PostListUiState(loading = true)',
  '            try {',
  '                withTimeout(2000) {',
  '                    when (val r = repo.sold()) {',
  '                        is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)',
  '                        is ApiResult.Failure -> _state.value = PostListUiState(loading = false, posts = MOCK_SOLD_POSTS)',
  '                    }',
  '                }',
  '            } catch (e: TimeoutCancellationException) {',
  '                _state.value = PostListUiState(loading = false, posts = MOCK_SOLD_POSTS)',
  '            }',
  '        }',
  '    }',
].join(EOL);

if (content.includes(soldOld)) {
  content = content.replace(soldOld, soldNew);
  console.log('✅ SoldPostsViewModel updated');
} else {
  console.log('❌ SoldPostsViewModel pattern not found');
  // Debug: show what's at that location
  const lines = content.split(EOL);
  const soldStart = lines.findIndex(l => l.includes('class SoldPostsViewModel'));
  if (soldStart >= 0) {
    for (let i = soldStart; i < soldStart + 15 && i < lines.length; i++) {
      console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
    }
  }
}

// ── 3. BoughtPostsViewModel.load() ──
const boughtOld = [
  '    fun load() {',
  '        viewModelScope.launch {',
  '            _state.value = PostListUiState(loading = true)',
  '            when (val r = repo.bought()) {',
  '                is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)',
  '                is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)',
  '            }',
  '        }',
  '    }',
].join(EOL);

const boughtNew = [
  '    fun load() {',
  '        viewModelScope.launch {',
  '            _state.value = PostListUiState(loading = true)',
  '            try {',
  '                withTimeout(2000) {',
  '                    when (val r = repo.bought()) {',
  '                        is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)',
  '                        is ApiResult.Failure -> _state.value = PostListUiState(loading = false, posts = MOCK_BOUGHT_POSTS)',
  '                    }',
  '                }',
  '            } catch (e: TimeoutCancellationException) {',
  '                _state.value = PostListUiState(loading = false, posts = MOCK_BOUGHT_POSTS)',
  '            }',
  '        }',
  '    }',
].join(EOL);

if (content.includes(boughtOld)) {
  content = content.replace(boughtOld, boughtNew);
  console.log('✅ BoughtPostsViewModel updated');
} else {
  console.log('❌ BoughtPostsViewModel pattern not found');
}

// ── 4. Apply TranslatedText to sold/bought/myposts list screens ──
// Replace Text(post.displayTitle) with TranslatedText(post.displayTitle) in the commerce screens
const displayTitlePatterns = [
  'Text(post.displayTitle',
  'Text(it.displayTitle',
  'Text(item.displayTitle',
  'Text(city.name)',
  'Text(city.state,',
  'Text(offer.postTitle',
];
let count = 0;
for (const pattern of displayTitlePatterns) {
  const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = content.match(regex);
  if (matches) {
    const replacement = pattern.replace('Text(', 'TranslatedText(');
    content = content.replace(regex, replacement);
    count += matches.length;
  }
}
console.log(`✅ TranslatedText applied: ${count} replacements`);

fs.writeFileSync('app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt', content, 'utf8');
console.log('✅ File written successfully');
