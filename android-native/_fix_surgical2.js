/**
 * Surgical fix v2 - EXACT line numbers based on HEAD file analysis:
 * SettingsTab: 2044
 * SettingsRow: 2132  
 * ReviewsTab: 2153
 * AvatarWithRing: 2248  <- DO NOT REMOVE
 * ProfileLocationParts: 2316 <- DO NOT REMOVE
 * 
 * Remove lines 2044-2247 (SettingsTab through ReviewsTab function definitions)
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');
let ops = 0;

function log(msg) { console.log(`  ✓ ${msg}`); ops++; }

// ─── 1. Add JwtHelper import ──────────────────────────────────────────────
const apiErrorIdx = lines.findIndex(l => l.includes('import com.mhub.app.core.ApiError'));
if (apiErrorIdx >= 0 && !lines.some(l => l.includes('import com.mhub.app.core.JwtHelper'))) {
  lines.splice(apiErrorIdx, 0, 'import com.mhub.app.core.JwtHelper');
  log('Added JwtHelper import');
}

// ─── 2. Add isDemoSession check ──────────────────────────────────────────
const expiredLineIdx = lines.findIndex(l => l.includes('val expired = retry.error is ApiError.Unauthorized'));
if (expiredLineIdx >= 0) {
  const commentIdx = expiredLineIdx + 1;
  const ifIdx = expiredLineIdx + 2;
  
  if (commentIdx >= 0 && lines[commentIdx].includes('// If we have cached data')) {
    lines[commentIdx] = '                                // Demo session: show cached data silently (don\'t declare expired)';
  }
  
  if (ifIdx >= 0 && lines[ifIdx].includes('if (cachedProfile?.user != null)')) {
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
  const demoUser = [
    '',
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
  lines.splice(shareProfileIdx - 1, 0, ...demoUser);
  log('Added createDemoUser function');
}

// ─── 4. Remove stale params ──────────────────────────────────────────────
const paramPatterns = [
  'onOpenChat: () -> Unit = {},',
  'onOpenOffers: () -> Unit = {},',
  'onOpenAddresses: () -> Unit = {},',
  'onOpenMyFeed: () -> Unit = {},',
  'onOpenReviews: (String) -> Unit = {},',
];
for (const p of paramPatterns) {
  const idx = lines.findIndex(l => l.includes(p));
  if (idx >= 0) { lines.splice(idx, 1); log(`Removed ${p.split(':')[0]}`); }
}

// ─── 5. Remove top bar actions (Share + Settings icons) ─────────────────
const actionsLineIdx = lines.findIndex((l, i) => l.includes('actions = {') && i > 600 && i < 700);
if (actionsLineIdx >= 0) {
  let depth = 1;
  let endIdx = -1;
  for (let i = actionsLineIdx + 1; i < Math.min(actionsLineIdx + 40, lines.length); i++) {
    depth += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
    if (depth <= 0) { endIdx = i; break; }
  }
  if (endIdx >= 0) {
    lines[actionsLineIdx] = '                actions = {},';
    lines.splice(actionsLineIdx + 1, endIdx - actionsLineIdx);
    log('Removed top bar actions');
  }
}

// ─── 6. Remove Settings + Reviews tabs from ScrollableTabRow ────────────
const settingsTab = lines.findIndex(l => l.includes('profile_tab_settings'));
const reviewsTab = lines.findIndex(l => l.includes('profile_tab_reviews'));
if (settingsTab >= 0) { lines.splice(settingsTab, 1); log('Removed Settings tab'); }
if (reviewsTab >= 0) { lines.splice(reviewsTab, 1); log('Removed Reviews tab'); }

// ─── 7. Remove Feed, Reviews chips from Quick Actions ───────────────────
const feedChipIdx = lines.findIndex(l => l.includes('label = "Feed"') && l.includes('CompactActionChip'));
if (feedChipIdx >= 0) {
  const rowStart = lines.findIndex((l, i) => i < feedChipIdx && i > feedChipIdx - 5 && 
    l.includes('Row(modifier = Modifier.fillMaxWidth()') && l.includes('spacedBy(6.dp)'));
  if (rowStart >= 0) {
    lines[rowStart + 1] = '                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.ListAlt, label = "My Home", accentColor = Color(0xFF10B981), onClick = onOpenMyPosts, modifier = Modifier.weight(1f))';
    lines[rowStart + 2] = '                                    CompactActionChip(icon = Icons.Filled.Dashboard, label = "Hub", accentColor = Color(0xFF8B5CF6), onClick = onOpenCentre, modifier = Modifier.weight(1f))';
    lines.splice(rowStart + 3, 2);
    log('Removed Feed, Reviews chips');
  }
}

// ─── 8. Rename Reactivate → Sale Undone, remove Offers chip ────────────
const reactIdx = lines.findIndex(l => l.includes('label = "Reactivate"'));
if (reactIdx >= 0) {
  lines[reactIdx] = lines[reactIdx].replace('"Reactivate"', '"Sale Undone"');
  log('Renamed Reactivate → Sale Undone');
}
const offersIdx = lines.findIndex(l => l.includes('label = "Offers"'));
if (offersIdx >= 0) {
  const spacerLine = offersIdx + 1;
  if (spacerLine < lines.length && lines[spacerLine].includes('Spacer')) {
    lines.splice(offersIdx, 2);
  } else {
    lines.splice(offersIdx, 1);
  }
  log('Removed Offers chip');
}

// ─── 9. Remove Messages row from All Settings ───────────────────────────
const msgIdx = lines.findIndex(l => l.includes('Messages') && l.includes('subtitle = "Chat with buyers"'));
if (msgIdx >= 0) { lines.splice(msgIdx, 1); log('Removed Messages/Chat row'); }

// ─── 10. Remove Tab 3 (Settings) and Tab 4 (Reviews) call sites ──────────
const tab3Comment = lines.findIndex(l => l.includes('Tab 3: Settings'));
if (tab3Comment >= 0) {
  let tabEnd = tab3Comment;
  for (let i = tab3Comment; i < Math.min(tab3Comment + 50, lines.length); i++) {
    if (lines[i] && lines[i].includes('Spacer(Modifier.height(24.dp))') && i > tab3Comment + 10) {
      tabEnd = i - 1;
      break;
    }
  }
  lines.splice(tab3Comment, tabEnd - tab3Comment + 1);
  log('Removed Tab 3+4 call sites');
}

// ─── 11. Remove SettingsTab, SettingsRow, ReviewsTab function definitions ──
// IMPORTANT: Use EXACT line numbers to avoid removing helpers after ReviewsTab
// SettingsTab starts at line 2044, ReviewsTab ends at line 2247 (before AvatarWithRing at 2248)
// Find the exact positions
const settingsFuncIdx = lines.findIndex(l => l.includes('private fun SettingsTab('));
const avatarFuncIdx = lines.findIndex((l, i) => i > settingsFuncIdx && l.includes('private fun AvatarWithRing('));

if (settingsFuncIdx >= 0 && avatarFuncIdx >= 0) {
  // Remove from SettingsTab start to AvatarWithRing - 1 (i.e., through ReviewsTab)
  // This removes SettingsTab function, SettingsRow function, and ReviewsTab function
  // but NOT AvatarWithRing or anything after it
  lines.splice(settingsFuncIdx, avatarFuncIdx - settingsFuncIdx);
  log('Removed SettingsTab, SettingsRow, ReviewsTab function definitions (lines 2044-2247)');
} else {
  console.log('WARNING: Could not find function boundaries');
}

// ─── 12. Balance braces ──────────────────────────────────────────────────
let open = 0, close = 0;
for (const l of lines) {
  open += (l.match(/{/g) || []).length;
  close += (l.match(/}/g) || []).length;
}
const diff = open - close;
if (diff > 0) {
  for (let i = 0; i < diff; i++) lines.push('}');
  log(`Added ${diff} missing closing brace(s)`);
} else if (diff < 0) {
  log(`WARNING: ${Math.abs(diff)} extra closing braces`);
}

// ─── Write back (LF endings) ─────────────────────────────────────────────
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\n✅ ${ops} changes applied. File: ${lines.length} lines. Braces: open=${open}, close=${close + Math.max(0,diff)}.`);
