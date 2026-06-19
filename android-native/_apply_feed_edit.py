#!/usr/bin/env python3
"""Apply feed post edit changes to SocialScreens.kt"""
import re

filepath = "app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace FeedPostAddUiState
old_state = "data class FeedPostAddUiState(val loading: Boolean = false, val error: String? = null, val success: Boolean = false, val title: String = \"\", val content: String = \"\")"
new_state = """data class FeedPostAddUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
    val title: String = "",
    val content: String = "",
    val editingId: String? = null,
    val isEdit: Boolean = false,
)"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print("1. FeedPostAddUiState replaced")
else:
    print("1. FeedPostAddUiState NOT FOUND")
    # Try to find it with different whitespace
    idx = content.find("data class FeedPostAddUiState")
    if idx >= 0:
        print(f"   Found at position {idx}")
        print(f"   Context: {content[idx:idx+200]}")

# 2. Replace FeedPostAddViewModel - add initForEdit and update submit
old_vm_start = "@HiltViewModel\nclass FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {"
new_vm_start = """@HiltViewModel
class FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedPostAddUiState())
    val state: StateFlow<FeedPostAddUiState> = _state.asStateFlow()

    fun initForEdit(item: FeedItem) {
        val title = item.title?.trim().orEmpty()
        val content = if (title.isNotBlank() && item.displayContent.startsWith(title)) {
            item.displayContent.removePrefix(title).trimStart('\n', ' ')
        } else {
            item.content?.trim() ?: item.description?.trim() ?: item.displayContent
        }
        _state.value = FeedPostAddUiState(
            title = title,
            content = if (title.isNotBlank() && title != content) content else item.displayContent,
            editingId = item.stableId,
            isEdit = true,
        )
    }

    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v) }
    fun setContent(v: String) { if (v.length <= 2000) _state.value = _state.value.copy(content = v) }

    fun submit() {
        val s = _state.value
        if (s.content.length < 5) { _state.value = s.copy(error = "Content must be at least 5 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        val desc = if (s.title.isNotBlank()) "${s.title}\n\n${s.content}" else s.content
        viewModelScope.launch {
            if (s.isEdit && s.editingId != null) {
                when (val r = repo.updatePost(s.editingId, CreateFeedRequest(content = desc))) {
                    is ApiResult.Success -> {
                        com.mhub.app.core.ContentRefreshBus.feedPublished()
                        _state.value = FeedPostAddUiState(success = true)
                    }
                    is ApiResult.Failure -> {
                        _state.value = s.copy(loading = false, error = r.error.message ?: "Failed to update post. Please try again.")
                    }
                }
            } else {
                when (val r = repo.createPost(CreateFeedRequest(content = desc))) {
                    is ApiResult.Success -> {
                        com.mhub.app.core.ContentRefreshBus.feedPublished()
                        _state.value = FeedPostAddUiState(success = true)
                    }
                    is ApiResult.Failure -> {
                        _state.value = s.copy(loading = false, error = r.error.message ?: "Failed to publish post. Please try again.")
                    }
                }
            }
        }
    }
}"""

old_vm_full = """@HiltViewModel
class FeedPostAddViewModel @Inject constructor(private val repo: SocialRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedPostAddUiState())
    val state: StateFlow<FeedPostAddUiState> = _state.asStateFlow()
    fun setTitle(v: String) { if (v.length <= 200) _state.value = _state.value.copy(title = v) }
    fun setContent(v: String) { if (v.length <= 2000) _state.value = _state.value.copy(content = v) }
    fun submit() {
        val s = _state.value
        if (s.content.length < 5) { _state.value = s.copy(error = "Content must be at least 5 characters"); return }
        _state.value = s.copy(loading = true, error = null)
        val desc = if (s.title.isNotBlank()) "${s.title}\\n\\n${s.content}" else s.content
        viewModelScope.launch {
            when (val r = repo.createPost(CreateFeedRequest(content = desc))) {
                is ApiResult.Success -> {
                    com.mhub.app.core.ContentRefreshBus.feedPublished()
                    _state.value = FeedPostAddUiState(success = true)
                }
                is ApiResult.Failure -> {
                    _state.value = s.copy(loading = false, error = r.error.message ?: "Failed to publish post. Please try again.")
                }
            }
        }
    }
}"""

# Try direct replacement first
if old_vm_full in content:
    content = content.replace(old_vm_full, new_vm_start)
    print("2. FeedPostAddViewModel replaced (full match)")
else:
    print("2. Full VM match failed, looking for partial...")
    # Find the VM section and replace it
    idx_start = content.find(old_vm_start)
    if idx_start >= 0:
        # Find the end of the VM class (next @Composable or // comment)
        idx_end = content.find("}", idx_start + 50)
        # Find the 3rd closing brace for the class
        brace_count = 0
        search_idx = idx_start
        for i in range(3):
            idx = content.find("}", search_idx)
            if idx >= 0:
                brace_count = idx
                search_idx = idx + 1
        if brace_count > idx_start:
            print(f"   Found VM from {idx_start} to {brace_count}")
            before = content[:idx_start]
            after = content[brace_count+1:]
            content = before + new_vm_start + after
            print("2. FeedPostAddViewModel replaced (partial match)")
        else:
            print("   Could not find end of VM class")
    else:
        print("2. VM start NOT FOUND")

# 3. Add isEdit variable and update FeedPostAddScreen
# Find where isEdit = state.isEdit should go
old_edit_line = 'LaunchedEffect(state.success) { if (state.success) onBack() }'
new_edit_line = 'LaunchedEffect(state.success) { if (state.success) onBack() }\n    val isEdit = state.isEdit'
if old_edit_line in content:
    content = content.replace(old_edit_line + '\n    Box(', new_edit_line + '\n    Box(', 1)
    print("3. isEdit variable added")
else:
    print("3. LaunchedEffect NOT FOUND")

# 4. Update header title
old_title = 'Text("Share Knowledge", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))'
new_title = 'Text(if (isEdit) "Edit Knowledge Post" else "Share Knowledge", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))'
if old_title in content:
    content = content.replace(old_title, new_title, 1)
    print("4. Header title updated")
else:
    print("4. Header title NOT FOUND")

# 5. Update button text
old_btn = '}  else \"Post\", fontWeight = FontWeight.SemiBold) }'
# Actually let me look at the exact button text
btn_idx = content.find('if (state.loading) "Posting')
if btn_idx >= 0:
    btn_end = content.find(')', btn_idx)
    old_btn_text = content[btn_idx:btn_end + 1]
    print(f"5. Found button text: {old_btn_text}")
    # Replace with new text
    new_btn_text = 'if (state.loading) (if (isEdit) "Updating\\u2026" else "Posting\\u2026") else if (isEdit) "Update" else "Post"'
    content = content.replace(old_btn_text, new_btn_text, 1)
    print("5. Button text updated")
else:
    print("5. Button text NOT FOUND")

# 6. Add edit badge / keep tip but show edit badge when editing
old_tip = """// Tip
                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Info, null, tint = Color(0xFF6366F1), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Share news, tips, or knowledge with the community.", fontSize = 12.sp, color = Color(0xFF6366F1))
                    }
                }"""

new_tip = """// Edit badge
                if (isEdit) {
                    Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFFEF3C7), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Edit, null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("You are editing an existing post. Changes will be updated immediately.", fontSize = 12.sp, color = Color(0xFF92400E))
                        }
                    }
                } else {
                    // Tip (only show for new posts)
                    Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Info, null, tint = Color(0xFF6366F1), modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Share news, tips, or knowledge with the community.", fontSize = 12.sp, color = Color(0xFF6366F1))
                        }
                    }
                }"""

if old_tip in content:
    content = content.replace(old_tip, new_tip, 1)
    print("6. Edit badge added")
else:
    print("6. Tip section NOT FOUND, trying alternative...")
    # The file may use single or different spacing
    # Try to find "Tip" comment
    tip_idx = content.find("// Tip")
    if tip_idx >= 0:
        print(f"   '// Tip' found at position {tip_idx}")
        nxt = content[tip_idx:tip_idx + 500]
        print(f"   Context: {nxt[:200]}")

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
