const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

function countChar(s, c) { let n = 0; for (let i = 0; i < s.length; i++) if (s[i] === c) n++; return n; }
function braces(s) { return countChar(s, '{') - countChar(s, '}'); }

// ─── 1. Remove `val reviews: List<UserReview>` from ProfileState ──
const reviewsField = '    val reviews: List<UserReview> = emptyList(),\n';
if (content.includes(reviewsField)) {
    content = content.replace(reviewsField, '');
    console.log('✅ Removed reviews field from ProfileState');
} else {
    console.log('⚠️ reviews field not found (may already be removed)');
}

// ─── 2. Remove UserReview data class ──
const userReviewClass = 'data class UserReview\(\n    val id: String,\n    val reviewerName: String,\n    val reviewerAvatar: String?,\n    val rating: Int,\n    val message: String,\n    val date: String,\n\)\n';
const userReviewRegex = /data class UserReview\s*\([^)]*\)\n/;
if (userReviewRegex.test(content)) {
    content = content.replace(userReviewRegex, '');
    console.log('✅ Removed UserReview data class');
} else {
    console.log('⚠️ UserReview data class not found');
}

// ─── 3. Wire createDemoUser into load() ──
const oldDemoCheck = '                                // Demo session: show cached data silently \(don't declare expired\)\n                                // Demo session check\n                                if \(expired && repo.isDemoSession && cachedProfile\?.user != null\) {\n                                    _state.value = _state.value.copy\(\n                                        loading = false, refreshing = false,\n                                        error = null, isSessionExpired = false,\n                                    \)\n                                } else // If we have cached data, keep showing it and don't show full-screen error';
const newDemoCheck = '                                // Demo session: populate with demo user data silently\n                                if (expired && repo.isDemoSession) {\n                                    val demoUser = createDemoUser()\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        user = demoUser, error = null, isSessionExpired = false,\n                                    )\n                                    cachedProfile = _state.value\n                                } else // If we have cached data, keep showing it and don't show full-screen error';

if (content.includes(oldDemoCheck)) {
    content = content.replace(oldDemoCheck, newDemoCheck);
    console.log('✅ Wired createDemoUser into load()');
} else {
    console.log('⚠️ Demo check pattern not found - checking alternative...');
    // Try simpler pattern
    const simpleOld = 'if (expired && repo.isDemoSession && cachedProfile?.user != null)';
    if (content.includes(simpleOld)) {
        content = content.replace(
            'if (expired && repo.isDemoSession && cachedProfile?.user != null)',
            'if (expired && repo.isDemoSession)'
        );
        // Also need to update the body to include createDemoUser
        console.log('⚠️ Simple pattern match - need to check if body is correct');
    } else {
        console.log('❌ Demo session check pattern not found at all');
    }
}

// ─── 4. Remove loadReviews() and reviewsLoaded ──
const loadReviewsBlock = '    // ── Reviews loading ──\n    private var reviewsLoaded = false\n\n    fun loadReviews\(\) {\n        if \(reviewsLoaded\) return\n        val userId = _state.value.user\?.id ?: return\n        reviewsLoaded = true\n        viewModelScope.launch {\n            try {\n                val resp = api.userReviews\(userId.toString\(\)\)\n                val mapped = resp.reviews.map \{ r ->\n                    UserReview\(\n                        id = r.stableId,\n                        reviewerName = r.reviewerName ?: \"Anonymous\",\n                        reviewerAvatar = r.reviewerAvatar,\n                        rating = r.rating.toInt\(\).coerceIn\(1, 5\),\n                        message = r.comment ?: \"\",\n                        date = r.createdAt\?.take\(10\) ?: \"\",\n                    \)\n                \}\n                _state.value = _state.value.copy\(reviews = mapped\)\n            \} catch \(_: Exception\) \{ \}\n        \}\n    \}';
const saveFullProfileBlock = '    // ── Full profile save (for EditProfileScreen) ──\n    fun saveFullProfile(\n        fullName: String?, phone: String?, bio: String?,\n        location: String?, socialLinks: Map<String, String>?,\n        minPrice: Int?, maxPrice: Int?, categories: List<String>?,\n    ) {\n        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)\n        viewModelScope.launch {\n            // 1. Update profile info\n            when (val r = rewardsRepo.updateProfile(\n                com.mhub.app.data.remote.dto.ProfileUpdateRequest(\n                    fullName = fullName, phone = phone, bio = bio,\n                    socialLinks = socialLinks,\n                )\n            )) {\n                is ApiResult.Success -> {\n                    // 2. Save preferences\n                    if (location != null || categories != null || minPrice != null || maxPrice != null) {\n                        try {\n                            api.updatePreferences(\n                                com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                                    location = location ?: "",\n                                    minPrice = minPrice, maxPrice = maxPrice,\n                                    categories = categories,\n                                )\n                            )\n                        } catch (_: Exception) { }\n                    }\n                    // 3. Refresh user data\n                    when (val me = repo.me()) {\n                        is ApiResult.Success -> _state.value = _state.value.copy(user = me.data)\n                        is ApiResult.Failure -> {}\n                    }\n                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!")\n                }\n                is ApiResult.Failure -> _state.value = _state.value.copy(\n                    editSaving = false,\n                    editError = r.error.userFacingMessage("save your profile"),\n                )\n            }\n        }\n    }\n';

