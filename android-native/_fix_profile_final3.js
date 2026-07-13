const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

function countChar(s, c) { let n = 0; for (let i = 0; i < s.length; i++) if (s[i] === c) n++; return n; }
function braces(s) { return countChar(s, '{') - countChar(s, '}'); }

let changes = 0;

// ─── 1. Remove `val reviews: List<UserReview>` from ProfileState ──
if (content.includes('val reviews: List<UserReview>')) {
    content = content.replace('    val reviews: List<UserReview> = emptyList(),\n', '');
    console.log('1. Removed reviews field from ProfileState');
    changes++;
}

// ─── 2. Remove UserReview data class ──
// Find "data class UserReview(" and remove up to the matching closing paren
const userReviewStart = content.indexOf('\ndata class UserReview(');
if (userReviewStart >= 0) {
    // Find the matching closing paren
    let depth = 0;
    let endIdx = userReviewStart;
    for (let i = userReviewStart; i < content.length; i++) {
        if (content[i] === '(') depth++;
        if (content[i] === ')') {
            depth--;
            if (depth === 0) { endIdx = i + 1; break; }
        }
    }
    // Remove from newline before 'data class' to after the closing paren + newline
    const removeEnd = content.indexOf('\n', endIdx);
    const removeLen = removeEnd >= 0 ? removeEnd - userReviewStart : endIdx - userReviewStart + 1;
    content = content.substring(0, userReviewStart) + '\n' + content.substring(userReviewStart + removeLen + 1);
    console.log('2. Removed UserReview data class');
    changes++;
}

// ─── 3. Wire createDemoUser into load() ──
// Find and replace the demo session check
const demoPattern1 = '                                // Demo session: show cached data silently (don\'t declare expired)\n                                // Demo session check\n                                if (expired && repo.isDemoSession && cachedProfile?.user != null) {\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        error = null, isSessionExpired = false,\n                                    )\n                                } else // If we have cached data, keep showing it and don\'t show full-screen error';
const demoReplacement = '                                // Demo session: populate with demo user data silently\n                                if (expired && repo.isDemoSession) {\n                                    val demoUser = createDemoUser()\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        user = demoUser, error = null, isSessionExpired = false,\n                                    )\n                                    cachedProfile = _state.value\n                                } else // If we have cached data, keep showing it and don\'t show full-screen error';

if (content.includes(demoPattern1)) {
    content = content.replace(demoPattern1, demoReplacement);
    console.log('3. Wired createDemoUser into load()');
    changes++;
} else {
    console.log('3. ⚠️ Demo check pattern not found - trying simpler match');
    const simplePattern = 'if (expired && repo.isDemoSession && cachedProfile?.user != null)';
    if (content.includes(simplePattern)) {
        content = content.replace(simplePattern, 'if (expired && repo.isDemoSession)');
        console.log('3. Updated demo check condition (simpler match)');
        changes++;
    }
}

// ─── 4. Add createDemoUser() function after logout() ──
const createDemoFunc = `\n    private fun createDemoUser(): User {
        return User(
            id = "demo_user",
            userId = "demo_user",
            fullName = "Demo User",
            phone = "+91-9876543210",
            email = "demo@mhub.app",
            bio = "This is a demo account for preview purposes.",
            username = "demo_user",
            currentPlan = "premium",
            kycStatus = null,
            role = "seller",
            pictureUrl = null,
            coverImage = null,
            rewardsRank = "DEMO",
            isVerified = true,
        )
    }`;

if (!content.includes('private fun createDemoUser()')) {
    // Add after logout() function - find the closing } of logout() followed by \n\n
    const logoutEnd = content.indexOf('    fun logout(onDone: () -> Unit) {');
    if (logoutEnd >= 0) {
        // Find the closing brace of logout (matching indent)
        const afterLogout = content.indexOf('\n    }\n\n    private fun', logoutEnd);
        const insertAt = afterLogout >= 0 ? afterLogout + 8 : content.indexOf('\n    fun shareProfile', logoutEnd);
        if (insertAt >= 0) {
            content = content.substring(0, insertAt) + createDemoFunc + '\n\n' + content.substring(insertAt);
            console.log('4. Added createDemoUser() function');
            changes++;
        } else {
            console.log('4. ⚠️ Could not find insert point for createDemoUser');
        }
    }
} else {
    console.log('4. createDemoUser() already exists');
}

// ─── 5. Remove loadReviews()/reviewsLoaded, add saveFullProfile() ──
const reviewsSection = '    // ── Reviews loading ──\n    private var reviewsLoaded = false\n\n    fun loadReviews() {\n        if (reviewsLoaded) return\n        val userId = _state.value.user?.id ?: return\n        reviewsLoaded = true\n        viewModelScope.launch {\n            try {\n                val resp = api.userReviews(userId.toString())\n                val mapped = resp.reviews.map { r ->\n                    UserReview(\n                        id = r.stableId,\n                        reviewerName = r.reviewerName ?: "Anonymous",\n                        reviewerAvatar = r.reviewerAvatar,\n                        rating = r.rating.toInt().coerceIn(1, 5),\n                        message = r.comment ?: "",\n                        date = r.createdAt?.take(10) ?: "",\n                    )\n                }\n                _state.value = _state.value.copy(reviews = mapped)\n            } catch (_: Exception) { }\n        }\n    }';

