const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the FeedPostAddViewModel class
let vmStart = -1;
let vmEnd = -1;
const searchStart = 'class FeedPostAddViewModel @Inject constructor';
const searchOldConstructor = 'class FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {';
const searchNewConstructor = 'class FeedPostAddViewModel @Inject constructor(\n    private val repo: SocialRepository,\n    private val uploadRepo: UploadRepository,\n) : ViewModel() {';

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStart)) {
        vmStart = i;
        console.log('Found ViewModel at line', i + 1, ':', lines[i]);
        break;
    }
}

if (vmStart >= 0) {
    // Replace the constructor line
    if (content.includes(searchOldConstructor)) {
        content = content.replace(searchOldConstructor, searchNewConstructor);
        console.log('Replaced ViewModel constructor with uploadRepo');
    } else {
        console.log('Constructor already modified or not found');
    }
}

// Find and replace the submit method
const oldSubmitStart = '    fun submit() {';
const oldSubmitEnd = '    }';
let submitStart = -1;
let submitBraceLevel = 0;
let inSubmit = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === oldSubmitStart.trim() && !inSubmit) {
        // Check if the previous lines match setTitle and setContent
        if (i >= 2 && lines[i-2].includes('setTitle') && lines[i-1].includes('setContent')) {
            submitStart = i;
            inSubmit = true;
        }
    }
    if (inSubmit) {
        const trimmed = lines[i].trim();
        for (const ch of trimmed) {
            if (ch === '{') submitBraceLevel++;
            if (ch === '}') submitBraceLevel--;
        }
        if (submitBraceLevel <= 0 && trimmed.startsWith('}')) {
            // This is the closing brace of submit
            // The ViewModel class closing brace is next
            var submitEnd = i;
            console.log('Found submit() method from line', submitStart+1, 'to', submitEnd+1);
            
            // Build new submit method
            var newSubmitLines = [
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
            ];
            
            // Splice: remove old submit method (including setTitle/setContent)
            var oldSubmitLines = lines.slice(submitStart - 2, submitEnd + 1);
            console.log('Removing old submit: lines', submitStart-1, 'to', submitEnd+1);
            
            var beforePart = lines.slice(0, submitStart - 2).join('\n');
            var afterPart = lines.slice(submitEnd + 1).join('\n');
            content = beforePart + '\n' + newSubmitLines.join('\n') + '\n' + afterPart;
            
            console.log('Replaced submit method with image upload support');
            break;
        }
    }
}

// Save
fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved successfully');
