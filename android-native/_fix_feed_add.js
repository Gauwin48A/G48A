const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt');
let content = fs.readFileSync(filePath, 'utf8');
let count = 0;

// 1. Add missing imports after existing import line
const importMarker = "import androidx.compose.ui.platform.LocalClipboardManager\nimport androidx.compose.ui.res.stringResource";
const newImports = "import android.net.Uri\nimport androidx.activity.compose.rememberLauncherForActivityResult\nimport androidx.activity.result.PickVisualMediaRequest\nimport androidx.activity.result.contract.ActivityResultContracts\nimport androidx.compose.foundation.border\nimport androidx.compose.foundation.lazy.LazyRow\nimport androidx.compose.foundation.lazy.items\nimport androidx.compose.ui.layout.ContentScale\nimport coil.compose.AsyncImage";
if (content.includes(importMarker)) {
    content = content.replace(importMarker, importMarker + '\n' + newImports);
    count++;
    console.log('1. Added imports');
}

// 2. Replace FeedPostAddUiState
const oldState = 'data class FeedPostAddUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val title: String = "", val content: String = "")';
const newState = [
    'data class FeedPostAddUiState(',
    '    val loading: Boolean = false,',
    '    val uploading: Boolean = false,',
    '    val error: String? = null,',
    '    val success: Boolean = false,',
    '    val title: String = "",',
    '    val content: String = "",',
    '    val imageUris: List<Uri> = emptyList(),',
    ')'
].join('\n');
if (content.includes(oldState)) {
    content = content.replace(oldState, newState);
    count++;
    console.log('2. Replaced FeedPostAddUiState');
} else {
    console.error('ERROR: Could not find old FeedPostAddUiState');
}

// 3. Replace ViewModel constructor
const oldConstructor = '@HiltViewModel\nclass FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {';
const newConstructor = [
    '@HiltViewModel',
    'class FeedPostAddViewModel @Inject constructor(',
    '    private val repo: SocialRepository,',
    '    private val uploadRepo: UploadRepository,',
    ') : ViewModel() {'
].join('\n');
if (content.includes(oldConstructor)) {
    content = content.replace(oldConstructor, newConstructor);
    count++;
    console.log('3. Replaced ViewModel constructor');
} else {
    console.error('ERROR: Could not find old ViewModel constructor');
}

// 4. Replace submit method with image upload
const oldSubmitMethod = [
    '    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v) }',
    '    fun setContent(v: String) { if (v.length <= 500) _state.value = _state.value.copy(content = v) }',
    '    fun submit() {',
    '        val s = _state.value',
    '        if (s.content.length < 5) { _state.value = s.copy(error = "Content must be at least 5 characters"); return }',
    '        _state.value = s.copy(loading = true, error = null)',
    '        val desc = if (s.title.isNotBlank()) "$' + '{s.title}\\n\\n$' + '{s.content}" else s.content',
    '        viewModelScope.launch {',
    '            when (val r = repo.createPost(CreateFeedRequest(content = desc))) {',
    '                is ApiResult.Success -> _state.value = FeedPostAddUiState(success = true)',
    '                is ApiResult.Failure -> _state.value = s.copy(loading = false, error = r.error.message)',
    '            }',
    '        }',
    '    }'
].join('\n');

const newSubmitMethod = [
    '    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v) }',
    '    fun setContent(v: String) { if (v.length <= 500) _state.value = _state.value.copy(content = v) }',
    '    fun setImages(uris: List<Uri>) { _state.value = _state.value.copy(imageUris = uris) }',
    '    fun submit(bytesProvider: ((Uri) -> Pair<ByteArray, String>?)? = null) {',
    '        val s = _state.value',
    '        if (s.content.length < 5) { _state.value = s.copy(error = "Content must be at least 5 characters"); return }',
    '        _state.value = s.copy(loading = true, error = null)',
    '        val desc = if (s.title.isNotBlank()) "$' + '{s.title}\\n\\n$' + '{s.content}" else s.content',
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
    '                            _state.value = s.copy(loading = false, uploading = false, error = "Image upload failed: $' + '{result.error.message}")',
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
    '    }'
].join('\n');

if (content.includes(oldSubmitMethod)) {
    content = content.replace(oldSubmitMethod, newSubmitMethod);
    count++;
    console.log('4. Replaced submit() method with image upload');
} else {
    console.error('ERROR: Could not find old submit() method');
    console.error('Trying alternative...');
}

// 5. Replace FeedPostAddScreen composable function header
const oldScreenHeader = '@Composable\nfun FeedPostAddScreen(onBack: () -> Unit, viewModel: FeedPostAddViewModel = hiltViewModel()) {\n    val state by viewModel.state.collectAsState()\n    LaunchedEffect(state.success) { if (state.success) onBack() }';
const newScreenHeader = [
    '@Composable',
    'fun FeedPostAddScreen(onBack: () -> Unit, viewModel: FeedPostAddViewModel = hiltViewModel()) {',
    '    val state by viewModel.state.collectAsState()',
    '    val context = LocalContext.current',
    '    LaunchedEffect(state.success) { if (state.success) onBack() }',
    '',
    '    val imagePicker = rememberLauncherForActivityResult(',
    '        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 6),',
    '    ) { uris: List<Uri> ->',
    '        if (uris.isNotEmpty()) viewModel.setImages(uris)',
    '    }'
].join('\n');