if (content.includes(reviewsSection)) {
    content = content.replace(reviewsSection, '');
    console.log('5. Removed loadReviews() and reviewsLoaded');
    changes++;
} else {
    console.log('5. ⚠️ loadReviews() not found (may be partially removed)');
}

// Add saveFullProfile()
const saveFullFunc = `    // ── Full profile save (for EditProfileScreen) ──
    fun saveFullProfile(
        fullName: String?, phone: String?, bio: String?,
        location: String?, socialLinks: Map<String, String>?,
        minPrice: Int?, maxPrice: Int?, categories: List<String>?,
    ) {
        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)
        viewModelScope.launch {
            // 1. Update profile info
            when (val r = rewardsRepo.updateProfile(
                com.mhub.app.data.remote.dto.ProfileUpdateRequest(
                    fullName = fullName, phone = phone, bio = bio,
                    socialLinks = socialLinks,
                )
            )) {
                is ApiResult.Success -> {
                    // 2. Save preferences
                    if (location != null || categories != null || minPrice != null || maxPrice != null) {
                        try {
                            api.updatePreferences(
                                com.mhub.app.data.remote.dto.PreferencesUpdateRequest(
                                    location = location ?: "",
                                    minPrice = minPrice, maxPrice = maxPrice,
                                    categories = categories,
                                )
                            )
                        } catch (_: Exception) { }
                    }
                    // 3. Refresh user data
                    when (val me = repo.me()) {
                        is ApiResult.Success -> _state.value = _state.value.copy(user = me.data)
                        is ApiResult.Failure -> {}
                    }
                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!")
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    editSaving = false,
                    editError = r.error.userFacingMessage("save your profile"),
                )
            }
        }
    }`;

if (!content.includes('saveFullProfile')) {
    // Find the end of the savePreferences function (before the reviews section)
    const prefsEnd = '            }\n        }\n    }\n\n';
    const afterSavePrefs = content.indexOf('\n    private fun tierColor(', content.indexOf('fun savePreferences'));
    if (afterSavePrefs >= 0) {
        content = content.substring(0, afterSavePrefs) + '\n' + saveFullFunc + '\n\n' + content.substring(afterSavePrefs);
        console.log('5b. Added saveFullProfile() method');
        changes++;
    } else {
        console.log('5b. ⚠️ Could not find insert point for saveFullProfile');
    }
} else {
    console.log('5b. saveFullProfile() already exists');
}

// ─── 6. Replace EditProfileDialog call with EditProfileScreen ──
const editOld = '                    // Edit Profile Dialog\n                    if (showEditDialog) {\n                        EditProfileDialog(\n                            user = user,\n                            saving = state.editSaving,\n                            saveError = state.editError,\n                            onDismiss = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            onSave = { name: String?, phone: String?, bio: String? ->\n                                viewModel.updateProfile(name, phone, bio) { showEditDialog = false }\n                            },\n                        )\n                    }';

const editNew = '                    // Edit Profile Screen (full-screen dialog)\n                    if (showEditDialog) {\n                        androidx.compose.ui.window.Dialog(\n                            onDismissRequest = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),\n                        ) {\n                            EditProfileScreen(\n                                user = user,\n                                saving = state.editSaving,\n                                saveError = state.editError,\n                                initialLocation = prefs?.location ?: "",\n                                initialMinPrice = prefs?.minPrice,\n                                initialMaxPrice = prefs?.maxPrice,\n                                initialCategories = prefs?.categories.orEmpty(),\n                                onDismiss = {\n                                    showEditDialog = false\n                                    viewModel.clearEditResult()\n                                },\n                                onSave = { name, phone, bio, loc, links, minP, maxP, cats ->\n                                    viewModel.saveFullProfile(name, phone, bio, loc, links, minP, maxP, cats)\n                                },\n                                onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },\n                                onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },\n                            )\n                        }\n                    }';

const oldBal = braces(editOld);
const newBal = braces(editNew);
console.log(`6. EditProfile replacement: old=${oldBal}, new=${newBal}`);

if (content.includes(editOld)) {
    if (oldBal === newBal) {
        content = content.replace(editOld, editNew);
        console.log('6. Replaced EditProfileDialog with EditProfileScreen');
        changes++;
    } else {
        console.log('6. ❌ Brace mismatch - not applying');
    }
} else {
    console.log('6. ⚠️ EditProfileDialog call not found');
}

// ─── 7. Remove orphaned updateProfile() method ──
const updateOld = '    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {\n        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)\n        viewModelScope.launch {\n            when (val result = rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {\n                is ApiResult.Success -> {\n                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!", editError = null)\n                    // Refresh user data\n                    when (val result = repo.me()) {\n                        is ApiResult.Success -> _state.value = _state.value.copy(user = result.data)\n                        is ApiResult.Failure -> {}\n                    }\n                    onDone()\n                }\n                is ApiResult.Failure -> _state.value = _state.value.copy(\n                    editSaving = false,\n                    editError = result.error.userFacingMessage("save your profile"),\n                )\n            }\n        }\n    }\n\n';

if (content.includes(updateOld)) {
    content = content.replace(updateOld, '\n');
    console.log('7. Removed orphaned updateProfile() method');
    changes++;
} else {
    console.log('7. ⚠️ updateProfile() not found');
}

// ─── Write file ──
if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\n✅ ${changes} changes applied to ProfileScreen.kt`);
} else {
    console.log('\n⚠️ No changes applied - patterns might need updating');
}
