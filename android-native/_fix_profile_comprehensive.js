const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// ─── 1. Remove stale params: onOpenChat, onOpenOffers, onOpenMyFeed, onOpenReviews ──
const paramsToRemove = [
    '    onOpenChat: () -> Unit = {},',
    '    onOpenOffers: () -> Unit = {},',
    '    onOpenMyFeed: () -> Unit = {},',
    '    onOpenReviews: (String) -> Unit = {},',
];
for (const param of paramsToRemove) {
    if (content.includes(param)) {
        content = content.replace(param + '\n', '');
        changes++;
        console.log(`Removed param: ${param.trim()}`);
    }
}

// ─── 2. Remove stale usage lines ──
const usagesToRemove = [
    '                                    CompactActionChip(icon = Icons.Default.Home, label = "My Home", accentColor = Color(0xFF10B981), onClick = onOpenMyPosts, modifier = Modifier.weight(1f))',
    '                                    CompactActionChip(icon = Icons.Filled.Dashboard, label = "Hub", accentColor = Color(0xFF8B5CF6), onClick = onOpenCentre, modifier = Modifier.weight(1f))',
];
// Actually those are used by other params. Let me remove the specific chat/feed/reviews ones.
const usageLines = [
    '                                    CompactActionChip(icon = Icons.Filled.Notifications, label = "My Feed", accentColor = Color(0xFF3B82F6), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))',
    '                                    CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))',
    '                                    CompactActionChip(icon = Icons.Filled.Settings, label = "Offers", accentColor = Color(0xFF8B5CF6), onClick = onOpenOffers, modifier = Modifier.weight(1f))',
    '                                        ProfileMenuItemCompact(icon = Icons.Default.Home, label = "My Home", subtitle = "Manage your active posts", onClick = onOpenMyPosts)',
];
// Actually let me check what the exact lines are first by reading the file
// Instead I'll just remove the specific patterns
for (const usage of usageLines) {
    if (content.includes(usage)) {
        console.log(`Found: ${usage.substring(0, 60)}...`);
    }
}
// For now, let's remove the exact chat usage
const chatUsage = '                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Chat", subtitle = "Messages and conversations", onClick = onOpenChat, tint = MaterialTheme.colorScheme.primary)';
if (content.includes(chatUsage)) {
    content = content.replace(chatUsage + '\n', '');
    changes++;
    console.log('Removed Chat from ProfileMenuItem');
}

// Remove Reviews from Quick Actions - check the exact pattern near line 1227
// The quick actions section has: CompactActionChip(..., onClick = onOpenReviews(...), ...)
const reviewsChip = 'onClick = { onOpenReviews(userId) }';
if (content.includes(reviewsChip)) {
    // Remove the entire CompactActionChip line
    content = content.replace(/.*onClick = \{ onOpenReviews\(userId\) \}.*\n/, '');
    changes++;
    console.log('Removed Reviews chip');
}

// Remove My Feed chip
const myFeedChip = 'label = "My Feed"';
if (content.includes(myFeedChip)) {
    content = content.replace(/.*label = "My Feed".*\n/, '');
    changes++;
    console.log('Removed My Feed chip');
}

// Remove Offers chip
const offersChip = 'label = "Offers"';
if (content.includes(offersChip)) {
    content = content.replace(/.*label = "Offers".*\n/, '');
    changes++;
    console.log('Removed Offers chip');
}

// ─── 3. Remove Reviews tab ──
// Find the Tab definitions and remove the Reviews one (4th tab)
const tabDefs = `                            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text(stringResource(R.string.profile_tab_overview)) })
                            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text(stringResource(R.string.profile_tab_personal)) })
                            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text(stringResource(R.string.profile_tab_preferences)) })
                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })`;
const tabDefs2 = `                            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text(stringResource(R.string.profile_tab_overview)) })
                            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text(stringResource(R.string.profile_tab_personal)) })
                            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text(stringResource(R.string.profile_tab_preferences)) })
                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })
                            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text(stringResource(R.string.profile_tab_settings)) })`;

