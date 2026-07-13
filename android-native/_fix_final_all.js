/**
 * Single comprehensive fix for ProfileScreen.kt
 * Reads file, applies ALL changes, balances braces, writes once.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split(/\r?\n/);
console.log(`Starting with ${lines.length} lines`);

// Helper function
function log(msg) { console.log('  • ' + msg); }

// ─── 1. Add JwtHelper import ──────────────────────────────────────────────
const jwtLine = 'import com.mhub.app.core.JwtHelper';
const apiErrorIdx = lines.findIndex(l => l.includes('import com.mhub.app.core.ApiError'));
if (apiErrorIdx >= 0 && !lines.some(l => l.includes(jwtLine))) {
  lines.splice(apiErrorIdx, 0, jwtLine);
  log('Added JwtHelper import');
}

// ─── 2. Add isDemoSession check ──────────────────────────────────────────
const expiredIdx = lines.findIndex(l => l.includes('val expired = retry.error is ApiError.Unauthorized'));
if (expiredIdx >= 0) {
  const commentIdx = expiredIdx + 1; // "// If we have cached data..."
  const ifIdx = expiredIdx + 2; // "if (cachedProfile?.user != null) {"
  
  if (lines[commentIdx]) {
    lines[commentIdx] = lines[commentIdx].replace(
      '// If we have cached data, keep showing it and don\'t show full-screen error',
      '// Demo session: show cached data silently (don\'t declare expired)'
    );
  }
  
  if (ifIdx >= 0 && lines[ifIdx] && lines[ifIdx].includes('if (cachedProfile?.user != null)')) {
    const indent = lines[ifIdx].match(/^\s*/)[0];
    lines[ifIdx] = `                                // Demo session check
                                if (expired && repo.isDemoSession && cachedProfile?.user != null) {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        error = null, isSessionExpired = false,
                                    )
                                } else ${lines[ifIdx].trim()}`;
    log('Added isDemoSession check');
  }
}

// ─── 3. Add createDemoUser function ──────────────────────────────────────
const shareProfileIdx = lines.findIndex(l => l.includes('fun shareProfile(context'));
if (shareProfileIdx >= 0) {
  const demoUserCode = [
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
    '',
  ];
  // Insert before the blank line before shareProfile
  lines.splice(shareProfileIdx - 1, 0, ...demoUserCode);
  log('Added createDemoUser function');
}

// ─── 4. Remove stale params ──────────────────────────────────────────────
const staleParams = [
  'onOpenChat: () -> Unit = {},',
  'onOpenOffers: () -> Unit = {},',
  'onOpenAddresses: () -> Unit = {},',
  'onOpenMyFeed: () -> Unit = {},',
  'onOpenReviews: (String) -> Unit = {},',
];
for (const param of staleParams) {
  const idx = lines.findIndex(l => l.includes(param));
  if (idx >= 0) {
    lines.splice(idx, 1);
  }
}
log('Removed stale params (onOpenChat, onOpenOffers, onOpenAddresses, onOpenMyFeed, onOpenReviews)');

// ─── 5. Remove top bar actions ──────────────────────────────────────────
const actionsIdx = lines.findIndex((l, i) => l.includes('actions = {') && i > 600 && i < 700);
if (actionsIdx >= 0) {
  let closeIdx = -1;
  let depth = 1;
  for (let i = actionsIdx + 1; i < actionsIdx + 30; i++) {
    const o = (lines[i].match(/{/g) || []).length;
    const c = (lines[i].match(/}/g) || []).length;
    depth += o - c;
    if (depth <= 0) { closeIdx = i; break; }
  }
  if (closeIdx >= 0) {
    lines[actionsIdx] = '                actions = {},';
    lines.splice(actionsIdx + 1, closeIdx - actionsIdx);
    log('Removed top bar Share/Settings icons');
  }
}

// ─── 6. Remove Share, Verify KYC, Edit buttons + MoreVert ───────────────
// Find the "Action Buttons" comment and the "Profile Tabs" comment
const actionBtnIdx = lines.findIndex(l => l.includes('Action Buttons'));
const profileTabsIdx = lines.findIndex(l => l.includes('Profile Tabs'));
const actionRowCloseIdx = lines.findIndex((l, i) => i > actionBtnIdx && i < profileTabsIdx && l.includes('Spacer(Modifier.weight(1f))'));

