const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt';
let content = fs.readFileSync(path, 'utf-8');
const changes = [];

// 1. Wire createDemoUser into load()
// Replace the cachedProfile check with isDemoSession check
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
    console.log('ERROR: Could not find the old block to replace');
    process.exit(1);
}

// 2. Remove stale params from function signature
// Remove onOpenChat, onOpenOffers, onOpenMyFeed, onOpenReviews from ProfileScreen function signature
const paramLines = ['onOpenChat', 'onOpenOffers', 'onOpenMyFeed', 'onOpenReviews'];
const lines = content.split('\n');
const newLines = [];
let removed = 0;

for (let i = 0; i < lines.length; i++) {
    const shouldRemove = paramLines.some(p => {
        const trimmed = lines[i].trim();
        return trimmed.includes(p) && (trimmed.includes(':') || trimmed.includes('= {'));
    });
    if (shouldRemove) {
        if (i > 0 && lines[i-1].trim().endsWith(',')) {
            // clean up trailing comma on previous line
        }
        removed++;
        continue;
    }
    newLines.push(lines[i]);
}
changes.push(`Removed ${removed} stale param lines`);

content = newLines.join('\n');

// 3. Remove stale param usage lines (CompactActionChip and ProfileMenuItemCompact usages)
const usageLines = [
    'onOpenMyFeed',  // CompactActionChip
    'onOpenReviews', // CompactActionChip
    'onOpenOffers',  // CompactActionChip
    'onOpenChat',    // ProfileMenuItemCompact
];

const lines2 = content.split('\n');
const resultLines = [];
let usageRemoved = 0;

for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i];
    const isUsage = usageLines.some(p => {
        if (!line.includes(p)) return false;
        const trimmed = line.trim();
        // Only remove if it's a usage in CompactActionChip or ProfileMenuItemCompact
        return trimmed.includes('CompactActionChip') || 
               trimmed.includes('ProfileMenuItemCompact') ||
               trimmed.includes('onClick = ') && trimmed.includes(p);
    });
    
    if (isUsage) {
        usageRemoved++;
        continue;
    }
    resultLines.push(line);
}
changes.push(`Removed ${usageRemoved} stale param usage lines`);

content = resultLines.join('\n');

fs.writeFileSync(path, content, 'utf-8');
console.log(`Changes: ${changes.length}`);
changes.forEach(c => console.log(`  ✓ ${c}`));
