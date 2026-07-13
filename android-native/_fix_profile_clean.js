const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

let changes = 0;

// Helper to count braces in a range
function bracesRange(start, end) {
    let open = 0, close = 0;
    for (let i = start; i < end && i < lines.length; i++) {
        for (const ch of lines[i]) { if (ch === '{') open++; if (ch === '}') close++; }
    }
    return open - close;
}

// ─── 1. Remove `val reviews: List<UserReview>` (line 180, index 179) ──
if (lines[179].includes('val reviews: List<UserReview>')) {
    lines.splice(179, 1);
    console.log('1. Removed reviews field from ProfileState');
    changes++;
}

// ─── 2. Remove UserReview data class (lines 191-197, indices 190-196) ──
// After removing reviews field, line indices shifted by -1, so UserReview is now at 190
if (lines[190] && lines[190].includes('data class UserReview')) {
    // Find the closing paren (data class has simple properties, no nesting)
    let endIdx = 190;
    for (let i = 190; i < lines.length; i++) {
        endIdx = i;
        if (lines[i].includes(')')) break;
    }
    lines.splice(190, endIdx - 190 + 1);
    console.log('2. Removed UserReview data class');
    changes++;
}

// ─── 3. Wire createDemoUser into load() ──
// Find the demo session check
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// Demo session: show cached data silently')) {
        const oldCondition = lines[i + 2]; // the if condition line
        if (oldCondition && oldCondition.includes('if (expired && repo.isDemoSession && cachedProfile?.user != null)')) {
            lines[i] = '                                // Demo session: populate with demo user data silently';
            lines[i + 1] = '                                // Demo session check - removed';
            lines[i + 2] = '                                if (expired && repo.isDemoSession) {';
            // Insert createDemoUser call after the `if` opening brace
            lines.splice(i + 3, 0, '                                    val demoUser = createDemoUser()');
            // Add cachedProfile assignment after the copy() call
            for (let j = i + 4; j < Math.min(lines.length, i + 15); j++) {
                if (lines[j].includes('error = null, isSessionExpired = false,')) {
                    lines.splice(j + 1, 0, '                                    cachedProfile = _state.value');
                    break;
                }
            }
            console.log('3. Wired createDemoUser into load()');
            changes++;
        }
        break;
    }
}

// ─── 4. Add createDemoUser() function after logout() ──
if (!lines.some(l => l.includes('private fun createDemoUser()'))) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('fun logout(onDone: () -> Unit)')) {
            // Find closing brace of logout function
            let logoutEnd = i + 1;
            let braceDepth = 0;
            for (let j = i; j < lines.length; j++) {
                for (const ch of lines[j]) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; }
                if (braceDepth === 0) { logoutEnd = j; break; }
            }
            // Insert after logout's closing brace and blank line
            const insertAt = logoutEnd + 1;
            const demoFunc = [
                '    private fun createDemoUser(): User {',
                '        return User(',
                '            id = "demo_user",',
                '            userId = "demo_user",',
                '            fullName = "Demo User",',
                '            phone = "+91-9876543210",',
                '            email = "demo@mhub.app",',
                '            bio = "This is a demo account for preview purposes.",',
                '            username = "demo_user",',
                '            currentPlan = "premium",',
                '            kycStatus = null,',
                '            role = "seller",',
                '            pictureUrl = null,',
                '            coverImage = null,',
                '            rewardsRank = "DEMO",',
                '            isVerified = true,',
                '        )',
                '    }',
            ];
            lines.splice(insertAt, 0, '', ...demoFunc);
            console.log('4. Added createDemoUser() function');
            changes++;
            break;
        }
    }
}

// ─── 5. Remove loadReviews() section ──
let reviewsSectionStart = -1;
let reviewsSectionEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// ── Reviews loading ──')) {
        reviewsSectionStart = i;
        // Find the end: look for the next function or blank line followed by private fun
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('fun saveFullProfile') || 
                (lines[j].includes('private fun') && j > i + 3)) {
                reviewsSectionEnd = j - 1;
                break;
            }
        }
        break;
    }
}