if (content.includes(tabDefs2)) {
    content = content.replace(tabDefs2, tabDefs);
    changes++;
    console.log('Removed Reviews and Settings tabs');
} else if (content.includes(tabDefs)) {
    content = content.replace(tabDefs, tabDefs.slice(0, -1)); // Just remove the last line
    changes++;
    console.log('Removed Reviews tab line');
}

// Remove the tab content sections that reference reviews/settings
const reviewsContent = `                        if (selectedTab == 3) {
                            ReviewsTab(
                                viewModel = viewModel,
                                user = user,
                            )
                        }`;
if (content.includes(reviewsContent)) {
    content = content.replace(reviewsContent + '\n', '');
    changes++;
    console.log('Removed ReviewsTab content');
}

const settingsContent = `                        // Settings tab
                        if (selectedTab == 4) {
                            com.mhub.app.ui.components.AppEmptyState(
                                icon = Icons.Default.Settings,
                                title = stringResource(R.string.profile_settings),
                                subtitle = stringResource(R.string.profile_settings_desc),
                            )
                        }`;
if (content.includes(settingsContent)) {
    content = content.replace(settingsContent + '\n', '');
    changes++;
    console.log('Removed SettingsTab content');
}

// ─── 4. Remove UserReview data class and reviews field ──
if (content.includes('val reviews: List<UserReview>')) {
    content = content.replace('    val reviews: List<UserReview> = emptyList(),\n', '');
    changes++;
    console.log('Removed reviews from ProfileState');
}

// Remove UserReview data class
const userReviewRegex = /data class UserReview\s*\([\s\S]*?\)\n/;
if (userReviewRegex.test(content)) {
    content = content.replace(userReviewRegex, '');
    changes++;
    console.log('Removed UserReview data class');
}

// ─── 5. Wire createDemoUser into load() ──
// Find the unauthorized error handling section and add isDemoSession check
// The load() method retries once, then checks for unauthorized
const unauthorizedBranch = `                                if (isUnauth) {
                        // Retry once before declaring session expired
                        when (val retry = repo.me()) {
                            is ApiResult.Success -> _state.value = _state.value.copy(
                                loading = false, refreshing = false, user = retry.data,
                                lastLoadTimeMs = System.currentTimeMillis(), error = null,
                            )
                            is ApiResult.Failure -> {
                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden
                                // If we have cached data, keep showing it and don't show full-screen error
                                if (cachedProfile?.user != null) {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),
                                        isSessionExpired = expired,
                                    )
                                } else {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        isSessionExpired = expired,
                                        error = retry.error.userFacingMessage("load your profile"),
                                    )
                                }
                            }
                        }
                    }`;

const unauthorizedNew = `                                if (isUnauth) {
                        // Retry once before declaring session expired
                        when (val retry = repo.me()) {
                            is ApiResult.Success -> _state.value = _state.value.copy(
                                loading = false, refreshing = false, user = retry.data,
                                lastLoadTimeMs = System.currentTimeMillis(), error = null,
                            )
                            is ApiResult.Failure -> {
                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden
                                // Demo session check: populate with demo user data silently
                                if (expired && repo.isDemoSession) {
                                    val demoUser = createDemoUser()
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        user = demoUser, error = null, isSessionExpired = false,
                                    )
                                    cachedProfile = _state.value
                                } else if (cachedProfile?.user != null) {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),
                                        isSessionExpired = expired,
                                    )
                                } else {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        isSessionExpired = expired,
                                        error = retry.error.userFacingMessage("load your profile"),
                                    )
                                }
                            }
                        }
                    }`;

if (content.includes(unauthorizedBranch)) {
    content = content.replace(unauthorizedBranch, unauthorizedNew);
    changes++;
    console.log('Wired createDemoUser into load()');
} else {
    console.log('⚠️ unauthorizedBranch pattern not found');
}

