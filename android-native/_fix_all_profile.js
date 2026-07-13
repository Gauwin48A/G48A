const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let changes = [];

function apply(oldStr, newStr, label) {
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        changes.push(label);
        console.log(`✅ ${label}`);
    } else {
        console.log(`❌ ${label} - pattern not found`);
    }
}

// ─── 1. Remove stale params ──
const paramsToRemove = [
    '    onOpenChat: () -> Unit = {},',
    '    onOpenOffers: () -> Unit = {},', 
    '    onOpenMyFeed: () -> Unit = {},',
    '    onOpenReviews: (String) -> Unit = {},',
];
for (const p of paramsToRemove) {
    if (content.includes(p)) {
        content = content.replace(p + '\n', '');
        changes.push(`Removed param: ${p.trim().split(' ')[0]}`);
        console.log(`✅ Removed param: ${p.trim().substring(0, 40)}`);
    }
}

// ─── 2. Wire createDemoUser into load() ──
const unauthorizedOld = `                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden
                                // If we have cached data, keep showing it and don't show full-screen error
                                if (cachedProfile?.user != null) {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),
                                        isSessionExpired = expired,
                                    )
                                } else `;
const unauthorizedNew = `                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden
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
                                } else `;
apply(unauthorizedOld, unauthorizedNew, 'Wired createDemoUser into load()');

// ─── 3. Add createDemoUser function after logout ──
const logoutFunc = `    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }

    fun shareProfile(context: android.content.Context) {`;
const logoutNew = `    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }

    private fun createDemoUser(): User {
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
    }

    fun shareProfile(context: android.content.Context) {`;
apply(logoutFunc, logoutNew, 'Added createDemoUser() function');

// ─── 4. Replace EditProfileDialog call with EditProfileScreen ──
const editDialogOld = `                    // Edit Profile Dialog
                    if (showEditDialog) {
                        EditProfileDialog(
                            user = user,
                            saving = state.editSaving,
                            saveError = state.editError,
                            onDismiss = {
                                showEditDialog = false
                                viewModel.clearEditResult()
                            },
                            onSave = { name: String?, phone: String?, bio: String? ->
                                viewModel.updateProfile(name, phone, bio) { showEditDialog = false }
                            },
                        )
                    }`;
const editScreenNew = `                    // Edit Profile Screen (full-screen dialog)
                    if (showEditDialog) {
                        androidx.compose.ui.window.Dialog(
                            onDismissRequest = {
                                showEditDialog = false
                                viewModel.clearEditResult()
                            },
                            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
                        ) {
                            EditProfileScreen(
                                user = user,
                                saving = state.editSaving,
                                saveError = state.editError,
                                initialLocation = prefs?.location ?: "",
                                initialMinPrice = prefs?.minPrice,
                                initialMaxPrice = prefs?.maxPrice,
                                initialCategories = prefs?.categories.orEmpty(),
                                onDismiss = {
                                    showEditDialog = false
                                    viewModel.clearEditResult()
                                },
                                onSave = { name, phone, bio, loc, links, minP, maxP, cats ->
                                    viewModel.saveFullProfile(name, phone, bio, loc, links, minP, maxP, cats)
                                },
                                onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },
                                onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },
                            )
                        }
                    }`;
// Check brace balance
function countBraces(s) {
    let o = 0, c = 0;
    for (const ch of s) { if (ch === '{') o++; if (ch === '}') c++; }
    return o - c;
}
console.log(`EditProfile braces: old=${countBraces(editDialogOld)}, new=${countBraces(editScreenNew)}`);
apply(editDialogOld, editScreenNew, 'Replaced EditProfileDialog with EditProfileScreen');

// ─── 5. Replace updateProfile with saveFullProfile ──
const updateProfileOld = `    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {
        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)
        viewModelScope.launch {
            when (val result = rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!", editError = null)
                    // Refresh user data
                    when (val result = repo.me()) {
                        is ApiResult.Success -> _state.value = _state.value.copy(user = result.data)
                        is ApiResult.Failure -> {}
                    }
                    onDone()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    editSaving = false,
                    editError = result.error.userFacingMessage("save your profile"),
                )
            }
        }
    }`;