// If we didn't find reviews section, try finding loadReviews directly
if (reviewsSectionStart === -1) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('fun loadReviews()')) {
            reviewsSectionStart = i - 2; // include the comment and blank line above
            // Find the closing brace
            let depth = 0;
            for (let j = i; j < lines.length; j++) {
                for (const ch of lines[j]) { if (ch === '{') depth++; if (ch === '}') depth--; }
                if (depth === 0) { reviewsSectionEnd = j + 1; break; }
            }
            break;
        }
    }
}

if (reviewsSectionStart >= 0 && reviewsSectionEnd > reviewsSectionStart) {
    lines.splice(reviewsSectionStart, reviewsSectionEnd - reviewsSectionStart);
    console.log('5. Removed loadReviews() section');
    changes++;
} else {
    console.log('5. ⚠️ loadReviews() section not found');
}

// ─── 6. Add saveFullProfile() method ──
if (!lines.some(l => l.includes('fun saveFullProfile'))) {
    // Find the end of savePreferences method - look for its closing brace
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('fun savePreferences(')) {
            let depth = 0;
            let savePrefsEnd = i;
            for (let j = i; j < lines.length; j++) {
                for (const ch of lines[j]) { if (ch === '{') depth++; if (ch === '}') depth--; }
                if (depth === 0) { savePrefsEnd = j; break; }
            }
            const insertAt = savePrefsEnd + 1;
            const saveFullFunc = [
                '',
                '    // ── Full profile save (for EditProfileScreen) ──',
                '    fun saveFullProfile(',
                '        fullName: String?, phone: String?, bio: String?,',
                '        location: String?, socialLinks: Map<String, String>?,',
                '        minPrice: Int?, maxPrice: Int?, categories: List<String>?,',
                '    ) {',
                '        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)',
                '        viewModelScope.launch {',
                '            // 1. Update profile info',
                '            when (val r = rewardsRepo.updateProfile(',
                '                com.mhub.app.data.remote.dto.ProfileUpdateRequest(',
                '                    fullName = fullName, phone = phone, bio = bio,',
                '                    socialLinks = socialLinks,',
                '                )',
                '            )) {',
                '                is ApiResult.Success -> {',
                '                    // 2. Save preferences',
                '                    if (location != null || categories != null || minPrice != null || maxPrice != null) {',
                '                        try {',
                '                            api.updatePreferences(',
                '                                com.mhub.app.data.remote.dto.PreferencesUpdateRequest(',
                '                                    location = location ?: "",',
                '                                    minPrice = minPrice, maxPrice = maxPrice,',
                '                                    categories = categories,',
                '                                )',
                '                            )',
                '                        } catch (_: Exception) { }',
                '                    }',
                '                    // 3. Refresh user data',
                '                    when (val me = repo.me()) {',
                '                        is ApiResult.Success -> _state.value = _state.value.copy(user = me.data)',
                '                        is ApiResult.Failure -> {}',
                '                    }',
                '                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!")',
                '                }',
                '                is ApiResult.Failure -> _state.value = _state.value.copy(',
                '                    editSaving = false,',
                '                    editError = r.error.userFacingMessage("save your profile"),',
                '                )',
                '            }',
                '        }',
                '    }',
            ];
            lines.splice(insertAt, 0, ...saveFullFunc);
            console.log('6. Added saveFullProfile() method');
            changes++;
            break;
        }
    }
}