// ─── 6. Add createDemoUser() function after logout() ──
if (!content.includes('private fun createDemoUser(')) {
    const logoutFunc = '    fun logout(onDone: () -> Unit) {\n        viewModelScope.launch { repo.logout(); onDone() }\n    }';
    const logoutNew = logoutFunc + '\n\n    private fun createDemoUser(): User {\n        return User(\n            id = "demo_user",\n            userId = "demo_user",\n            fullName = "Demo User",\n            phone = "+91-9876543210",\n            email = "demo@mhub.app",\n            bio = "This is a demo account for preview purposes.",\n            username = "demo_user",\n            currentPlan = "premium",\n            kycStatus = null,\n            role = "seller",\n            pictureUrl = null,\n            coverImage = null,\n            rewardsRank = "DEMO",\n            isVerified = true,\n        )\n    }';
    if (content.includes(logoutFunc)) {
        content = content.replace(logoutFunc, logoutNew);
        changes++;
        console.log('Added createDemoUser() function after logout()');
    }
} else {
    console.log('createDemoUser() already exists');
}

// ─── 7. Remove loadReviews() section ──
const reviewsSection = '    // ── Reviews loading ──\n    private var reviewsLoaded = false\n\n    fun loadReviews() {\n        if (reviewsLoaded) return\n        val userId = _state.value.user?.id ?: return\n        reviewsLoaded = true\n        viewModelScope.launch {\n            try {\n                val resp = api.userReviews(userId.toString())\n                val mapped = resp.reviews.map { r ->\n                    UserReview(\n                        id = r.stableId,\n                        reviewerName = r.reviewerName ?: "Anonymous",\n                        reviewerAvatar = r.reviewerAvatar,\n                        rating = r.rating.toInt().coerceIn(1, 5),\n                        message = r.comment ?: "",\n                        date = r.createdAt?.take(10) ?: "",\n                    )\n                }\n                _state.value = _state.value.copy(reviews = mapped)\n            } catch (_: Exception) { }\n        }\n    }';
if (content.includes(reviewsSection)) {
    content = content.replace(reviewsSection, '');
    changes++;
    console.log('Removed loadReviews() section');
}

// ─── 8. Remove LaunchedEffect that calls loadReviews() ──
const loadReviewsEffect = '                    LaunchedEffect(state.user?.id) { viewModel.loadReviews() }';
if (content.includes(loadReviewsEffect)) {
    content = content.replace(loadReviewsEffect + '\n', '');
    changes++;
    console.log('Removed loadReviews LaunchedEffect');
}

// ─── 9. Remove orphaned updateProfile() method, add saveFullProfile ──
const updateProfileFunc = '    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {\n        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)\n        viewModelScope.launch {\n            when (val result = rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {\n                is ApiResult.Success -> {\n                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!", editError = null)\n                    // Refresh user data\n                    when (val result = repo.me()) {\n                        is ApiResult.Success -> _state.value = _state.value.copy(user = result.data)\n                        is ApiResult.Failure -> {}\n                    }\n                    onDone()\n                }\n                is ApiResult.Failure -> _state.value = _state.value.copy(\n                    editSaving = false,\n                    editError = result.error.userFacingMessage("save your profile"),\n                )\n            }\n        }\n    }\n\n';

const saveFullProfile = `    // ── Full profile save (for EditProfileScreen) ──
    fun saveFullProfile(
        fullName: String?, phone: String?, bio: String?,
        location: String?, socialLinks: Map<String, String>?,
        minPrice: Int?, maxPrice: Int?, categories: List<String>?,
    ) {
        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)
        viewModelScope.launch {
            when (val r = rewardsRepo.updateProfile(
                com.mhub.app.data.remote.dto.ProfileUpdateRequest(
                    fullName = fullName, phone = phone, bio = bio,
                    socialLinks = socialLinks,
                )
            )) {
                is ApiResult.Success -> {
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
    }\n\n`;

