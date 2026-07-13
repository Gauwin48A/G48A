/**
 * ProfileScreen.kt fix v2 - line-number-based approach.
 * Reads file as lines, modifies by line numbers, writes back.
 * This avoids all CRLF/whitespace pattern matching issues.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split(/\r?\n/);
console.log(`File has ${lines.length} lines`);

let ops = [];

// ─── Change 1: isDemoSession check ──────────────────────────────────────────
// Line 256-257 (0-indexed: 255-256): replace the expired check block
// Find the exact line positions
const expiredLineIdx = lines.findIndex(l => l.includes('val expired = retry.error is ApiError.Unauthorized'));
if (expiredLineIdx >= 0) {
  console.log(`Found 'expired =' at line ${expiredLineIdx + 1}`);
  // Find the matching comment line after it
  const commentLineIdx = expiredLineIdx + 1; // "// If we have cached data..."
  const ifLineIdx = expiredLineIdx + 2; // "if (cachedProfile?.user != null) {"
  
  if (lines[commentLineIdx] && lines[commentLineIdx].includes('If we have cached data')) {
    lines[commentLineIdx] = lines[commentLineIdx].replace(
      '// If we have cached data, keep showing it and don\'t show full-screen error',
      '// Demo session: show cached data silently (don\'t declare expired)'
    );
    ops.push('Updated comment for expired check');
  }
  
  // Replace the if-block
  // Current: if (cachedProfile?.user != null) {
  // Need to insert the demo check before
  if (ifLineIdx >= 0 && lines[ifLineIdx] && lines[ifLineIdx].includes('if (cachedProfile?.user != null)')) {
    lines[ifLineIdx] = `                                // Demo session check
                                if (expired && repo.isDemoSession && cachedProfile?.user != null) {
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        error = null, isSessionExpired = false,
                                    )
                                } else ${lines[ifLineIdx].trim()}`;
    ops.push('Added isDemoSession check before cachedProfile check');
  }
} else {
  console.log('WARNING: Could not find expired check block');
}

// ─── Change 2: createDemoUser function ────────────────────────────────────
// Insert before shareProfile (line 390, 0-indexed: 389)
const shareProfileIdx = lines.findIndex(l => l.includes('fun shareProfile(context'));
if (shareProfileIdx >= 0) {
  console.log(`Found shareProfile at line ${shareProfileIdx + 1}`);
  const createDemoUser = `    private fun createDemoUser(): User {
        return User(
            id = "demo_user",
            stableId = "demo_user",
            displayName = "Demo User",
            phone = "+91-9876543210",
            email = "demo@mhub.app",
            bio = "This is a demo account for preview purposes.",
            username = "demo_user",
            currentPlan = "premium",
            isKycVerified = false,
            kycStatus = null,
            role = "user",
            avatar = null,
            coverImage = null,
            rewardsRank = "DEMO",
        )
    }
`;
  lines.splice(shareProfileIdx - 1, 0, '', createDemoUser);
  ops.push('Added createDemoUser function before shareProfile');
  // Adjust: after splice, all indices after shareProfileIdx shift
}

// ─── Change 3: Remove top bar Share/Settings icons ────────────────────────
// Find "actions = {" in top bar context
const actionsStartIdx = lines.findIndex((l, i) => 
  l.includes('actions = {') && i > 600 && i < 700
);
if (actionsStartIdx >= 0) {
  console.log(`Found actions block starting at line ${actionsStartIdx + 1}`);
  // Find the closing "}," of the actions block
  let actionsEndIdx = -1;
  let depth = 1;
  for (let i = actionsStartIdx + 1; i < lines.length && i < actionsStartIdx + 40; i++) {
    const openCount = (lines[i].match(/{/g) || []).length;
    const closeCount = (lines[i].match(/}/g) || []).length;
    depth += openCount - closeCount;
    if (depth <= 0) {
      actionsEndIdx = i;
      break;
    }
  }
  if (actionsEndIdx >= 0) {
    console.log(`Actions block ends at line ${actionsEndIdx + 1}`);
    // Replace the actions block with just "actions = {},"
    lines[actionsStartIdx] = '                actions = {},';
    // Remove all lines between actionsStartIdx+1 and actionsEndIdx (inclusive)
    lines.splice(actionsStartIdx + 1, actionsEndIdx - actionsStartIdx);
    ops.push('Removed top bar Share and Settings icons');
  }
} else {
  console.log('WARNING: Could not find actions block');
}

// ─── Change 4: Remove Share, Verify KYC, Edit buttons from action row ────
// Find the Share button OutlinedButton
const shareBtnIdx = lines.findIndex(l => l.includes('viewModel.shareProfile(context)'));
if (shareBtnIdx >= 0) {
  console.log(`Found shareProfile button at line ${shareBtnIdx + 1}`);
  // Find the matching if (state.isOwnProfile) after the Share, VerifyKYC, Edit buttons
  // The structure is:
  //   Row {  // action buttons row
  //     OutlinedButton(share)
  //     if (state.isOwnProfile) {
  //       if (!kycVerified) Button(verifyKYC)
  //       OutlinedButton(edit)
  //     } else {
  //       follow/unfollow
  //     }
  
  // Find the action buttons Row start - search backwards for "Action Buttons" comment
  let actionRowStart = -1;
  for (let i = shareBtnIdx; i >= 0; i--) {
    if (lines[i].includes('Action Buttons')) {
      actionRowStart = i + 1; // Start of the Row
      break;
    }
  }
  
  if (actionRowStart >= 0) {
    // Find the follow/unfollow else block - this is where the Row has follow/unfollow
    // Find the "} else {" after the edit button
    let followBlockIdx = -1;
    for (let i = shareBtnIdx; i < shareBtnIdx + 60; i++) {
      if (lines[i] && lines[i].includes('} else {') && !lines[i].includes('viewModel') && !lines[i].includes('private')) {
        followBlockIdx = i;
        break;
      }
    }
    
    if (followBlockIdx >= 0) {
      console.log(`Found follow/unfollow else block at line ${followBlockIdx + 1}`);
      
      // We need to restructure: remove Share/VerifyKYC/Edit, keep follow/unfollow for non-own profile
      // New structure: if (state.isOwnProfile) { (nothing visible in action row) } else { follow/unfollow }
      // Replace lines from actionRowStart to before the MoreVert section
      
      // Find the end of follow/unfollow section (before Spacer(Modifier.weight(1f)))
      let weightIdx = -1;
      for (let i = followBlockIdx; i < followBlockIdx + 30; i++) {
        if (lines[i] && lines[i].includes('Spacer(Modifier.weight(1f))')) {
          weightIdx = i;
          break;
        }
      }
      
      if (weightIdx >= 0) {
        console.log(`Found spacer before MoreVert at line ${weightIdx + 1}`);
        
        // Replace everything from actionRowStart to weightIdx with just the follow/unfollow block
        // Keep the Row opening and closing braces
        const rowOpen = lines[actionRowStart];
        // The new content:
        const newActions = [
          rowOpen,
          `                            if (state.isOwnProfile) {
                                // Empty for own profile — no action buttons
                            } else {`,
        ];
        
        // Copy the follow/unfollow lines (from followBlockIdx + 1 to weightIdx)
        for (let i = followBlockIdx + 1; i < weightIdx; i++) {
          newActions.push(lines[i]);
        }
        newActions.push(`                            }`);
        
        // Calculate removal range
        const removeCount = weightIdx - actionRowStart;
        lines.splice(actionRowStart, removeCount, ...newActions);
        ops.push('Removed Share, Verify KYC, Edit buttons (kept follow/unfollow)');
      }
    }
  }
}

// ─── Change 5: Remove MoreVert/DropdownMenu section ──────────────────────
// Find the MoreVert IconButton
const moreVertIdx = lines.findIndex(l => l.includes('Icons.Default.MoreVert'));
if (moreVertIdx >= 0) {
  console.log(`Found MoreVert at line ${moreVertIdx + 1}`);
  
  // Find the closing "}" of the Box containing the MoreVert menu
  // The structure: Box { IconButton(...) DropdownMenu(...) }
  // After the Spacer(Modifier.weight(1f)), there's Box { IconButton }
  // Walk forward from moreVertIdx to find the closing braces
  
  // Find the "} // end of Row" or just the next "}" that closes the parent Row
  // Actually, we already removed up to weightIdx above. Let me just find the
  // current MoreVert if it still exists
  const moreVertNewIdx = lines.findIndex(l => l.includes('Icons.Default.MoreVert'));
  if (moreVertNewIdx >= 0) {
    // Remove from the line before Box { (line with Spacer weight) to "} // " end of parent
    let boxStart = -1;
    let boxEnd = -1;
    for (let i = moreVertNewIdx; i >= 0; i--) {
      if (lines[i] && lines[i].includes('Spacer(Modifier.weight(1f))')) {
        boxStart = i;
        break;
      }
    }
    // Find the Spacer that's within the action buttons Row (not the later one)
    // The closing of the outer Row for action buttons
    if (boxStart >= 0) {
      // Find the "}" that closes the Row (and the "// ─── Profile Tabs" that follows)
      for (let i = boxStart; i < boxStart + 40; i++) {
        if (lines[i] && lines[i].includes('// ─── Profile Tabs')) {
          boxEnd = i - 1;
          break;
        }
      }
      if (boxEnd >= 0) {
        // Replace with just the closing of the row (single "}")
        lines.splice(boxStart, boxEnd - boxStart + 1, '                        }');
        ops.push('Removed MoreVert drop-down menu');
      }
    }
  } else {
    console.log('MoreVert already removed');
  }
}

// ─── Change 6: Remove Feed, Reviews chips ──────────────────────────────────
const feedChipIdx = lines.findIndex(l => l.includes('label = "Feed"'));
if (feedChipIdx >= 0) {
  // Find the row that has Feed, Reviews and remove them
  // The row has: My Home, Feed, Reviews, Hub
  // Change to: My Home, Hub
  let feedRowStart = -1;
  for (let i = feedChipIdx; i >= 0; i--) {
    if (lines[i] && lines[i].includes('Row(modifier = Modifier.fillMaxWidth()') && lines[i].includes('horizontalArrangement = Arrangement.spacedBy(6.dp)')) {
      feedRowStart = i;
      break;
    }
  }
  if (feedRowStart >= 0) {
    // The row is from feedRowStart to the next Row start or the next HorizontalDivider
    // Search for the next row (the Sale Done row)
    const saleRowIdx = lines.findIndex((l, i) => i > feedRowStart && l.includes('label = "Sale Done"'));
    if (saleRowIdx >= 0) {
      const feedRowEnd = saleRowIdx - 2; // blank line between rows
      // Remove Feed and Reviews lines
      const newFeedRow = [
        `                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {`,
        `                                    CompactActionChip(icon = Icons.AutoMirrored.Filled.ListAlt, label = "My Home", accentColor = Color(0xFF10B981), onClick = onOpenMyPosts, modifier = Modifier.weight(1f))`,
        `                                    CompactActionChip(icon = Icons.Filled.Dashboard, label = "Hub", accentColor = Color(0xFF8B5CF6), onClick = onOpenCentre, modifier = Modifier.weight(1f))`,
        `                                }`,
      ];
      lines.splice(feedRowStart, feedRowEnd - feedRowStart + 1, ...newFeedRow);
      ops.push('Removed Feed, Reviews chips from Quick Actions');
    }
  }
}

// ─── Change 7: Remove Offers chip + rename Reactivate → Sale Undone ──────
const reactivateIdx = lines.findIndex(l => l.includes('label = "Reactivate"'));
if (reactivateIdx >= 0) {
  // Find the row start
  let saleRowStart = -1;
  for (let i = reactivateIdx; i >= 0; i--) {
    if (lines[i] && lines[i].includes('Row(modifier = Modifier.fillMaxWidth()') && lines[i].includes('spacedBy(6.dp)')) {
      saleRowStart = i;
      break;
    }
  }
  if (saleRowStart >= 0) {
    // Find the end of this row
    let saleRowEnd = -1;
    for (let i = saleRowStart; i < saleRowStart + 10; i++) {
      if (lines[i] && lines[i].includes('HorizontalDivider') || 
          (lines[i] && lines[i].startsWith('                        //') && !lines[i].includes('Action'))) {
        saleRowEnd = i - 1;
        break;
      }
    }
    if (saleRowEnd < 0) {
      // Search for the next Row or post grid section
      for (let i = saleRowStart; i < saleRowStart + 15; i++) {
        if (lines[i] && lines[i].includes('User Posts Grid')) {
          saleRowEnd = i - 2;
          break;
        }
      }
    }
    if (saleRowEnd < 0) {
      // Just find the last closing brace of this section
      for (let i = saleRowStart + 4; i < saleRowStart + 10; i++) {
        if (lines[i] && lines[i].trim() === '}' && !lines[i].includes('{')){
          saleRowEnd = i;
          break;
        }
      }
    }
    if (saleRowEnd >= 0) {
      const newSaleRow = [
        `                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {`,
        `                                    CompactActionChip(icon = Icons.Filled.CheckCircle, label = "Sale Done", accentColor = Color(0xFF22C55E), onClick = onOpenSaleDone, modifier = Modifier.weight(1f))`,
        `                                    CompactActionChip(icon = Icons.Filled.RadioButtonUnchecked, label = "Sale Undone", accentColor = Color(0xFFEF4444), onClick = onOpenSaleUndone, modifier = Modifier.weight(1f))`,
        `                                }`,
      ];
      lines.splice(saleRowStart, saleRowEnd - saleRowStart + 1, ...newSaleRow);
      ops.push('Removed Offers chip, renamed Reactivate → Sale Undone');
    }
  }
}

// ─── Change 8: Remove SettingsTab and ReviewsTab call sites ──────────────
// Find "Tab 3: Settings" and "Tab 4: Reviews"
const settingsTabCall = lines.findIndex(l => l.includes('Tab 3: Settings'));
if (settingsTabCall >= 0) {
  // Find the end of ReviewsTab call (the blank line before Spacer)
  let reviewsTabEnd = -1;
  for (let i = settingsTabCall; i < lines.length && i < settingsTabCall + 40; i++) {
    if (lines[i] && lines[i].includes('ReviewsTab(reviews')) {
      // Found ReviewsTab, now find the closing of this block
      for (let j = i; j < i + 10; j++) {
        if (lines[j] && lines[j].includes('Spacer(Modifier.height(24.dp))') && j > i) {
          reviewsTabEnd = j - 1;
          break;
        }
      }
      break;
    }
  }
  if (reviewsTabEnd >= 0) {
    lines.splice(settingsTabCall, reviewsTabEnd - settingsTabCall + 1);
    ops.push('Removed SettingsTab and ReviewsTab call sites');
  } else {
    console.log('WARNING: Could not find ReviewsTab call end');
  }
}

// ─── Change 9: Remove Messages row from All Settings ─────────────────────
const messagesIdx = lines.findIndex(l => l.includes('Messages') && l.includes('subtitle = "Chat with buyers"'));
if (messagesIdx >= 0) {
  lines.splice(messagesIdx, 1);
  ops.push('Removed Messages/Chat row from All Settings');
}

// ─── Change 10: Remove SettingsTab function, SettingsRow, ReviewsTab ────
const settingsTabFunStart = lines.findIndex(l => l.includes('private fun SettingsTab('));
if (settingsTabFunStart >= 0) {
  // Find the end of ReviewsTab function (before "private data class ProfileLocationParts")
  const dataClassIdx = lines.findIndex((l, i) => i > settingsTabFunStart && l.includes('private data class ProfileLocationParts'));
  if (dataClassIdx >= 0) {
    lines.splice(settingsTabFunStart, dataClassIdx - settingsTabFunStart);
    ops.push('Removed SettingsTab, SettingsRow, ReviewsTab function definitions');
  } else {
    console.log('WARNING: Could not find data class marker');
  }
}

// ─── Write back ────────────────────────────────────────────────────────────
const output = lines.join('\r\n');
fs.writeFileSync(filePath, output, 'utf8');
console.log(`\n✅ Applied ${ops.length} changes:`);
ops.forEach(o => console.log(`  • ${o}`));
console.log(`File now has ${lines.length} lines`);
