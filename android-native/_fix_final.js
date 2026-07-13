const fs = require('fs');
const path = require('path');
const { isNativeError } = require('util/types');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');

// Read and normalize to LF
let content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
const changes = [];

// ═══════════════════════════════════════════════════════════════
// 1. Add createDemoUser() function AFTER logout() closing brace
// ═══════════════════════════════════════════════════════════════
const logoutEnd = `        viewModelScope.launch { repo.logout(); onDone() }
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
    console.error('ERROR: Could not find logout function end');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// 2. Wire createDemoUser into load() - replace cachedProfile check
// ═══════════════════════════════════════════════════════════════
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
    console.error('ERROR: Could not find old load block');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// 3. Remove stale params from function signature
// ═══════════════════════════════════════════════════════════════
const staleParamLines = [
    'onOpenChat: () -> Unit = {},',
    'onOpenOffers: () -> Unit = {},',
    'onOpenMyFeed: () -> Unit = {},',
    'onOpenReviews: (String) -> Unit = {},',
];

let lines = content.split('\n');
let resultLines = [];
let paramRemoved = 0;

for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isStale = staleParamLines.some(p => trimmed === p);
    if (isStale) {
        paramRemoved++;
        continue;
    }
    resultLines.push(lines[i]);
}
content = resultLines.join('\n');
changes.push(`Removed ${paramRemoved} stale param declarations`);

// ═══════════════════════════════════════════════════════════════
// 4. Remove stale param USAGE lines (CompactActionChip / ProfileMenuItemCompact)
// ═══════════════════════════════════════════════════════════════
lines = content.split('\n');
resultLines = [];
let usageRemoved = 0;
const staleParams = ['onOpenChat', 'onOpenOffers', 'onOpenMyFeed', 'onOpenReviews'];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isUsage = staleParams.some(p => {
        if (!trimmed.includes(p)) return false;
        // Only remove if it's in CompactActionChip, ProfileMenuItemCompact, or onClick
        return (trimmed.includes('CompactActionChip') && trimmed.includes(p)) ||
               (trimmed.includes('ProfileMenuItemCompact') && trimmed.includes(p)) ||
               (trimmed.includes(`onClick = ${p}`));
    });
    if (isUsage) {
        usageRemoved++;
        continue;
    }
    resultLines.push(line);
}
content = resultLines.join('\n');
changes.push(`Removed ${usageRemoved} stale param usage lines`);

// ═══════════════════════════════════════════════════════════════
// 5. Remove Share OutlinedButton
// ═══════════════════════════════════════════════════════════════
// Find and remove the Share button block (OutlinedButton that calls shareProfile)
const shareStart = '                            OutlinedButton(\n                                onClick = { viewModel.shareProfile(context) },';
let idx = content.indexOf(shareStart);
if (idx >= 0) {
    // Find the end of this OutlinedButton block by brace counting
    const startBrace = content.indexOf('{', idx);
    if (startBrace >= 0 && startBrace < idx + 300) {
        let depth = 0;
        let endIdx = startBrace;
        for (let i = startBrace; i < content.length; i++) {
            if (content[i] === '{') depth++;
            if (content[i] === '}') {
                depth--;
                if (depth <= 0 && i > startBrace) {
                    endIdx = i + 1;
                    break;
                }
            }
        }
        if (endIdx > startBrace) {
            // Remove from the line before shareStart to endIdx
            const beforeShare = content.lastIndexOf('\n', idx - 2);
            const removeFrom = beforeShare >= 0 ? beforeShare + 1 : idx;
            content = content.substring(0, removeFrom) + content.substring(endIdx);
            changes.push('Removed Share OutlinedButton');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 6. Remove KYC Verify Button (if + Button block)
// ═══════════════════════════════════════════════════════════════
const kycStart = '                                if (user?.isKycVerified != true) {';
idx = content.indexOf(kycStart);
if (idx >= 0) {
    let startBrace = idx + kycStart.indexOf('{');
    let depth = 0;
    let endIdx = startBrace;
    for (let i = startBrace; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
            depth--;
            if (depth <= 0 && i > startBrace) {
                endIdx = i + 1;
                break;
            }
        }
    }
    if (endIdx > startBrace) {
        const beforeKyc = content.lastIndexOf('\n', idx - 2);
        const removeFrom = beforeKyc >= 0 ? beforeKyc + 1 : idx;
        content = content.substring(0, removeFrom) + content.substring(endIdx);
        changes.push('Removed KYC Button');
    }
}

// ═══════════════════════════════════════════════════════════════
// 7. Remove Edit OutlinedButton
// ═══════════════════════════════════════════════════════════════
const editStart = '                                // Prominent Edit Profile button - visible always\n                                OutlinedButton(';
idx = content.indexOf(editStart);
if (idx >= 0) {
    const btnStart = content.indexOf('OutlinedButton(', idx);
    if (btnStart >= 0) {
        const btnBrace = content.indexOf('{', btnStart);
        if (btnBrace >= 0) {
            let depth = 0;
            let endIdx = btnBrace;
            for (let i = btnBrace; i < content.length; i++) {
                if (content[i] === '{') depth++;
                if (content[i] === '}') {
                    depth--;
                    if (depth <= 0 && i > btnBrace) {
                        endIdx = i + 1;
                        break;
                    }
                }
            }
            if (endIdx > btnBrace) {
                const beforeEdit = content.lastIndexOf('\n', idx - 2);
                const removeFrom = beforeEdit >= 0 ? beforeEdit + 1 : idx;
                content = content.substring(0, removeFrom) + content.substring(endIdx);
                changes.push('Removed Edit OutlinedButton');
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// Write back with CRLF
// ═══════════════════════════════════════════════════════════════
fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf-8');
console.log(`\n✓ Changes applied: ${changes.length}`);
changes.forEach(c => console.log(`  ${c}`));
console.log('Done!');