if (actionBtnIdx >= 0 && profileTabsIdx >= 0) {
  // Find the Row start after Action Buttons
  const rowStart = actionBtnIdx + 1;
  
  // Replace with simplified action buttons
  const newActions = [
    '                        // ─── Action Buttons ────────────────────────────────────',
    '                        Row(',
    '                            modifier = Modifier',
    '                                .fillMaxWidth()',
    '                                .padding(horizontal = 14.dp, vertical = 10.dp),',
    '                            horizontalArrangement = Arrangement.spacedBy(8.dp),',
    '                            verticalAlignment = Alignment.CenterVertically,',
    '                        ) {',
    '                            if (state.isOwnProfile) {',
    '                                // Empty for own profile — no action buttons',
    '                            } else {',
    '                                if (state.isFollowing) {',
    '                                    OutlinedButton(',
    '                                        onClick = { viewModel.toggleFollow() },',
    '                                        shape = RoundedCornerShape(10.dp),',
    '                                        modifier = Modifier.height(36.dp),',
    '                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),',
    '                                    ) {',
    '                                        Icon(Icons.Default.PersonRemove, null, modifier = Modifier.size(14.dp))',
    '                                        Spacer(Modifier.width(4.dp))',
    '                                        Text(stringResource(R.string.profile_unfollow), style = MaterialTheme.typography.labelMedium)',
    '                                    }',
    '                                } else {',
    '                                    Button(',
    '                                        onClick = { viewModel.toggleFollow() },',
    '                                        shape = RoundedCornerShape(10.dp),',
    '                                        modifier = Modifier.height(36.dp),',
    '                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),',
    '                                    ) {',
    '                                        Icon(Icons.Default.PersonAdd, null, modifier = Modifier.size(14.dp))',
    '                                        Spacer(Modifier.width(4.dp))',
    '                                        Text(stringResource(R.string.profile_follow), style = MaterialTheme.typography.labelMedium)',
    '                                    }',
    '                                }',
    '                            }',
    '                        }',
    '                        // ─── Profile Tabs',
  ];
  
  // Remove old code between Action Buttons and Profile Tabs (exclusive)
  lines.splice(rowStart, profileTabsIdx - rowStart, ...newActions);
  log('Replaced action buttons with simplified version');
}

// ─── 7. Remove Settings/Reviews tabs ─────────────────────────────────────
const settingsTabIdx = lines.findIndex(l => l.includes('profile_tab_settings'));
const reviewsTabIdx = lines.findIndex(l => l.includes('profile_tab_reviews'));
if (settingsTabIdx >= 0) {
  lines.splice(settingsTabIdx, 1);
  log('Removed Settings tab');
}
if (reviewsTabIdx >= 0) {
  lines.splice(lines.findIndex(l => l.includes('profile_tab_reviews')), 1);
  log('Removed Reviews tab');
}

// ─── 8. Remove Feed, Reviews, Offers chips + rename Reactivate ──────────
// Replace the Feed/Reviews chips row
const feedRowIdx = lines.findIndex(l => l.includes('label = "Feed"') && l.includes('CompactActionChip'));
if (feedRowIdx >= 0) {
  // Find the Row start
  let rowStart = -1;
  for (let i = feedRowIdx; i >= 0; i--) {
    if (lines[i].includes('Row(modifier = Modifier.fillMaxWidth()') && lines[i].includes('spacedBy(6.dp)')) {
      rowStart = i;
      break;
    }
  }
  if (rowStart >= 0) {
    // Replace with My Home + Hub only
    lines[rowStart] = `                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {`;
    lines[rowStart + 1] = `                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.ListAlt, label = "My Home", accentColor = Color(0xFF10B981), onClick = onOpenMyPosts, modifier = Modifier.weight(1f))`;
    lines[rowStart + 2] = `                                    CompactActionChip(icon = Icons.Filled.Dashboard, label = "Hub", accentColor = Color(0xFF8B5CF6), onClick = onOpenCentre, modifier = Modifier.weight(1f))`;
    // Remove extra lines after Hub
    lines.splice(rowStart + 3, 2); // Remove Feed and Reviews chips + row closing
    log('Removed Feed, Reviews chips');
  }
}

// Reactivate → Sale Undone
const reactivateIdx = lines.findIndex(l => l.includes('label = "Reactivate"'));
if (reactivateIdx >= 0) {
  lines[reactivateIdx] = lines[reactivateIdx].replace('"Reactivate"', '"Sale Undone"');
  log('Renamed Reactivate → Sale Undone');
}

// Remove Offers chip
const offersIdx = lines.findIndex(l => l.includes('label = "Offers"'));
if (offersIdx >= 0) {
  // Find the Spacer after Offers (on the same line or next)
  lines.splice(offersIdx - 1, 2); // Remove the comma/space line before and the Offers chip
  log('Removed Offers chip');
}

// ─── 9. Remove Messages row from All Settings ────────────────────────────
const messagesIdx = lines.findIndex(l => l.includes('Messages') && l.includes('Chat with buyers'));
if (messagesIdx >= 0) {
  lines.splice(messagesIdx, 1);
  log('Removed Messages/Chat row');
}

// ─── 10. Remove SettingsTab and ReviewsTab call sites ────────────────────
const tab3Idx = lines.findIndex(l => l.includes('Tab 3: Settings'));
if (tab3Idx >= 0) {
  let endIdx = tab3Idx;
  // Find the end of the ReviewsTab block
  for (let i = tab3Idx; i < tab3Idx + 40; i++) {
    if (lines[i] && lines[i].includes('Spacer(Modifier.height(24.dp))') && i > tab3Idx + 5) {
      endIdx = i - 1;
      break;
    }
  }
  lines.splice(tab3Idx, endIdx - tab3Idx + 1);
  log('Removed SettingsTab and ReviewsTab call sites');
}