// ─── 7. Replace EditProfileDialog call with EditProfileScreen ──
let editDialogStart = -1;
let editDialogEnd = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('EditProfileDialog(\n' || lines[i].includes('EditProfileDialog('))) {
        editDialogStart = i;
        let depth = 0;
        let inParens = false;
        for (let j = i; j < lines.length; j++) {
            // Track paren depth
            for (const ch of lines[j]) {
                if (ch === '(') { depth++; inParens = true; }
                if (ch === ')') { depth--; }
            }
            // Also track brace depth for inner lambdas
            if (depth <= 0 && inParens && lines[j].trim() === '                        )') {
                editDialogEnd = j;
                break;
            }
            // Also check for the pattern: closing paren followed by closing brace after the EditProfileDialog
            if (depth === 0 && inParens && j > i + 2) {
                editDialogEnd = j;
                break;
            }
        }
        break;
    }
}

if (editDialogStart >= 0 && editDialogEnd > editDialogStart) {
    const oldBal = bracesRange(editDialogStart, editDialogEnd + 1);
    const editScreenLines = [
        '                    // Edit Profile Screen (full-screen dialog)',
        '                    if (showEditDialog) {',
        '                        androidx.compose.ui.window.Dialog(',
        '                            onDismissRequest = {',
        '                                showEditDialog = false',
        '                                viewModel.clearEditResult()',
        '                            },',
        '                            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),',
        '                        ) {',
        '                            EditProfileScreen(',
        '                                user = user,',
        '                                saving = state.editSaving,',
        '                                saveError = state.editError,',
        '                                initialLocation = prefs?.location ?: "",',
        '                                initialMinPrice = prefs?.minPrice,',
        '                                initialMaxPrice = prefs?.maxPrice,',
        '                                initialCategories = prefs?.categories.orEmpty(),',
        '                                onDismiss = {',
        '                                    showEditDialog = false',
        '                                    viewModel.clearEditResult()',
        '                                },',
        '                                onSave = { name, phone, bio, loc, links, minP, maxP, cats ->',
        '                                    viewModel.saveFullProfile(name, phone, bio, loc, links, minP, maxP, cats)',
        '                                },',
        '                                onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },',
        '                                onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },',
        '                            )',
        '                        }',
        '                    }',
    ];
    const newBal = bracesRange(0, editScreenLines.length);
    
    if (oldBal === newBal) {
        lines.splice(editDialogStart, editDialogEnd - editDialogStart + 1, ...editScreenLines);
        console.log('7. Replaced EditProfileDialog with EditProfileScreen');
        changes++;
    } else {
        console.log(`7. ⚠️ Brace mismatch: old=${oldBal}, new=${newBal} - not applying`);
    }
} else {
    console.log('7. ⚠️ EditProfileDialog call not found');
}

// ─── 8. Remove orphaned updateProfile() method ──
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit)')) {
        let depth = 0;
        let funcEnd = i;
        for (let j = i; j < lines.length; j++) {
            for (const ch of lines[j]) { if (ch === '{') depth++; if (ch === '}') depth--; }
            if (depth === 0) { funcEnd = j; break; }
        }
        const removedLines = funcEnd - i + 1;
        lines.splice(i, removedLines);
        console.log('8. Removed orphaned updateProfile() method');
        changes++;
        break;
    }
}

// ─── 9. Remove LaunchedEffect that calls loadReviews() ──
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('viewModel.loadReviews()')) {
        // Find the containing LaunchedEffect block
        let startJ = i;
        let endJ = i;
        for (let j = i; j >= 0; j--) {
            if (lines[j].includes('LaunchedEffect(')) { startJ = j; break; }
        }
        for (let j = i; j < lines.length; j++) {
            if (lines[j].includes('}') && j > startJ) { endJ = j; break; }
        }
        if (endJ > startJ && endJ - startJ < 5) {
            lines.splice(startJ, endJ - startJ + 1);
            console.log('9. Removed LaunchedEffect loadReviews() call');
            changes++;
        } else if (endJ > startJ) {
            // Just remove the line with viewModel.loadReviews()
            lines.splice(i, 1);
            console.log('9. Removed loadReviews() reference line');
            changes++;
        }
        break;
    }
}

// ─── Write file ──
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\n✅ ${changes} changes applied to ProfileScreen.kt`);
