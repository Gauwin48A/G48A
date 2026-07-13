const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let c = fs.readFileSync(fp, 'utf8');
let n = 0;

// ─── 1. Add createDemoUser function after logout() ──
const logTag = '    fun logout(onDone: () -> Unit) {\n        viewModelScope.launch { repo.logout(); onDone() }\n    }\n\n    fun shareProfile';
const demoTarget = '    fun logout(onDone: () -> Unit) {\n        viewModelScope.launch { repo.logout(); onDone() }\n    }\n\n    private fun createDemoUser(): User {\n        return User(\n            id = "demo_user",\n            userId = "demo_user",\n            fullName = "Demo User",\n            phone = "+91-9876543210",\n            email = "demo@mhub.app",\n            bio = "This is a demo account for preview purposes.",\n            username = "demo_user",\n            currentPlan = "premium",\n            kycStatus = null,\n            role = "seller",\n            pictureUrl = null,\n            coverImage = null,\n            rewardsRank = "DEMO",\n            isVerified = true,\n        )\n    }\n\n    fun shareProfile';
if (c.includes(logTag)) {
    c = c.replace(logTag, demoTarget);
    n++;
    console.log('1. Added createDemoUser() function');
} else console.log('1. ❌ logout+shareProfile pattern not found');

// ─── 2. Wire createDemoUser into load() ──
const unauthTag = '                                // If we have cached data, keep showing it and don\'t show full-screen error\n                                if (cachedProfile?.user != null) {\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),\n                                        isSessionExpired = expired,\n                                    )\n                                } else';
const unauthNew = '                                // Demo session check\n                                if (expired && repo.isDemoSession) {\n                                    val demoUser = createDemoUser()\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        user = demoUser, error = null, isSessionExpired = false,\n                                    )\n                                    cachedProfile = _state.value\n                                } else if (cachedProfile?.user != null) {\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false,\n                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),\n                                        isSessionExpired = expired,\n                                    )\n                                } else';
if (c.includes(unauthTag)) {
    c = c.replace(unauthTag, unauthNew);
    n++;
    console.log('2. Wired createDemoUser into load()');
} else console.log('2. ❌ Unauthorized section pattern not found');

// ─── 3. Replace EditProfileDialog with EditProfileScreen ──
const editTag = '                    // Edit Profile Dialog\n                    if (showEditDialog) {\n                        EditProfileDialog(\n                            user = user,\n                            saving = state.editSaving,\n                            saveError = state.editError,\n                            onDismiss = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            onSave = { name: String?, phone: String?, bio: String? ->\n                                viewModel.updateProfile(name, phone, bio) { showEditDialog = false }\n                            },\n                        )\n                    }';
const editNew = '                    // Edit Profile Screen\n                    if (showEditDialog) {\n                        androidx.compose.ui.window.Dialog(\n                            onDismissRequest = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),\n                        ) {\n                            EditProfileScreen(\n                                user = user,\n                                saving = state.editSaving,\n                                saveError = state.editError,\n                                initialLocation = prefs?.location ?: "",\n                                initialMinPrice = prefs?.minPrice,\n                                initialMaxPrice = prefs?.maxPrice,\n                                initialCategories = prefs?.categories.orEmpty(),\n                                onDismiss = {\n                                    showEditDialog = false\n                                    viewModel.clearEditResult()\n                                },\n                                onSave = { name, phone, bio, loc, links, minP, maxP, cats ->\n                                    viewModel.saveFullProfile(name, phone, bio, loc, links, minP, maxP, cats)\n                                },\n                                onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },\n                                onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },\n                            )\n                        }\n                    }';
function braces(s) { let o=0,cl=0; for(let ch of s) { if(ch==='{') o++; if(ch==='}') cl++; } return o-cl; }
console.log(`EditProfile braces: old=${braces(editTag)}, new=${braces(editNew)}`);
if (c.includes(editTag)) {
    if (braces(editTag) === braces(editNew)) {
        c = c.replace(editTag, editNew);
        n++;
        console.log('3. Replaced EditProfileDialog with EditProfileScreen');
    } else console.log('3. ❌ Brace mismatch');
} else console.log('3. ❌ EditProfileDialog call pattern not found');

