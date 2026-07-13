const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');

// Read content, normalize to LF
let content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
const changes = [];

// ════════════════════════════════════════════════════════════
// 1. Add createDemoUser() function AFTER logout() closing brace
// ════════════════════════════════════════════════════════════
const logoutEnd = `    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }`;

const demoUserFunc = `

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
    }`;

if (content.includes(logoutEnd)) {
    content = content.replace(logoutEnd, logoutEnd + demoUserFunc);
    changes.push('Added createDemoUser() function');
} else {
    console.error('FATAL: Could not find logout function end');
    process.exit(1);
}

// ════════════════════════════════════════════════════════════
// 2. Wire createDemoUser into load()
// ════════════════════════════════════════════════════════════
const oldBlock = `                                // If we have cached data, keep showing it and don't show full-screen error
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
                                }`;

const newBlock = `                                // Demo session check: populate with demo user data silently
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
                                }`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    changes.push('Wired createDemoUser into load()');
} else {
    console.error('FATAL: Could not find old load block');
    process.exit(1);
}

// ════════════════════════════════════════════════════════════
// 3. Remove stale params (declarations + usages)
// ════════════════════════════════════════════════════════════
let staleCount = 0;

// Param declarations
const paramDeclarations = [
    '    onOpenChat: () -> Unit = {},',
    '    onOpenOffers: () -> Unit = {},',
    '    onOpenMyFeed: () -> Unit = {},',
    '    onOpenReviews: (String) -> Unit = {},',
];
paramDeclarations.forEach(p => {
    if (content.includes(p)) {
        content = content.replace(p, '');
        staleCount++;
    }
});

// Param usages in CompactActionChip
const paramUsages = [
    'CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed", accentColor = Color(0xFF6366F1), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))',
    'CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))',
    'CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers", accentColor = Color(0xFFF97316), onClick = onOpenOffers, modifier = Modifier.weight(1f))',
    'ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat)',
];
paramUsages.forEach(u => {
    if (content.includes(u)) {
        content = content.replace(u, '');
        staleCount++;
    }
});

changes.push(`Removed ${staleCount} stale param declarations/usages`);

// Clean up empty lines left from removals
content = content.replace(/\n{3,}/g, '\n\n'); // Reduce triple+ blank lines to double

// ════════════════════════════════════════════════════════════
// 4. Remove Share OutlinedButton
// ════════════════════════════════════════════════════════════
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
                            }`;

if (content.includes(shareBtn)) {
    content = content.replace(shareBtn, '');
    changes.push('Removed Share OutlinedButton');
}

// ════════════════════════════════════════════════════════════
// 5. Remove KYC Button (if block + Button)
// ════════════════════════════════════════════════════════════
const kycBlock = `                                if (user?.isKycVerified != true) {
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
                                }`;

if (content.includes(kycBlock)) {
    content = content.replace(kycBlock, '');
    changes.push('Removed KYC Button + if block');
}

// ════════════════════════════════════════════════════════════
// 6. Remove Edit OutlinedButton
// ════════════════════════════════════════════════════════════
const editBlock = `                                // Prominent Edit Profile button - visible always
                                OutlinedButton(
                                    onClick = { showEditDialog = true },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(36.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                    border = BorderStroke(1.dp, Color(0xFF6366F1)),
                                ) {
                                    Icon(Icons.Default.Edit, null, tint = Color(0xFF6366F1), modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Edit", style = MaterialTheme.typography.labelMedium, color = Color(0xFF6366F1))
                                }`;

if (content.includes(editBlock)) {
    content = content.replace(editBlock, '');
    changes.push('Removed Edit OutlinedButton');
}

// Final cleanup - remove excessive blank lines
content = content.replace(/\n{3,}/g, '\n\n');

// Write back with CRLF
fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf-8');

console.log(`\n✓ Total changes: ${changes.length}`);
changes.forEach(c => console.log(`  ✓ ${c}`));
console.log('Done!');