const saveFullNew = `    // ── Full profile save (for EditProfileScreen) ──
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
apply(updateProfileOld, saveFullNew, 'Replaced updateProfile with saveFullProfile');

// ─── 6. Remove loadReviews section ──
const loadReviewsOld = `    // ── Reviews loading ──
    private var reviewsLoaded = false

    fun loadReviews() {
        if (reviewsLoaded) return
        val userId = _state.value.user?.id ?: return
        reviewsLoaded = true
        viewModelScope.launch {
            try {
                val resp = api.userReviews(userId.toString())
                val mapped = resp.reviews.map { r ->
                    UserReview(
                        id = r.stableId,
                        reviewerName = r.reviewerName ?: "Anonymous",
                        reviewerAvatar = r.reviewerAvatar,
                        rating = r.rating.toInt().coerceIn(1, 5),
                        message = r.comment ?: "",
                        date = r.createdAt?.take(10) ?: "",
                    )
                }
                _state.value = _state.value.copy(reviews = mapped)
            } catch (_: Exception) { }
        }
    }\n\n`;
apply(loadReviewsOld, '\n', 'Removed loadReviews() section');

// ─── 7. Remove UserReview data class and reviews field ──
const reviewsField = '    val reviews: List<UserReview> = emptyList(),\n';
apply(reviewsField, '', 'Removed reviews from ProfileState');

const userReviewClass = '\ndata class UserReview(\n    val id: String,\n    val reviewerName: String,\n    val reviewerAvatar: String?,\n    val rating: Int,\n    val message: String,\n    val date: String,\n)\n';
apply(userReviewClass, '\n', 'Removed UserReview data class');

// ─── 8. Remove LaunchedEffect calling loadReviews ──
const loadReviewsEffect = '                    LaunchedEffect(state.user?.id) { viewModel.loadReviews() }\n';
apply(loadReviewsEffect, '', 'Removed loadReviews LaunchedEffect');

// ─── 9. Remove Share, KYC, Edit buttons from action bar ──
// Remove Share OutlinedButton block
const shareBtn = `                            OutlinedButton(
                                onClick = { viewModel.shareProfile(context) },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.height(36.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                            ) {
                                Icon(Icons.Default.Share, null, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.profile_share), style = MaterialTheme.typography.labelMedium)
                            }
