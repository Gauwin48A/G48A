const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let code = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings
const hadCRLF = code.includes('\r\n');
code = code.replace(/\r\n/g, '\n');

let changes = [];

// ════════════════════════════════════════════════════════════════════
// 1. Remove stale params from ProfileScreen function signature
// ════════════════════════════════════════════════════════════════════
const paramLines = [
    '    onOpenChat: () -> Unit = {},\n',
    '    onOpenOffers: () -> Unit = {},\n',
    '    onOpenAddresses: () -> Unit = {},\n',
    '    onOpenMyFeed: () -> Unit = {},\n',
    '    onOpenReviews: (String) -> Unit = {},\n',
];
paramLines.forEach(line => {
    if (code.includes(line)) {
        code = code.replace(line, '');
        changes.push(`Removed param: ${line.trim().split(':')[0]}`);
    }
});

// ════════════════════════════════════════════════════════════════════
// 2. Remove stale call sites
// ════════════════════════════════════════════════════════════════════
const callLines = [
    '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed", accentColor = Color(0xFF6366F1), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))\n',
    '                                    CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))\n',
    '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers", accentColor = Color(0xFFF97316), onClick = onOpenOffers, modifier = Modifier.weight(1f))\n',
    '                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat)\n',
];
callLines.forEach(line => {
    if (code.includes(line)) {
        code = code.replace(line, '');
        changes.push(`Removed call site: ${line.trim().substring(0, 40)}...`);
    }
});

// ════════════════════════════════════════════════════════════════════
// 3. Remove SettingsTab, ReviewsTab call sites and their tab if-blocks
// ════════════════════════════════════════════════════════════════════

// SettingsTab call block (selectedTab == 3)
const settingsBlock = `                        if (selectedTab == 3) {
                            SettingsTab(
                                user = user,
                                onOpenSettings = onOpenSettings,
                                onOpenSecurity = onOpenSecurity,
                                onOpenNotifications = onOpenNotifications,
                                onSignOut = { viewModel.logout(onSignedOut) },
                                onExportData = { viewModel.exportData() },
                                dataExportDone = state.dataExportDone,
                            )
                        }

`;
if (code.includes(settingsBlock)) {
    code = code.replace(settingsBlock, '');
    changes.push('Removed SettingsTab call block');
}

// ReviewsTab call block (selectedTab == 4)
const reviewsBlock = `                        if (selectedTab == 4) {
                            LaunchedEffect(state.user?.id) { viewModel.loadReviews() }
                            ReviewsTab(reviews = state.reviews)
                        }

`;
if (code.includes(reviewsBlock)) {
    code = code.replace(reviewsBlock, '');
    changes.push('Removed ReviewsTab call block');
}

// Remove Settings and Reviews tab definitions from ScrollableTabRow
// Tab(selected = selectedTab == 3, ...)
const settingsTabDef = `                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_settings)) })
`;
if (code.includes(settingsTabDef)) {
    code = code.replace(settingsTabDef, '');
    changes.push('Removed Settings tab definition');
}

// Tab(selected = selectedTab == 4, ...)
const reviewsTabDef = `                            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })
`;
if (code.includes(reviewsTabDef)) {
    code = code.replace(reviewsTabDef, '');
    changes.push('Removed Reviews tab definition');
}

// ════════════════════════════════════════════════════════════════════
// 4. Remove SettingsTab, SettingsRow, ReviewsTab function definitions
// ════════════════════════════════════════════════════════════════════
// These are the last functions in the file - remove from SettingsTab to end
const tailStart = code.indexOf('\nprivate fun SettingsTab(');
if (tailStart > 0) {
    code = code.substring(0, tailStart);
    // Trim trailing blank lines
    while (code.endsWith('\n\n')) code = code.slice(0, -1);
    changes.push('Removed SettingsTab/SettingsRow/ReviewsTab function definitions');
}

// ════════════════════════════════════════════════════════════════════
// 5. Add JwtHelper import
// ════════════════════════════════════════════════════════════════════
if (!code.includes('import com.mhub.app.core.JwtHelper')) {
    const importLine = 'import com.mhub.app.core.userFacingMessage\n';
    const importIdx = code.indexOf(importLine);
    if (importIdx >= 0) {
        code = code.substring(0, importIdx + importLine.length) + 'import com.mhub.app.core.JwtHelper\n' + code.substring(importIdx + importLine.length);
        changes.push('Added JwtHelper import');
    }
}

// ════════════════════════════════════════════════════════════════════
// 6. Add demo login fix (isDemoSession + createDemoUser)
// ════════════════════════════════════════════════════════════════════
if (!code.includes('createDemoUser')) {
    // Add createDemoUser() before refresh()
    const refreshIdx = code.indexOf('\n    fun refresh()');
    if (refreshIdx > 0) {
        const demoUserCode = `
    /** Create a synthetic User from the demo session token payload when server is unreachable. */
    private fun createDemoUser(): User {
        val token = repo.accessTokenFlow.value ?: return User(userId = "demo_user", id = "demo_user", fullName = "Demo User", email = "demo@mhub.local", name = "Demo User")
        return User(
            userId = JwtHelper.extractClaim(token, "userId") ?: JwtHelper.extractClaim(token, "id") ?: "demo_user",
            id = JwtHelper.extractClaim(token, "id") ?: "demo_user",
            fullName = JwtHelper.extractClaim(token, "name") ?: "Demo User",
            name = JwtHelper.extractClaim(token, "name") ?: "Demo User",
            email = JwtHelper.extractClaim(token, "email") ?: "demo@mhub.local",
            role = JwtHelper.extractClaim(token, "role") ?: "user",
        )
    }

`;
        code = code.substring(0, refreshIdx) + demoUserCode + code.substring(refreshIdx);
        changes.push('Added createDemoUser() function');
    }
}

// Update the expired handling to check isDemoSession
const expiredBlock = `                                if (expired) {
                                        // Show login gate for expired sessions
                                        _state.value = _state.value.copy(
                                            loading = false, refreshing = false,
                                            isSessionExpired = true, error = null,
                                        )`;
const demoExpiredBlock = `                                if (expired && repo.isDemoSession) {
                                    val demoUser = createDemoUser()
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false, user = demoUser,
                                        error = "You're browsing in demo mode. Sign in for full access.",
                                        isSessionExpired = false,
                                    )
                                } else if (expired) {
                                        // Show login gate for expired sessions
                                        _state.value = _state.value.copy(
                                            loading = false, refreshing = false,
                                            isSessionExpired = true, error = null,
                                        )`;
if (code.includes(expiredBlock) && !code.includes('expired && repo.isDemoSession')) {
    code = code.replace(expiredBlock, demoExpiredBlock);
    changes.push('Added isDemoSession check in expired handling');
}

// Update cachedProfile check
const cachedCheck = 'if (cachedProfile?.user != null) {';
const cachedDemoCheck = 'if (cachedProfile?.user != null || repo.isDemoSession) {';
if (code.includes(cachedCheck) && !code.includes('repo.isDemoSession')) {
    code = code.replace(cachedCheck, cachedDemoCheck);
    changes.push('Updated cachedProfile check for demo sessions');
}

// ════════════════════════════════════════════════════════════════════
// Write result
// ════════════════════════════════════════════════════════════════════
fs.writeFileSync(filePath, code, 'utf-8');
console.log(`Applied ${changes.length} changes:`);
changes.forEach(c => console.log('  ✅', c));
console.log(`\nFile: ${code.split('\n').length} lines`);