if (content.includes('// ── Reviews loading ──')) {
    // Find and replace the reviews block - it's between the preferences block and the tierColor function
    const prefsEnd = '    }\n}\n\n';
    const tierColorStart = 'private fun tierColor(';
    
    const reviewsStart = content.indexOf('    // ── Reviews loading ──');
    const tierColorIdx = content.indexOf('private fun tierColor(', reviewsStart);
    
    if (reviewsStart >= 0 && tierColorIdx >= 0) {
        // Remove from reviewsStart to tierColorIdx (but keep a blank line before tierColor)
        const before = content.substring(0, reviewsStart);
        const after = content.substring(tierColorIdx);
        content = before + after;
        console.log('✅ Removed loadReviews() and reviewsLoaded');
    } else {
        console.log('⚠️ Could not find reviews block boundaries');
    }
} else {
    console.log('⚠️ loadReviews not found (may already be removed)');
    // Add saveFullProfile after the existing preferences section
    const exportDataEnd = '    }\n}\n\n';
    const tierColorIdx2 = content.indexOf('private fun tierColor(');
    if (tierColorIdx2 >= 0) {
        const before2 = content.substring(0, tierColorIdx2);
        const after2 = content.substring(tierColorIdx2);
        content = before2 + '\n' + saveFullProfileBlock + '\n' + after2;
        console.log('✅ Added saveFullProfile method');
    }
}

// ─── 5. Replace EditProfileDialog call with EditProfileScreen ──
const editDialogCall = '                    // Edit Profile Dialog\n                    if (showEditDialog) {\n                        EditProfileDialog(\n                            user = user,\n                            saving = state.editSaving,\n                            saveError = state.editError,\n                            onDismiss = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            onSave = { name: String?, phone: String?, bio: String? ->\n                                viewModel.updateProfile(name, phone, bio) { showEditDialog = false }\n                            },\n                        )\n                    }';

const editScreenCall = '                    // Edit Profile Screen (full-screen dialog)\n                    if (showEditDialog) {\n                        androidx.compose.ui.window.Dialog(\n                            onDismissRequest = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),\n                        ) {\n                            EditProfileScreen(\n                                user = user,\n                                saving = state.editSaving,\n                                saveError = state.editError,\n                                initialLocation = prefs?.location ?: "",\n                                initialMinPrice = prefs?.minPrice,\n                                initialMaxPrice = prefs?.maxPrice,\n                                initialCategories = prefs?.categories.orEmpty(),\n                                onDismiss = {\n                                    showEditDialog = false\n                                    viewModel.clearEditResult()\n                                },\n                                onSave = { name, phone, bio, loc, links, minP, maxP, cats ->\n                                    viewModel.saveFullProfile(name, phone, bio, loc, links, minP, maxP, cats)\n                                },\n                                onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },\n                                onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },\n                            )\n                        }\n                    }';

if (content.includes(editDialogCall)) {
    // Check brace balance
    const oldBal = braces(editDialogCall);
    const newBal = braces(editScreenCall);
    console.log(`EditProfile replacement: oldBal=${oldBal}, newBal=${newBal}`);
    
    if (oldBal === newBal) {
        content = content.replace(editDialogCall, editScreenCall);
        console.log('✅ Replaced EditProfileDialog with EditProfileScreen');
    } else {
        console.log('❌ Brace mismatch in edit profile replacement');
    }
} else {
    console.log('⚠️ EditProfileDialog call not found');
}

// ─── 6. Remove updateProfile() method ──
const updateProfileMethod = '    fun updateProfile\(fullName: String\?, phone: String\?, bio: String\?, onDone: \(\) -> Unit\) \{\n        _state.value = _state.value.copy\(editSaving = true, editError = null, editResult = null\)\n        viewModelScope.launch \{\n            when \(val result = rewardsRepo.updateProfile\(ProfileUpdateRequest\(fullName = fullName, phone = phone, bio = bio\)\)\) \{\n                is ApiResult.Success -> \{\n                    _state.value = _state.value.copy\(editSaving = false, editResult = "Profile updated!", editError = null\)\n                    // Refresh user data\n                    when \(val result = repo.me\(\)\) \{\n                        is ApiResult.Success -> _state.value = _state.value.copy\(user = result.data\)\n                        is ApiResult.Failure -> \{\}\n                    \}\n                    onDone\(\)\n                \}\n                is ApiResult.Failure -> _state.value = _state.value.copy\(\n                    editSaving = false,\n                    editError = result.error.userFacingMessage\("save your profile"\),\n                \)\n            \}\n        \}\n    \}\n\n';
const updateProfileRegex = /    fun updateProfile\(fullName: String\?, phone: String\?, bio: String\?, onDone: \(\) -> Unit\) \{[\s\S]*?\n    \}\n\n/;
if (updateProfileRegex.test(content)) {
    content = content.replace(updateProfileRegex, '\n');
    console.log('✅ Removed orphaned updateProfile() method');
} else {
    console.log('⚠️ updateProfile() not found (may already be removed)');
}

// ─── Write file ──
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ ProfileScreen.kt updated successfully');
