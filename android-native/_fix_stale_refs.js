const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let code = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings to LF for reliable pattern matching
const hasCRLF = code.includes('\r\n');
if (hasCRLF) {
    code = code.replace(/\r\n/g, '\n');
}

let changes = 0;

// ── 1. Remove stale params from ProfileScreen function signature ──
const paramRemovals = [
    '    onOpenChat: () -> Unit = {},\n',
    '    onOpenOffers: () -> Unit = {},\n',
    '    onOpenAddresses: () -> Unit = {},\n',
    '    onOpenMyFeed: () -> Unit = {},\n',
    '    onOpenReviews: (String) -> Unit = {},\n',
];
paramRemovals.forEach(r => {
    const idx = code.indexOf(r);
    if (idx >= 0) { code = code.substring(0, idx) + code.substring(idx + r.length); changes++; }
});

// ── 2. Remove stale call sites ──
const callRemovals = [
    `                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed", accentColor = Color(0xFF6366F1), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))\n`,
    `                                    CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))\n`,
    `                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers", accentColor = Color(0xFFF97316), onClick = onOpenOffers, modifier = Modifier.weight(1f))\n`,
    `                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat)\n`,
    `                            SettingsTab(\n                                user = user,\n                                onOpenSettings = onOpenSettings,\n                                onOpenSecurity = onOpenSecurity,\n                                onOpenNotifications = onOpenNotifications,\n                                onSignOut = { viewModel.logout(onSignedOut) },\n                                onExportData = { viewModel.exportData() },\n                                dataExportDone = state.dataExportDone,\n                            )\n\n`,
    `                            ReviewsTab(reviews = state.reviews)\n\n`,
];
callRemovals.forEach(r => {
    const idx = code.indexOf(r);
    if (idx >= 0) { code = code.substring(0, idx) + code.substring(idx + r.length); changes++; }
});

// ── 3. Remove SettingsTab, SettingsRow, ReviewsTab function definitions ──
// Remove from @Composable before SettingsTab to end of file
const settingsTabDef = '\nprivate fun SettingsTab(';
const defIdx = code.indexOf(settingsTabDef);
if (defIdx > 0) {
    // Find the @Composable annotation before it
    const beforeDef = code.lastIndexOf('\n', defIdx - 1);
    const lineBefore = code.substring(beforeDef + 1, defIdx);
    let removeFrom = defIdx;
    if (lineBefore.trim() === '@Composable') {
        removeFrom = beforeDef;
    }
    code = code.substring(0, removeFrom);
    changes++;
    // Remove trailing empty lines
    while (code.endsWith('\n\n')) {
        code = code.substring(0, code.length - 1);
    }
}

// ── Write result ──
// Try to preserve original line ending style
fs.writeFileSync(filePath, code, 'utf-8');
console.log(`Applied ${changes} changes${hasCRLF ? ' (normalized CRLF to LF)' : ''}. File: ${code.split('\n').length} lines.`);
