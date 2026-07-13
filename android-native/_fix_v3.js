/**
 * v3 - String-level replacements for ProfileScreen.kt
 * Fixes: removes non-consecutive params individually, debug output for markers
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

let count = 0;

function replaceExact(oldStr, newStr, desc) {
  if (!content.includes(oldStr)) {
    console.log(`  FAIL ${desc}: pattern not found`);
    console.log(`    Looking for: ${JSON.stringify(oldStr.substring(0, 80))}`);
    return false;
  }
  content = content.replace(oldStr, newStr);
  count++;
  console.log(`  OK  ${desc}`);
  return true;
}

// ─── 1. JwtHelper import ─────────────────────────────────────────────
replaceExact(
  'import com.mhub.app.core.ApiError\n',
  'import com.mhub.app.core.JwtHelper\nimport com.mhub.app.core.ApiError\n',
  'Add JwtHelper import'
);

// ─── 2. isDemoSession check ──────────────────────────────────────────
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
replaceExact(demoOld, demoNew, 'Add isDemoSession check');

// ─── 3. createDemoUser ───────────────────────────────────────────────
const demoFn =
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
  '    }\n\n    ';
replaceExact(
  '\n    fun shareProfile(context',
  demoFn + 'fun shareProfile(context',
  'Add createDemoUser function'
);

// ─── 4. Remove 5 stale params (INDIVIDUALLY - they're NOT consecutive) ──
replaceExact('    onOpenChat: () -> Unit = {},\n', '', 'Remove onOpenChat param');
replaceExact('    onOpenOffers: () -> Unit = {},\n', '', 'Remove onOpenOffers param');
replaceExact('    onOpenAddresses: () -> Unit = {},\n', '', 'Remove onOpenAddresses param');
replaceExact('    onOpenMyFeed: () -> Unit = {},\n', '', 'Remove onOpenMyFeed param');
replaceExact('    onOpenReviews: (String) -> Unit = {},\n', '', 'Remove onOpenReviews param');

// ─── 5. Top bar actions ──────────────────────────────────────────────
const tbOld =
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
replaceExact(tbOld, '                actions = {},\n', 'Remove top bar actions');

// ─── 6. Remove Settings + Reviews tabs ───────────────────────────────
replaceExact(
  '                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_settings)) })\n                            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })\n',
  '',
  'Remove Settings + Reviews tabs from TabRow'
);

// ─── 7. Remove Tab 3+4 call sites ────────────────────────────────────
const tab34 =
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
replaceExact(tab34, '', 'Remove Tab 3+4 call sites');

// ─── 8. Remove Feed + Reviews chips ──────────────────────────────────
const chips =
  '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed", accentColor = Color(0xFF6366F1), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))\n' +
  '                                    CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))\n';
replaceExact(chips, '', 'Remove Feed + Reviews chips');

// ─── 9. Rename Reactivate → Sale Undone ──────────────────────────────
replaceExact('label = "Reactivate"', 'label = "Sale Undone"', 'Rename Reactivate -> Sale Undone');

// ─── 10. Remove Offers chip ──────────────────────────────────────────
replaceExact(
  '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers", accentColor = Color(0xFFF97316), onClick = onOpenOffers, modifier = Modifier.weight(1f))\n',
  '',
  'Remove Offers chip'
);

// ─── 11. Remove Messages row ─────────────────────────────────────────
replaceExact(
  '                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat)\n',
  '',
  'Remove Messages/Chat row'
);

// ─── 12. Remove SettingsTab/SettingsRow/ReviewsTab function definitions ──
const m1 = 'private fun SettingsTab(\n';
const m2 = 'private fun AvatarWithRing(\n';
const i1 = content.indexOf(m1);
const i2 = content.indexOf(m2);

console.log(`\n  DEBUG: marker1 index=${i1}, marker2 index=${i2}`);
if (i1 >= 0) console.log(`  DEBUG: context around marker1: ${JSON.stringify(content.substring(i1, i1 + 80))}`);
if (i2 >= 0) console.log(`  DEBUG: context around marker2: ${JSON.stringify(content.substring(i2 - 10, i2 + 30))}`);

if (i1 >= 0 && i2 >= 0 && i2 > i1) {
  content = content.substring(0, i1) + content.substring(i2);
  count++;
  console.log('  OK  Remove SettingsTab/SettingsRow/ReviewsTab function definitions');
} else {
  console.log(`  FAIL Remove function definitions: i1=${i1}, i2=${i2}`);
}

// ─── Write back ──────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`\nDone: ${count} changes applied. File: ${content.split('\n').length} lines. Braces: ${opens} open, ${closes} closed (diff: ${opens - closes}).`);