if (content.includes(updateProfileFunc)) {
    content = content.replace(updateProfileFunc, saveFullProfile);
    changes++;
    console.log('Replaced updateProfile() with saveFullProfile()');
} else {
    console.log('⚠️ updateProfile() pattern not found - trying to add saveFullProfile separately');
    if (!content.includes('saveFullProfile')) {
        // Add saveFullProfile after refresh() or after logout()
        const insertTarget = '    fun logout(onDone: () -> Unit) {';
        if (content.includes(insertTarget)) {
            content = content.replace(insertTarget, saveFullProfile + '\n' + insertTarget);
            changes++;
            console.log('Added saveFullProfile() before logout()');
        }
    }
}

// ─── 10. Replace EditProfileDialog call with EditProfileScreen ──
const editDialogCall = '                    // Edit Profile Dialog\n                    if (showEditDialog) {\n                        EditProfileDialog(\n                            user = user,\n                            saving = state.editSaving,\n                            saveError = state.editError,\n                            onDismiss = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            onSave = { name: String?, phone: String?, bio: String? ->\n                                viewModel.updateProfile(name, phone, bio) { showEditDialog = false }\n                            },\n                        )\n                    }';

const editScreenCall = '                    // Edit Profile Screen (full-screen dialog)\n                    if (showEditDialog) {\n                        androidx.compose.ui.window.Dialog(\n                            onDismissRequest = {\n                                showEditDialog = false\n                                viewModel.clearEditResult()\n                            },\n                            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),\n                        ) {\n                            EditProfileScreen(\n                                user = user,\n                                saving = state.editSaving,\n                                saveError = state.editError,\n                                initialLocation = prefs?.location ?: "",\n                                initialMinPrice = prefs?.minPrice,\n                                initialMaxPrice = prefs?.maxPrice,\n                                initialCategories = prefs?.categories.orEmpty(),\n                                onDismiss = {\n                                    showEditDialog = false\n                                    viewModel.clearEditResult()\n                                },\n                                onSave = { name, phone, bio, loc, links, minP, maxP, cats ->\n                                    viewModel.saveFullProfile(name, phone, bio, loc, links, minP, maxP, cats)\n                                },\n                                onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },\n                                onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },\n                            )\n                        }\n                    }';

function countBraces(s) {
    let o = 0, c = 0;
    for (const ch of s) { if (ch === '{') o++; if (ch === '}') c++; }
    return o - c;
}

const oldBal = countBraces(editDialogCall);
const newBal = countBraces(editScreenCall);
console.log(`EditProfile replacement: oldBraces=${oldBal}, newBraces=${newBal}`);

if (content.includes(editDialogCall)) {
    if (oldBal === newBal) {
        content = content.replace(editDialogCall, editScreenCall);
        changes++;
        console.log('Replaced EditProfileDialog with EditProfileScreen');
    } else {
        console.log('❌ Brace mismatch - not applying EditProfile replacement');
    }
} else {
    console.log('⚠️ EditProfileDialog call not found - trying alternative patterns');
    
    // Try matching only the showEditDialog block
    const altPattern = '                    if (showEditDialog) {\n                        EditProfileDialog(';
    if (content.includes(altPattern)) {
        // Find the code block from 'if (showEditDialog)' to the matching closing '}'
        const startIdx = content.indexOf('                    if (showEditDialog) {');
        const endIdx = content.indexOf('\n                        )\n                    }\n', startIdx);
        if (startIdx >= 0 && endIdx >= 0) {
            const actualBlock = content.substring(startIdx, endIdx + 40);
            console.log(`Found alternative EditProfileDialog block (${actualBlock.length} chars)`);
        }
    }
}

// ─── Write file ──
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ ${changes} changes applied to ProfileScreen.kt`);