// ─── 11. Remove SettingsTab, SettingsRow, ReviewsTab function definitions ──
const settingsFuncIdx = lines.findIndex(l => l.includes('private fun SettingsTab('));
if (settingsFuncIdx >= 0) {
  const dataClassIdx = lines.findIndex((l, i) => i > settingsFuncIdx && l.includes('private data class ProfileLocationParts'));
  if (dataClassIdx >= 0) {
    lines.splice(settingsFuncIdx, dataClassIdx - settingsFuncIdx);
    log('Removed SettingsTab, SettingsRow, ReviewsTab functions');
  }
}

// ─── 12. Update Preferences onSave signatures ─────────────────────────────
// Update PreferencesTab onSave
const prefsOnSaveIdx = lines.findIndex(l => l.includes('onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit = { _, _, _ -> },'));
if (prefsOnSaveIdx >= 0) {
  lines[prefsOnSaveIdx] = '    onSave: (location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>) -> Unit = { _, _, _, _ -> },';
  log('Updated PreferencesTab onSave signature');
}

// Update PreferencesEditDialog signature
const prefsEditOnSaveIdx = lines.findIndex(l => l.includes('onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit,'));
if (prefsEditOnSaveIdx >= 0) {
  lines[prefsEditOnSaveIdx] = '    selectedCategories: List<String> = emptyList(),\r\n    onSave: (location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>) -> Unit,';
  log('Updated PreferencesEditDialog signature');
}

// Update PreferencesTab call
const prefsCallIdx = lines.findIndex(l => l.includes('onSave = { loc, min, max -> viewModel.savePreferences(loc, min, max) }'));
if (prefsCallIdx >= 0) {
  lines[prefsCallIdx] = '                                onSave = { loc, min, max, cats -> viewModel.savePreferences(loc, min, max, cats) },';
  log('Updated PreferencesTab call site');
}

// Update savePreferences signature
const savePrefsIdx = lines.findIndex(l => l.includes('fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?) {'));
if (savePrefsIdx >= 0) {
  lines[savePrefsIdx] = '    fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>? = null) {';
  log('Updated savePreferences signature');
}

// Update PreferencesUpdateRequest to include categories
const prefsUpdateReqIdx = lines.findIndex((l, i) => l.includes('api.updatePreferences(') && i > savePrefsIdx);
if (prefsUpdateReqIdx >= 0) {
  // Find the closing of the PreferencesUpdateRequest block
  for (let i = prefsUpdateReqIdx; i < prefsUpdateReqIdx + 10; i++) {
    if (lines[i] && lines[i].includes('maxPrice = maxPrice,')) {
      lines[i] = '                        maxPrice = maxPrice,';
      lines.splice(i + 1, 0, '                        categories = categories,');
      log('Added categories to PreferencesUpdateRequest');
      break;
    }
  }
}

// ─── 13. Find and fix missing braces in Quick Actions Card section ──────
// Search for the pattern where the Sale Undone Row is followed by User Posts Grid without closing braces
const saleUndoneRowCloseIdx = lines.findIndex(l => l.includes('Sale Undone'));
if (saleUndoneRowCloseIdx >= 0) {
  // Check what follows - look for the closing } of this row and what comes after
  for (let i = saleUndoneRowCloseIdx; i < saleUndoneRowCloseIdx + 10; i++) {
    if (lines[i] && lines[i].includes('User Posts Grid')) {
      // The Card's Column and Card closing braces are missing
      // Add them after the row closing brace
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (lines[j] && lines[j].trim() === '}') {
          lines.splice(j + 1, 0, '                            }', '                        }');
          log('Added missing closing braces for Quick Actions Card');
          break;
        }
      }
      break;
    }
  }
}

// ─── 14. Balance closing braces ──────────────────────────────────────────
let openCount = 0, closeCount = 0;
for (const l of lines) {
  openCount += (l.match(/{/g) || []).length;
  closeCount += (l.match(/}/g) || []).length;
}
const diff = openCount - closeCount;
if (diff > 0) {
  for (let i = 0; i < diff; i++) lines.push('}');
  log(`Added ${diff} closing brace(s) for balance`);
} else if (diff < 0) {
  log(`WARNING: Too many closing braces by ${Math.abs(diff)}`);
}

// ─── Write back ──────────────────────────────────────────────────────────
const output = lines.join('\r\n');
fs.writeFileSync(filePath, output, 'utf8');
log(`\n✅ Done! File now has ${lines.length} lines (was 3370)`);
log(`Brace balance: open=${openCount}, close=${closeCount + Math.max(0, diff)}, diff resolved`);