if (content.includes(oldScreenHeader)) {
    content = content.replace(oldScreenHeader, newScreenHeader);
    count++;
    console.log('5. Replaced screen header with image picker');
} else {
    console.error('ERROR: Could not find old screen header');
}

// 6. Replace submit button
const oldButtonLine = '                    onClick = { viewModel.submit() }, enabled = !state.loading && state.content.length >= 5,';
const newButtonLine = [
    '                    onClick = {',
    '                        viewModel.submit { uri ->',
    '                            runCatching {',
    '                                val resolver = context.contentResolver',
    '                                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }',
    '                                    ?: return@runCatching null',
    '                                val mime = resolver.getType(uri) ?: "image/jpeg"',
    '                                bytes to mime',
    '                            }.getOrNull()',
    '                        }',
    '                    },',
    '                    enabled = !state.loading && !state.uploading && state.content.length >= 5,',
].join('\n');

if (content.includes(oldButtonLine)) {
    content = content.replace(oldButtonLine, newButtonLine);
    count++;
    console.log('6. Replaced submit button onClick');
} else {
    console.error('ERROR: Could not find old button onClick');
}

// 7. Replace button content with loading indicator
const oldButtonContent = ") { Text(if (state.loading) \"Posting…\" else \"Post\", fontWeight = FontWeight.SemiBold) }";
const newButtonContent = [
    ') {',
    '                    if (state.loading || state.uploading) {',
    '                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)',
    '                        Spacer(Modifier.width(6.dp))',
    '                        Text(if (state.uploading) "Uploading…" else "Posting…", fontWeight = FontWeight.SemiBold)',
    '                    } else {',
    '                        Text("Post", fontWeight = FontWeight.SemiBold)',
    '                    }',
    '                }'
].join('\n');

if (content.includes(oldButtonContent)) {
    content = content.replace(oldButtonContent, newButtonContent);
    count++;
    console.log('7. Replaced button content with loading indicator');
} else {
    console.error('ERROR: Could not find old button content');
}

// 8. Replace Tip section with Image picker
const oldTipLines = [
    '                // Tip',
    '                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {',
    '                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {',
    '                        Icon(Icons.Filled.Info, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))',
    '                        Spacer(Modifier.width(8.dp))',
    '                        Text(stringResource(R.string.social_feed_text_only), fontSize = 12.sp, color = Color(0xFF2563EB))',
    '                    }',
    '                }'
].join('\n');

const newImagePickerSection = [
    '                // ── Image picker ──',
    '                Surface(',
    '                    onClick = { imagePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },',
    '                    shape = RoundedCornerShape(14.dp),',
    '                    color = Color(0xFFF0F9FF),',
    '                    modifier = Modifier.fillMaxWidth(),',
    '                ) {',
    '                    if (state.imageUris.isEmpty()) {',
    '                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {',
    '                            Icon(Icons.Filled.AddAPhoto, null, tint = Color(0xFF2563EB), modifier = Modifier.size(24.dp))',
    '                            Column {',
    '                                Text("Add Photos (optional)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))',
    '                                Text("Up to 6 images · JPG/PNG/WEBP", fontSize = 11.sp, color = Color(0xFF64748B))',
    '                            }',
    '                        }',
    '                    } else {',
    '                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {',
    '                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {',
    "                                Text(\"$' + '{state.imageUris.size} photo(s) selected\", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))",
    '                                TextButton(onClick = { imagePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) {',
    '                                    Text("Add more", fontSize = 12.sp)',
    '                                }',
    '                            }',
    '                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {',
    '                                items(state.imageUris.mapIndexed { i, u -> i to u }, key = { it.first }) { (idx, uri) ->',
    '                                    Box {',
    '                                        AsyncImage(',
    '                                            model = uri, contentDescription = null, contentScale = ContentScale.Crop,',
    '                                            modifier = Modifier.size(80.dp).clip(RoundedCornerShape(10.dp)),',
    '                                        )',
    '                                        Box(',
    '                                            Modifier.align(Alignment.TopEnd).padding(2.dp).size(18.dp).clip(CircleShape).background(Color(0xFFEF4444)).clickable {',
    '                                                val updated = state.imageUris.toMutableList().apply { removeAt(idx) }',
    '                                                viewModel.setImages(updated)',
    '                                            },',
    '                                            contentAlignment = Alignment.Center,',
    '                                        ) {',
    '                                            Icon(Icons.Filled.Close, null, tint = Color.White, modifier = Modifier.size(11.dp))',
    '                                        }',
    '                                    }',
    '                                }',
    '                            }',
    '                        }',
    '                    }',
    '                }'
].join('\n');

if (content.includes(oldTipLines)) {
    content = content.replace(oldTipLines, newImagePickerSection);
    count++;
    console.log('8. Replaced Tip section with Image picker');
} else {
    console.error('ERROR: Could not find old Tip section');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: All ' + count + ' changes applied!');
