const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix constructor to include uploadRepo
const oldConstructorLine = 'class FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {';
const newConstructorBlock = [
    'class FeedPostAddViewModel @Inject constructor(',
    '    private val repo: SocialRepository,',
    '    private val uploadRepo: UploadRepository,',
    ') : ViewModel() {',
    '    private val _state = MutableStateFlow(FeedPostAddUiState())',
    '    val state: StateFlow<FeedPostAddUiState> = _state.asStateFlow()',
    '    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v) }',
    '    fun setContent(v: String) { if (v.length <= 500) _state.value = _state.value.copy(content = v) }',
    '    fun setImages(uris: List<Uri>) { _state.value = _state.value.copy(imageUris = uris) }',
    '    fun submit(bytesProvider: ((Uri) -> Pair<ByteArray, String>?)? = null) {',
    '        val s = _state.value',
    '        if (s.content.length < 5) { _state.value = s.copy(error = "Content must be at least 5 characters"); return }',
    '        _state.value = s.copy(loading = true, error = null)',
    '        val desc = if (s.title.isNotBlank()) "${s.title}\\n\\n${s.content}" else s.content',
    '        viewModelScope.launch {',
    '            // Upload images first if any',
    '            val uploadedUrls = mutableListOf<String>()',
    '            if (s.imageUris.isNotEmpty()) {',
    '                _state.value = _state.value.copy(uploading = true)',
    '                for (uri in s.imageUris) {',
    '                    val data = bytesProvider?.invoke(uri) ?: continue',
    '                    val (bytes, mime) = data',
    '                    when (val result = uploadRepo.uploadPostImage(bytes, mime)) {',
    '                        is ApiResult.Success -> uploadedUrls.add(result.data)',
    '                        is ApiResult.Failure -> {',
    '                            _state.value = s.copy(loading = false, uploading = false, error = "Image upload failed: ${result.error.message}")',
    '                            return@launch',
    '                        }',
    '                    }',
    '                }',
    '                _state.value = _state.value.copy(uploading = false)',
    '            }',
    '            when (val r = repo.createPost(CreateFeedRequest(content = desc, images = uploadedUrls))) {',
    '                is ApiResult.Success -> _state.value = FeedPostAddUiState(success = true)',
    '                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)',
    '            }',
    '        }',
    '    }',
    '}'
].join('\n');

// Find the exact block from constructor to closing brace
const oldBlockStart = 'class FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {';
const idx = content.indexOf(oldBlockStart);
if (idx >= 0) {
    // Find the matching closing brace for the ViewModel class
    let braceCount = 0;
    let endIdx = idx;
    let foundStart = false;
    for (let i = idx; i < content.length; i++) {
        if (content[i] === '{') { braceCount++; foundStart = true; }
        if (content[i] === '}') { braceCount--; }
        if (foundStart && braceCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
    const oldBlock = content.substring(idx, endIdx);
    content = content.replace(oldBlock, newConstructorBlock);
    console.log('Replaced full ViewModel block');
} else {
    console.log('Cannot find old constructor - trying alternative...');
    // Try alternative: constructor already modified but missing methods
    const altStart = 'class FeedPostAddViewModel @Inject constructor(';
    const altIdx = content.indexOf(altStart);
    if (altIdx >= 0) {
        // Find the class block
        let braceCount = 0;
        let endIdx = altIdx;
        let foundStart = false;
        for (let i = altIdx; i < content.length; i++) {
            if (content[i] === '{') { braceCount++; foundStart = true; }
            if (content[i] === '}') { braceCount--; }
            if (foundStart && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
        const oldBlock = content.substring(altIdx, endIdx);
        content = content.replace(oldBlock, newConstructorBlock);
        console.log('Replaced ViewModel block (alt match)');
    } else {
        console.error('Cannot find ViewModel at all');
        process.exit(1);
    }
}

// 2. Ensure LocalContext import is correct
if (!content.includes('import androidx.compose.ui.platform.LocalContext')) {
    content = content.replace(
        'import androidx.compose.ui.platform.LocalClipboardManager',
        'import androidx.compose.ui.platform.LocalClipboardManager\nimport androidx.compose.ui.platform.LocalContext'
    );
    console.log('Added LocalContext import');
}

// 3. Remove duplicate if any
while (content.includes('import androidx.compose.ui.platform.LocalContext\nimport androidx.compose.ui.platform.LocalContext')) {
    content = content.replace(
        'import androidx.compose.ui.platform.LocalContext\nimport androidx.compose.ui.platform.LocalContext',
        'import androidx.compose.ui.platform.LocalContext'
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved successfully');

// Count methods
const methodCount = (content.match(/fun set/g) || []).length;
console.log('Total fun set* methods in file:', methodCount);
