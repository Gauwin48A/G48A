/**
 * STRING-LEVEL replacements for ProfileScreen.kt
 * Each replacement uses exact string matching on the full file content.
 * All changes preserve brace balance — no brace-balancing step needed.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

let count = 0;
function replace(oldStr, newStr, desc) {
  if (oldStr === newStr) { console.log(`  SKIP ${desc}: content unchanged`); return; }
  if (!content.includes(oldStr)) {
    console.log(`  FAIL ${desc}: pattern NOT FOUND`);
    console.log(`    Looking for: ${oldStr.substring(0, 80).replace(/\n/g, '\\n')}...`);
    return;
  }
  content = content.replace(oldStr, newStr);
  count++;
  console.log(`  ✓ ${desc}`);
}

// ─── 1. Add JwtHelper import ──────────────────────────────────────────────
replace(
  'import com.mhub.app.core.ApiError\n',
  'import com.mhub.app.core.JwtHelper\nimport com.mhub.app.core.ApiError\n',
  'Add JwtHelper import'
);

// ─── 2. Add isDemoSession check ──────────────────────────────────────────
const demoOld =
  '                                // If we have cached data, keep showing it and don\'t show full-screen error\n' +
  '                                if (cachedProfile?.user != null) {\n' +
  '                                    _state.value = _state.value.copy(\n' +
  '                                        loading = false, refreshing = false,\n' +
  '                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),\n' +
  '                                        isSessionExpired = expired,\n' +
  '                                    )\n' +
  '                                } else {\n' +
  '                                    _state.value = _state.value.copy(\n' +
  '                                        loading = false, refreshing = false,\n' +
  '                                        isSessionExpired = expired,\n' +
  '                                        error = retry.error.userFacingMessage("load your profile"),\n' +
  '                                    )\n' +
  '                                }';

const demoNew =
  '                                // Demo session: show cached data silently (don\'t declare expired)\n' +
  '                                // Demo session check\n' +
  '                                if (expired && repo.isDemoSession && cachedProfile?.user != null) {\n' +
  '                                    _state.value = _state.value.copy(\n' +
  '                                        loading = false, refreshing = false,\n' +
  '                                        error = null, isSessionExpired = false,\n' +
  '                                    )\n' +
  '                                } else if (cachedProfile?.user != null) {\n' +
  '                                    _state.value = _state.value.copy(\n' +
  '                                        loading = false, refreshing = false,\n' +
  '                                        error = if (expired) null else retry.error.userFacingMessage("refresh your profile"),\n' +
  '                                        isSessionExpired = expired,\n' +
  '                                    )\n' +
  '                                } else {\n' +
  '                                    _state.value = _state.value.copy(\n' +
  '                                        loading = false, refreshing = false,\n' +
  '                                        isSessionExpired = expired,\n' +
  '                                        error = retry.error.userFacingMessage("load your profile"),\n' +
  '                                    )\n' +
  '                                }';

replace(demoOld, demoNew, 'Add isDemoSession check');

// ─── 3. Add createDemoUser function ──────────────────────────────────────
const demoUserFn =
  '    private fun createDemoUser(): User {\n' +
  '        return User(\n' +
  '            id = "demo_user",\n' +
  '            userId = "demo_user",\n' +
  '            fullName = "Demo User",\n' +
  '            phone = "+91-9876543210",\n' +
  '            email = "demo@mhub.app",\n' +
  '            bio = "This is a demo account for preview purposes.",\n' +
  '            username = "demo_user",\n' +
  '            currentPlan = "premium",\n' +
  '            kycStatus = null,\n' +
  '            role = "seller",\n' +
  '            pictureUrl = null,\n' +
  '            coverImage = null,\n' +
  '            rewardsRank = "DEMO",\n' +
  '            isVerified = true,\n' +
  '        )\n' +
  '    }\n' +
  '\n    ';

replace(
  '\n    fun shareProfile(context',
  demoUserFn + 'fun shareProfile(context',
  'Add createDemoUser function'
);

// ─── 4. Remove 5 stale params ──────────────────────────────────────────
replace(
  '    onOpenChat: () -> Unit = {},\n' +
  '    onOpenOffers: () -> Unit = {},\n' +
  '    onOpenAddresses: () -> Unit = {},\n' +
  '    onOpenMyFeed: () -> Unit = {},\n' +
  '    onOpenReviews: (String) -> Unit = {},\n',
  '',
  'Remove 5 stale params (onOpenChat, onOpenOffers, onOpenAddresses, onOpenMyFeed, onOpenReviews)'
);

// ─── 5. Remove top bar actions ─────────────────────────────────────────
const topBarOld =
  '                actions = {\n' +
  '                    IconButton(onClick = {\n' +
  '                        val userId = state.user?.id ?: ""\n' +
  '                        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {\n' +
  '                            type = "text/plain"\n' +
  '                            putExtra(android.content.Intent.EXTRA_TEXT, "Check out my MHub profile: https://mhub.app/u/$userId")\n' +
  '                        }\n' +
  '                        context.startActivity(android.content.Intent.createChooser(intent, "Share profile via"))\n' +
  '                    }) {\n' +
  '                        Icon(Icons.Default.Share, contentDescription = "Share profile")\n' +
  '                    }\n' +
  '                    androidx.compose.material3.IconButton(onClick = onOpenSettings) {\n' +
  '                        Icon(Icons.Default.Settings, contentDescription = "Settings")\n' +
  '                    }\n' +
  '                },\n';

replace(topBarOld, '                actions = {},\n', 'Remove top bar actions');

// ─── 6. Remove Settings + Reviews tabs from TabRow ─────────────────────
replace(
  '                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_settings)) })\n' +
  '                            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })\n',
  '',
  'Remove Settings + Reviews tabs from TabRow'
);

// ─── 7. Remove Tab 3 (Settings) and Tab 4 (Reviews) call sites ─────────
const tabsCallSites =
  '                        // ─── Tab 3: Settings ──────────────────────────────────\n' +
  '                        if (selectedTab == 3) {\n' +
  '                            SettingsTab(\n' +
  '                                user = user,\n' +
  '                                onOpenSettings = onOpenSettings,\n' +
  '                                onOpenSecurity = onOpenSecurity,\n' +
  '                                onOpenNotifications = onOpenNotifications,\n' +
  '                                onSignOut = { viewModel.logout(onSignedOut) },\n' +
  '                                onExportData = { viewModel.exportData() },\n' +
  '                                dataExportDone = state.dataExportDone,\n' +
  '                            )\n' +
  '                        }\n' +
  '\n' +
  '                        // ─── Tab 4: Reviews ───────────────────────────────────\n' +
  '                        if (selectedTab == 4) {\n' +
  '                            LaunchedEffect(state.user?.id) { viewModel.loadReviews() }\n' +
  '                            ReviewsTab(reviews = state.reviews)\n' +
  '                        }\n';

replace(tabsCallSites, '', 'Remove Tab 3+4 call sites');

// ─── 8. Remove Feed + Reviews chips from Quick Actions ─────────────────
replace(
  '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed", accentColor = Color(0xFF6366F1), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))\n' +
  '                                    CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))\n',
  '',
  'Remove Feed + Reviews chips from Quick Actions'
);

// ─── 9. Rename Reactivate → Sale Undone ─────────────────────────────────
replace('label = "Reactivate"', 'label = "Sale Undone"', 'Rename Reactivate → Sale Undone');

// ─── 10. Remove Offers chip ────────────────────────────────────────────
replace(
  '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers", accentColor = Color(0xFFF97316), onClick = onOpenOffers, modifier = Modifier.weight(1f))\n',
  '',
  'Remove Offers chip'
);

// ─── 11. Remove Messages row ───────────────────────────────────────────
replace(
  '                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat)\n',
  '',
  'Remove Messages/Chat row'
);

// ─── 12. Remove SettingsTab, SettingsRow, ReviewsTab function definitions ──
// Use indexOf to remove from SettingsTab to just before AvatarWithRing
const marker1 = 'private fun SettingsTab(\n';
const marker2 = 'private fun AvatarWithRing(\n';

const idx1 = content.indexOf(marker1);
const idx2 = content.indexOf(marker2);

if (idx1 >= 0 && idx2 >= 0 && idx2 > idx1) {
  content = content.substring(0, idx1) + content.substring(idx2);
  count++;
  console.log('  ✓ Remove SettingsTab, SettingsRow, ReviewsTab function definitions');
} else {
  console.log(`  FAIL Remove function definitions: marker1=${idx1}, marker2=${idx2}`);
}

// ─── Write back ──────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');

// Count total braces
const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`\n✅ ${count} changes applied. File: ${content.split('\n').length} lines. Braces: ${opens} open, ${closes} closed (diff: ${opens - closes}).`);