// ─── 4. Add saveFullProfile after updateProfile ──
const updTag = '    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {\n        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)\n        viewModelScope.launch {\n            when (val result = rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {\n                is ApiResult.Success -> {\n                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!", editError = null)\n                    // Refresh user data\n                    when (val result = repo.me()) {\n                        is ApiResult.Success -> _state.value = _state.value.copy(user = result.data)\n                        is ApiResult.Failure -> {}\n                    }\n                    onDone()\n                }\n                is ApiResult.Failure -> _state.value = _state.value.copy(\n                    editSaving = false,\n                    editError = result.error.userFacingMessage("save your profile"),\n                )\n            }\n        }\n    }\n\n';
const saveFull = '    // ── Full profile save (for EditProfileScreen) ──\n    fun saveFullProfile(\n        fullName: String?, phone: String?, bio: String?,\n        location: String?, socialLinks: Map<String, String>?,\n        minPrice: Int?, maxPrice: Int?, categories: List<String>?,\n    ) {\n        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)\n        viewModelScope.launch {\n            when (val r = rewardsRepo.updateProfile(\n                com.mhub.app.data.remote.dto.ProfileUpdateRequest(\n                    fullName = fullName, phone = phone, bio = bio,\n                    socialLinks = socialLinks,\n                )\n            )) {\n                is ApiResult.Success -> {\n                    if (location != null || categories != null || minPrice != null || maxPrice != null) {\n                        try {\n                            api.updatePreferences(\n                                com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                                    location = location ?: "",\n                                    minPrice = minPrice, maxPrice = maxPrice,\n                                    categories = categories,\n                                )\n                            )\n                        } catch (_: Exception) { }\n                    }\n                    when (val me = repo.me()) {\n                        is ApiResult.Success -> _state.value = _state.value.copy(user = me.data)\n                        is ApiResult.Failure -> {}\n                    }\n                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!")\n                }\n                is ApiResult.Failure -> _state.value = _state.value.copy(\n                    editSaving = false,\n                    editError = r.error.userFacingMessage("save your profile"),\n                )\n            }\n        }\n    }\n\n';
if (c.includes(updTag)) {
    c = c.replace(updTag, saveFull);
    n++;
    console.log('4. Replaced updateProfile with saveFullProfile');
} else console.log('4. ❌ updateProfile pattern not found');

// ─── 5. Remove stale params ──
for (let p of ['onOpenChat', 'onOpenOffers', 'onOpenMyFeed', 'onOpenReviews']) {
    const pat = '    ' + p + ': () -> Unit = {},\n';
    if (c.includes(pat)) { c = c.replace(pat, ''); n++; console.log('5. Removed param: ' + p); }
}
// onOpenReviews has (String) pattern
const revPat = '    onOpenReviews: (String) -> Unit = {},\n';
if (c.includes(revPat)) { c = c.replace(revPat, ''); n++; console.log('5. Removed param: onOpenReviews'); }

// ─── 6. Remove loadReviews and related dead code ──
// Find and remove the loadReviews section
const lrStart = c.indexOf('    // ── Reviews loading ──');
const lrEnd = c.indexOf('\n    // ── Full profile save', lrStart);
if (lrStart >= 0 && lrEnd > lrStart) {
    c = c.substring(0, lrStart) + c.substring(lrEnd);
    n++;
    console.log('6. Removed loadReviews section');
}

// Remove reviews field from ProfileState
const revField = '    val reviews: List<UserReview> = emptyList(),\n';
if (c.includes(revField)) { c = c.replace(revField, ''); n++; console.log('6. Removed reviews from ProfileState'); }

// Remove UserReview data class
const urClass = '\ndata class UserReview(\n    val id: String,\n    val reviewerName: String,\n    val reviewerAvatar: String?,\n    val rating: Int,\n    val message: String,\n    val date: String,\n)\n';
if (c.includes(urClass)) { c = c.replace(urClass, '\n'); n++; console.log('6. Removed UserReview data class'); }

// ─── 7. Remove loadReviews LaunchedEffect ──
const lrEffect = 'LaunchedEffect(state.user?.id) { viewModel.loadReviews() }';
if (c.includes(lrEffect)) { c = c.replace(lrEffect + '\n', ''); n++; console.log('7. Removed loadReviews LaunchedEffect'); }

// ─── Write ──
fs.writeFileSync(fp, c, 'utf8');
console.log(`\n✅ ${n} changes applied`);
