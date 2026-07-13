const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf-8');
const changes = [];

// ─────────────────────────────────────────────────────────────
// 1. Add createDemoUser() function AFTER logout() closing brace
// ─────────────────────────────────────────────────────────────
const logoutMarker = `    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }
`;

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
    }
`;

if (content.includes(logoutMarker)) {
    content = content.replace(logoutMarker, logoutMarker + demoUserFunc);
    changes.push('Added createDemoUser() function after logout()');
} else {
    console.log('ERROR: Could not find logout function marker');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 2. Wire createDemoUser into load()
// ─────────────────────────────────────────────────────────────
const oldLoadBlock = `                                // If we have cached data, keep showing it and don't show full-screen error
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

const newLoadBlock = `                                // Demo session check: populate with demo user data silently
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

if (content.includes(oldLoadBlock)) {
    content = content.replace(oldLoadBlock, newLoadBlock);
    changes.push('Wired createDemoUser into load() with isDemoSession check');
} else {
    console.log('ERROR: Could not find old load block to replace');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 3. Remove stale params from function signature
// Remove the 4 lines containing these stale params
// ─────────────────────────────────────────────────────────────
const staleParams = ['onOpenChat', 'onOpenOffers', 'onOpenMyFeed', 'onOpenReviews'];
let lines = content.split('\n');
let resultLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip if this is a parameter declaration line for a stale param
    const isStaleParamDecl = staleParams.some(p => {
        if (!trimmed.includes(p)) return false;
        // Must be a function parameter (has `:` or `= {`)
        return (trimmed.includes(':') || trimmed.includes('= {')) && 
               !trimmed.includes('//') && // not a comment
               !trimmed.includes('import') && // not an import
               !trimmed.includes('stringResource'); // not a string resource
    });
    
    if (isStaleParamDecl) {
        changes.push(`Removed stale param: ${trimmed.substring(0, 40)}`);
        continue;
    }
    resultLines.push(line);
}
lines = resultLines;

// ─────────────────────────────────────────────────────────────
// 4. Remove stale param usage lines (CompactActionChip and ProfileMenuItemCompact)
// ─────────────────────────────────────────────────────────────
resultLines = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    const isStaleUsage = staleParams.some(p => {
        if (!trimmed.includes(p)) return false;
        // Must be in a CompactActionChip, ProfileMenuItemCompact, or onClick handler
        return (trimmed.includes('CompactActionChip') && trimmed.includes(p)) ||
               (trimmed.includes('ProfileMenuItemCompact') && trimmed.includes(p)) ||
               (trimmed.includes(`onClick = ${p}`));
    });
    
    if (isStaleUsage) {
        changes.push(`Removed stale usage: ${trimmed.substring(0, 40)}`);
        continue;
    }
    resultLines.push(line);
}
content = resultLines.join('\n');

// ─────────────────────────────────────────────────────────────
// 5. Remove Share OutlinedButton from action bar
// Find the OutlinedButton block that contains shareProfile onClick
// ─────────────────────────────────────────────────────────────
const shareBtnStart = '                            OutlinedButton(\n                                onClick = { viewModel.shareProfile(context) },';
const shareBtnEnd = '                            }\n';

let idx = content.indexOf(shareBtnStart);
if (idx >= 0) {
    // Find the end of this OutlinedButton block
    const startIdx = content.lastIndexOf('\n', idx) + 1;
    let depth = 0;
    let foundStart = false;
    let endIdx = idx;
    for (let i = idx; i < content.length; i++) {
        const c = content[i];
        if (c === '{') { depth++; foundStart = true; }
        if (c === '}') { depth--; }
        if (foundStart && depth <= 0 && i > idx) {
            endIdx = i + 1;
            break;
        }
    }
    if (endIdx > idx) {
        // Remove from the blank line before the button up to end
        const removeFrom = content.lastIndexOf('\n\n', idx);
        const actualFrom = removeFrom >= 0 ? removeFrom + 1 : startIdx;
        content = content.substring(0, actualFrom) + content.substring(endIdx);
        changes.push('Removed Share OutlinedButton');
    }
}

// ─────────────────────────────────────────────────────────────
// 6. Remove KYC Verify Button
// Find the Button block with onOpenKyc
// ─────────────────────────────────────────────────────────────
const kycBtnMarker = '                                if (user?.isKycVerified != true) {';
idx = content.indexOf(kycBtnMarker);
if (idx >= 0) {
    // Find the scope: this Button is inside an if(state.isOwnProfile) block
    // We need to remove the Button and its surrounding if block
    // Let's find the full if block: if (user?.isKycVerified != true) { Button(...) }
    let startIdx = idx;
    let depth = 0;
    let foundStart = false;
    let endIdx = idx;
    for (let i = idx; i < content.length; i++) {
        const c = content[i];
        if (c === '{') { depth++; foundStart = true; }
        if (c === '}') { depth--; }
        if (foundStart && depth <= 0 && i > idx) {
            endIdx = i + 1;
            break;
        }
    }
    // Verify this block contains the KYC Button
    const block = content.substring(idx, endIdx);
    if (block.includes('onOpenKyc') && block.includes('Button(')) {
        // Remove the if block and trailing newline
        const removeBefore = content.lastIndexOf('\n', idx - 2) + 1;
        content = content.substring(0, removeBefore) + content.substring(endIdx);
        changes.push('Removed KYC Verify Button + if block');
    }
}

// ─────────────────────────────────────────────────────────────
// 7. Remove Edit OutlinedButton
// Find the OutlinedButton with "Edit" text and showEditDialog
// ─────────────────────────────────────────────────────────────
const editBtnPattern = '                                // Prominent Edit Profile button - visible always';
idx = content.indexOf(editBtnPattern);
if (idx >= 0) {
    // Find the end of this OutlinedButton
    let startIdx = idx;
    let depth = 0;
    let foundStart = false;
    let endIdx = idx;
    for (let i = idx; i < content.length; i++) {
        const c = content[i];
        if (c === '{') { depth++; foundStart = true; }
        if (c === '}') { depth--; }
        if (foundStart && depth <= 0 && i > idx) {
            endIdx = i + 1;
            break;
        }
    }
    if (endIdx > idx) {
        const removeFrom = content.lastIndexOf('\n\n', idx - 2) + 1;
        content = content.substring(0, removeFrom) + content.substring(endIdx);
        changes.push('Removed Edit OutlinedButton');
    }
}

// ─────────────────────────────────────────────────────────────
// Write back
// ─────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf-8');
console.log(`Changes applied: ${changes.length}`);
changes.forEach(c => console.log(`  ✓ ${c}`));
console.log('Done!');