`;
if (content.includes(shareBtn)) {
    content = content.replace(shareBtn, '');
    changes.push('Removed Share button');
    console.log('✅ Removed Share button');
} else {
    console.log('❌ Share button pattern not found');
}

// Remove KYC button block
const kycBtn = `                            if (state.isOwnProfile) {
                                if (user?.isKycVerified != true) {
                                    Button(
                                        onClick = onOpenKyc,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.height(36.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                                    ) {
                                        Icon(Icons.Default.VerifiedUser, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.profile_verify_kyc), style = MaterialTheme.typography.labelMedium)
                                    }
                                }
`;
if (content.includes(kycBtn)) {
    content = content.replace(kycBtn, '');
    changes.push('Removed KYC button');
    console.log('✅ Removed KYC button');
} else {
    console.log('❌ KYC button pattern not found');
}

// Remove the remaining `if (state.isOwnProfile) {` if it's now empty
const emptyOwnProfile = '                            if (state.isOwnProfile) {\n                            }\n';
if (content.includes(emptyOwnProfile)) {
    content = content.replace(emptyOwnProfile, '');
    changes.push('Removed empty isOwnProfile block');
    console.log('✅ Removed empty isOwnProfile block');
}

// Remove Edit OutlinedButton
const editBtn = `                                OutlinedButton(
                                    onClick = { showEditDialog = true },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(36.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                                ) {
                                    Icon(Icons.Default.Edit, null, modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(stringResource(R.string.profile_edit), style = MaterialTheme.typography.labelMedium)
                                }
`;
if (content.includes(editBtn)) {
    content = content.replace(editBtn, '');
    changes.push('Removed Edit button');
    console.log('✅ Removed Edit button');
} else {
    console.log('❌ Edit button pattern not found');
}

// ─── 10. Remove Share and Edit from DropdownMenu ──
const shareDropdown = `                                    DropdownMenuItem(
                                        text = { Text(stringResource(R.string.profile_share_profile)) },
                                        onClick = { viewModel.shareProfile(context); showMoreMenu = false },
                                        leadingIcon = { Icon(Icons.Default.Share, null) },
                                    )
`;
if (content.includes(shareDropdown)) {
    content = content.replace(shareDropdown, '');
    changes.push('Removed Share from dropdown');
    console.log('✅ Removed Share from dropdown');
}

const editDropdown = `                                    if (state.isOwnProfile) {
                                        DropdownMenuItem(
                                            text = { Text(stringResource(R.string.profile_edit_profile)) },
                                            onClick = { showEditDialog = true; showMoreMenu = false },
                                            leadingIcon = { Icon(Icons.Default.Edit, null) },
                                        )
                                    }
`;
if (content.includes(editDropdown)) {
    content = content.replace(editDropdown, '');
    changes.push('Removed Edit from dropdown');
    console.log('✅ Removed Edit from dropdown');
}

// ─── 11. Remove Reviews tab ──
const reviewsTab = `                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })`;
if (content.includes(reviewsTab)) {
    content = content.replace(reviewsTab + '\n', '');
    changes.push('Removed Reviews tab');
    console.log('✅ Removed Reviews tab');
}

const reviewsContent = `                        if (selectedTab == 3) {
                            ReviewsTab(
                                viewModel = viewModel,
                                user = user,
                            )
                        }\n`;
if (content.includes(reviewsContent)) {
    content = content.replace(reviewsContent, '');
    changes.push('Removed ReviewsTab content');
    console.log('✅ Removed ReviewsTab content');
}

// ─── 12. Remove usages of stale params (chat, feed, offers chips) ──
const chatChip = `                                    CompactActionChip(icon = Icons.Filled.Notifications, label = "My Feed", accentColor = Color(0xFF3B82F6), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))`;
if (content.includes(chatChip)) {
    content = content.replace(chatChip + '\n', '');
    changes.push('Removed My Feed chip');
    console.log('✅ Removed My Feed chip');
}

const reviewsChip = '                                    CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))';
if (content.includes(reviewsChip)) {
    content = content.replace(reviewsChip + '\n', '');
    changes.push('Removed Reviews chip');
    console.log('✅ Removed Reviews chip');
}

const offersChip = '                                    CompactActionChip(icon = Icons.Filled.BarChart, label = "Offers", accentColor = Color(0xFF8B5CF6), onClick = onOpenOffers, modifier = Modifier.weight(1f))';
if (content.includes(offersChip)) {
    content = content.replace(offersChip + '\n', '');
    changes.push('Removed Offers chip');
    console.log('✅ Removed Offers chip');
}

const chatMenuItem = '                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Chat", subtitle = "Messages and conversations", onClick = onOpenChat, tint = MaterialTheme.colorScheme.primary)';
if (content.includes(chatMenuItem)) {
    content = content.replace(chatMenuItem + '\n', '');
    changes.push('Removed Chat from ProfileMenuItemCompact');
    console.log('✅ Removed Chat from ProfileMenuItemCompact');
}

// ─── 13. Remove ReviewsTab function ──
const reviewsTabFunc = `private fun ReviewsTab(
    viewModel: ProfileViewModel,
    user: com.mhub.app.domain.model.User?,
)`;
// Find and remove the entire ReviewsTab function
const reviewsTabStart = content.indexOf('\nprivate fun ReviewsTab(');
if (reviewsTabStart >= 0) {
    // Find the next private fun or end of file
    const nextFun = content.indexOf('\nprivate fun ', reviewsTabStart + 20);
    const endIdx = nextFun >= 0 ? nextFun : content.length;
    const funcBlock = content.substring(reviewsTabStart, endIdx);
    // Count braces to verify
    console.log(`ReviewsTab function block: ${funcBlock.substring(0, 60)}..., ${funcBlock.length} chars`);
    content = content.substring(0, reviewsTabStart) + content.substring(endIdx);
    changes.push('Removed ReviewsTab function');
    console.log('✅ Removed ReviewsTab function');
}

// ─── Clean up extra blank lines ──
content = content.replace(/\n{4,}/g, '\n\n\n');

// ─── Write file ──
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ ${changes.length} changes applied to ProfileScreen.kt`);
