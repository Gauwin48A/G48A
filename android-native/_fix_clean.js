/**
 * CLEAN approach: extract ALL patterns from the HEAD file first, then apply all replacements.
 * This eliminates pattern-mismatch issues.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(FILE, 'utf8');
content = content.replace(/\r\n/g, '\n');
let ops = 0;

function extract(startMarker, endMarker) {
  const s = content.indexOf(startMarker);
  if (s < 0) return null;
  const e = content.indexOf(endMarker, s + startMarker.length);
  if (e < 0) return null;
  return content.substring(s, e + endMarker.length);
}

function replaceSingle(oldStr, newStr, desc) {
  const idx = content.indexOf(oldStr);
  if (idx < 0) { console.log(`  FAIL: ${desc}`); return false; }
  content = content.substring(0, idx) + newStr + content.substring(idx + oldStr.length);
  ops++;
  console.log(`  OK : ${desc}`);
  return true;
}

// ────────────────────────────────────────────────────────────────────
// 1. Add JwtHelper import
replaceSingle(
  'import com.mhub.app.core.ApiError\n',
  'import com.mhub.app.core.JwtHelper\nimport com.mhub.app.core.ApiError\n',
  'Add JwtHelper import'
);

// ────────────────────────────────────────────────────────────────────
// 2. Add isDemoSession check - extract/rebuild the exact block
const demoBlock = extract(
  '// If we have cached data, keep showing it and don\'t show full-screen error\n',
  '                                    )\n                                }'
);
if (demoBlock) {
  const demoNew =
    '// Demo session: show cached data silently (don\'t declare expired)\n' +
    '                                // Demo session check\n' +
    '                                if (expired && repo.isDemoSession && cachedProfile?.user != null) {\n' +
    '                                    _state.value = _state.value.copy(\n' +
    '                                        loading = false, refreshing = false,\n' +
    '                                        error = null, isSessionExpired = false,\n' +
    '                                    )\n' +
    '                                } else ' + demoBlock;
  replaceSingle(demoBlock, demoNew, 'Add isDemoSession check');
} else {
  console.log('  FAIL: isDemoSession check - could not extract demoBlock');
}

// ────────────────────────────────────────────────────────────────────
// 3. Add createDemoUser function
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
replaceSingle(
  '\n    fun shareProfile(context',
  demoFn + 'fun shareProfile(context',
  'Add createDemoUser function'
);

// ────────────────────────────────────────────────────────────────────
// 4. Remove 5 stale params (individually - not consecutive)
replaceSingle('    onOpenChat: () -> Unit = {},\n', '', 'Remove onOpenChat');
replaceSingle('    onOpenOffers: () -> Unit = {},\n', '', 'Remove onOpenOffers');
replaceSingle('    onOpenAddresses: () -> Unit = {},\n', '', 'Remove onOpenAddresses');
replaceSingle('    onOpenMyFeed: () -> Unit = {},\n', '', 'Remove onOpenMyFeed');
replaceSingle('    onOpenReviews: (String) -> Unit = {},\n', '', 'Remove onOpenReviews');

// ────────────────────────────────────────────────────────────────────
// 5. Remove top bar actions (extract brace-balanced block)
const tbStart = 'actions = {\n                    IconButton(onClick = {';
const tbIdx = content.indexOf(tbStart);
if (tbIdx >= 0) {
  let depth = 0;
  let tbEnd = tbIdx;
  for (let i = tbIdx; i < content.length && i < tbIdx + 500; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') { depth--; if (depth === 0) { tbEnd = i; break; } }
  }
  if (depth === 0 && tbEnd > tbIdx) {
    const tbBlock = content.substring(tbIdx, tbEnd + 1) + ',\n';
    replaceSingle(tbBlock, '                actions = {},\n', 'Remove top bar actions');
  } else {
    console.log(`  FAIL: Remove top bar actions - depth=${depth}, tbEnd=${tbEnd}`);
  }
} else {
  console.log('  FAIL: Remove top bar actions - tbStart not found');
}

// ────────────────────────────────────────────────────────────────────
// 6. Remove Settings + Reviews tabs from TabRow
const tab1 = extract(
  'Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_settings)) })',
  ')'
);
if (tab1) {
  const tab2 = extract(
    'Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })',
    ')'
  );
  if (tab2) {
    replaceSingle(tab1 + '\n                            ' + tab2, '', 'Remove Settings+Reviews tabs');
  } else {
    console.log('  FAIL: Remove tabs - tab2 not found');
  }
} else {
  console.log('  FAIL: Remove tabs - tab1 not found');
}

// ────────────────────────────────────────────────────────────────────
// 7. Remove Tab 3+4 call sites
const tab3Call = extract(
  '// ─── Tab 3: Settings ──────────────────────────────────\n',
  ')\n                        }'
);
if (tab3Call) {
  const tab4Call = extract(
    '// ─── Tab 4: Reviews ───────────────────────────────────\n',
    ')\n                        }'
  );
  if (tab4Call) {
    replaceSingle(tab3Call + '\n\n                        ' + tab4Call + '\n', '', 'Remove Tab 3+4 call sites');
  } else {
    console.log('  FAIL: Remove Tab 4 call site - not found');
  }
} else {
  console.log('  FAIL: Remove Tab 3 call site - not found');
}

// ────────────────────────────────────────────────────────────────────
// 8. Remove Feed + Reviews chips (from Quick Actions)
const feedChip = extract(
  'CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed"',
  '))'
);
if (feedChip) {
  const revChip = extract(
    'CompactActionChip(icon = Icons.Filled.Star, label = "Reviews"',
    '))'
  );
  if (revChip) {
    replaceSingle(
      '                                    ' + feedChip + '\n                                    ' + revChip + '\n',
      '',
      'Remove Feed+Reviews chips'
    );
  } else { console.log('  FAIL: Reviews chip not found'); }
} else { console.log('  FAIL: Feed chip not found'); }

// ────────────────────────────────────────────────────────────────────
// 9. Rename Reactivate → Sale Undone
replaceSingle('label = "Reactivate"', 'label = "Sale Undone"', 'Rename Reactivate->Sale Undone');

// ────────────────────────────────────────────────────────────────────
// 10. Remove Offers chip
const offerChip = extract(
  'CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers"',
  '))'
);
if (offerChip) {
  replaceSingle('                                    ' + offerChip + '\n', '', 'Remove Offers chip');
} else { console.log('  FAIL: Offers chip not found'); }

// ────────────────────────────────────────────────────────────────────
// 11. Remove Messages row
replaceSingle(
  '                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat)\n',
  '',
  'Remove Messages row'
);

// ────────────────────────────────────────────────────────────────────
// 12. Remove SettingsTab/SettingsRow/ReviewsTab function definitions
// SettingsTab has params on next line, AvatarWithRing has params on same line
const sIdx = content.indexOf('private fun SettingsTab(\n');
// AvatarWithRing has params on SAME LINE: (initial: Char, ...)
const aIdx = content.indexOf('private fun AvatarWithRing(');

console.log(`  DEBUG: SettingsTab idx=${sIdx}, AvatarWithRing idx=${aIdx}`);
if (sIdx >= 0 && aIdx >= 0 && aIdx > sIdx) {
  content = content.substring(0, sIdx) + content.substring(aIdx);
  ops++;
  console.log('  OK : Remove SettingsTab/SettingsRow/ReviewsTab functions');
} else {
  console.log(`  FAIL: Remove functions - sIdx=${sIdx}, aIdx=${aIdx}`);
}

// ────────────────────────────────────────────────────────────────────
// Write back
fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`\nDone: ${ops} changes. Lines: ${content.split('\n').length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
