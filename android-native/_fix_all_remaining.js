#!/usr/bin/env node
/**
 * Apply remaining ProfileScreen.kt changes using line-based operations.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf-8');
const original = content;

const changes = [];

// ─── Helper: find block start/end by brace counting ───
function findBlockEnd(lines, startIdx, minDepth = 0) {
  let depth = 0;
  let i = startIdx;
  for (; i < lines.length; i++) {
    const opens = (lines[i].match(/{/g) || []).length;
    const closes = (lines[i].match(/}/g) || []).length;
    depth += opens - closes;
    if (depth <= minDepth && i > startIdx) {
      return i + 1;
    }
  }
  return lines.length;
}

function findBlockStart(lines, startIdx) {
  let depth = 0;
  let i = startIdx;
  for (; i >= 0; i--) {
    const opens = (lines[i].match(/{/g) || []).length;
    const closes = (lines[i].match(/}/g) || []).length;
    depth += closes - opens;
    if (depth < 0 && i < startIdx) {
      return i + 1;
    }
  }
  return 0;
}

// Read as lines
let lines = content.split('\n');
let newLines = [...lines];
let skipUntil = -1;

// ─────────────────────────────────────────────────────────────────
// 1. Remove the Share OutlinedButton from action bar (around line 1056)
// ─────────────────────────────────────────────────────────────────
function removeShareButton(lines) {
  const result = [];
  let removed = false;
  for (let i = 0; i < lines.length; i++) {
    if (!removed && lines[i].includes('viewModel.shareProfile(context)') && lines[i].includes('onClick')) {
      // Find the start of this OutlinedButton
      let start = i;
      while (start > 0 && !lines[start].trim().startsWith('OutlinedButton(')) start--;
      // If the line before start is blank, include it
      if (start > 0 && lines[start-1].trim() === '') start--;
      // Find the end of this block
      let end = start;
      let depth = 0;
      let started = false;
      while (end < lines.length) {
        const opens = (lines[end].match(/{/g) || []).length;
        const closes = (lines[end].match(/}/g) || []).length;
        if (opens > 0) started = true;
        depth += opens - closes;
        if (started && depth <= 0 && end > start) {
          end++;
          break;
        }
        end++;
      }
      changes.push(`Removed Share OutlinedButton (lines ${start+1}-${end})`);
      removed = true;
      // Skip the removed lines
      i = end - 1;
      continue;
    }
    result.push(lines[i]);
  }
  return result;
}
lines = removeShareButton(lines);

// ─────────────────────────────────────────────────────────────────
// 2. Remove the KYC Verify Button
// ─────────────────────────────────────────────────────────────────
function removeKycButton(lines) {
  const result = [];
  let removed = false;
  for (let i = 0; i < lines.length; i++) {
    if (!removed && lines[i].includes('onClick = onOpenKyc') && lines[i].includes('Button(')) {
      // Find the start of this Button
      let start = i;
      while (start > 0 && !lines[start].trim().startsWith('Button(')) start--;
      // Don't remove OutlinedButton
      if (lines[start].trim().startsWith('OutlinedButton(')) {
        result.push(lines[i]);
        continue;
      }
      if (start > 0 && lines[start-1].trim() === '') start--;
      let end = start;
      let depth = 0;
      let started = false;
      while (end < lines.length) {
        const opens = (lines[end].match(/{/g) || []).length;
        const closes = (lines[end].match(/}/g) || []).length;
        if (opens > 0) started = true;
        depth += opens - closes;
        if (started && depth <= 0 && end > start) {
          end++;
          break;
        }
        end++;
      }
      changes.push(`Removed KYC Button (lines ${start+1}-${end})`);
      removed = true;
      i = end - 1;
      continue;
    }
    result.push(lines[i]);
  }
  return result;
}
lines = removeKycButton(lines);

// ─────────────────────────────────────────────────────────────────
// 3. Remove the Edit OutlinedButton
// ─────────────────────────────────────────────────────────────────
function removeEditButton(lines) {
  const result = [];
  let removed = false;
  for (let i = 0; i < lines.length; i++) {
    if (!removed && lines[i].includes('showEditDialog = true') && 
        !lines[i].includes('onEdit') && !lines[i].includes('onEditPersonal')) {
      // Check if this is in a Button/OutlinedButton context
      let checkStart = Math.max(0, i - 3);
      let context = lines.slice(checkStart, i + 1).join(' ');
      if (context.includes('OutlinedButton') && context.includes('Edit')) {
        // Find the start of this OutlinedButton
        let start = i;
        while (start > 0 && !lines[start].trim().startsWith('OutlinedButton(')) start--;
        if (start > 0 && lines[start-1].trim() === '') start--;
        let end = start;
        let depth = 0;
        let started = false;
        while (end < lines.length) {
          const opens = (lines[end].match(/{/g) || []).length;
          const closes = (lines[end].match(/}/g) || []).length;
          if (opens > 0) started = true;
          depth += opens - closes;
          if (started && depth <= 0 && end > start) {
            end++;
            break;
          }
          end++;
        }
        changes.push(`Removed Edit OutlinedButton (lines ${start+1}-${end})`);
        removed = true;
        i = end - 1;
        continue;
      }
    }
    result.push(lines[i]);
  }
  return result;
}
lines = removeEditButton(lines);

// ─────────────────────────────────────────────────────────────────
// 4. Remove UserReview data class and reviews field from ProfileState
// ─────────────────────────────────────────────────────────────────
function removeDeadDataClasses(lines) {
  const result = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    
    // Remove 'val reviews: List<UserReview>' from ProfileState
    if (lines[i].includes('val reviews: List<UserReview>')) {
      changes.push(`Removed reviews field from ProfileState (line ${i+1})`);
      continue;
    }
    
    // Remove UserReview data class
    if (lines[i].trim().match(/^data class UserReview\b/)) {
      let end = findBlockEnd(lines, i);
      // Make sure we don't eat half the file
      if (end - i < 50) {
        skipUntil = end;
        changes.push(`Removed UserReview data class (lines ${i+1}-${end})`);
        continue;
      }
    }
    
    result.push(lines[i]);
  }
  return result;
}
lines = removeDeadDataClasses(lines);

// ─────────────────────────────────────────────────────────────────
// 5. Remove loadReviews function and reviewsLoaded variable
// ─────────────────────────────────────────────────────────────────
function removeLoadReviews(lines) {
  const result = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    
    // Remove reviewsLoaded and loadReviews
    if (lines[i].trim().match(/^private var reviewsLoaded = false/) ||
        lines[i].trim().match(/^private var reviewsLoaded\s*=\s*false/)) {
      // Find loadReviews function after this
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('fun loadReviews()')) j++;
      if (j < lines.length) {
        let end = findBlockEnd(lines, j);
        if (end - i < 100) {
          skipUntil = end;
          changes.push(`Removed loadReviews and reviewsLoaded (lines ${i+1}-${end})`);
          continue;
        }
      }
    }
    
    result.push(lines[i]);
  }
  return result;
}
lines = removeLoadReviews(lines);

// ─────────────────────────────────────────────────────────────────
// 6. Remove ReviewsTab call in tab section and ReviewsTab composable
// ─────────────────────────────────────────────────────────────────
function removeReviewsTab(lines) {
  const result = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    
    // Remove ReviewsTab from main composable
    if (lines[i].includes('ReviewsTab(reviews = state.reviews)')) {
      // Also remove the LaunchedEffect line before it
      const prevLine = result.length > 0 ? result[result.length - 1] : '';
      if (prevLine.includes('loadReviews()')) {
        result.pop(); // Remove the LaunchedEffect line
        changes.push(`Removed LaunchedEffect loadReviews and ReviewsTab call`);
      } else {
        changes.push(`Removed ReviewsTab call (line ${i+1})`);
      }
      continue;
    }
    
    // Remove the ReviewsTab composable function itself
    if (lines[i].trim().match(/^private fun ReviewsTab\(/)) {
      let end = findBlockEnd(lines, i);
      if (end - i < 200) { // Safety check
        skipUntil = end;
        changes.push(`Removed ReviewsTab composable (lines ${i+1}-${end})`);
        continue;
      }
    }
    
    result.push(lines[i]);
  }
  return result;
}
lines = removeReviewsTab(lines);

// ─────────────────────────────────────────────────────────────────
// 7. Remove EditProfileDialog composable function from bottom of file
// ─────────────────────────────────────────────────────────────────
function removeEditProfileDialogComposable(lines) {
  const result = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    
    if (lines[i].trim().match(/^private fun EditProfileDialog\(/)) {
      let end = findBlockEnd(lines, i);
      if (end - i < 100) {
        skipUntil = end;
        changes.push(`Removed EditProfileDialog composable (lines ${i+1}-${end})`);
        continue;
      }
    }
    
    result.push(lines[i]);
  }
  return result;
}
lines = removeEditProfileDialogComposable(lines);

// ─────────────────────────────────────────────────────────────────
// 8. Remove EditProfileDialog call block (if (showEditDialog) { ... })
// ─────────────────────────────────────────────────────────────────
function removeEditDialogBlock(lines) {
  const result = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    
    const trimmed = lines[i].trim();
    if (trimmed === 'if (showEditDialog) {' || trimmed === 'if (showEditDialog) {') {
      // Check if this block contains EditProfileDialog
      let end = findBlockEnd(lines, i);
      const block = lines.slice(i, end).join('\n');
      if (block.includes('EditProfileDialog')) {
        skipUntil = end;
        changes.push(`Removed EditProfileDialog call block (lines ${i+1}-${end})`);
        continue;
      }
    }
    
    result.push(lines[i]);
  }
  return result;
}
// Do this one last since it changes line numbers
lines = removeEditDialogBlock(lines);

// ─────────────────────────────────────────────────────────────────
// 9. Remove "All Settings" collapsible section
// Find the Card that contains "All Settings" header
// ─────────────────────────────────────────────────────────────────
function removeAllSettingsSection(lines) {
  const result = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue;
    
    if (lines[i].includes('All Settings') && lines[i].includes('Selling, orders, account')) {
      // Find start - look for Card( before this
      let start = i;
      while (start > 0) {
        const s = lines[start].trim();
        if (s.startsWith('Card(') || s.startsWith('Card (')) break;
        // Also check for HorizontalDivider that might precede it
        start--;
        if (start < i - 20) { start = i; break; }
      }
      if (start >= i) { result.push(lines[i]); continue; }
      
      // Find end - look for the closing sequence
      let end = i;
      let consecutiveBlank = 0;
      let foundEnd = false;
      while (end < lines.length) {
        // Look for "Sign Out" button or the next tab
        if (lines[end].includes('Sign Out') || lines[end].includes('onClick = { viewModel.logout(onSignedOut) }')) {
          foundEnd = true;
          break;
        }
        if (lines[end].includes('selectedTab == 1')) {
          foundEnd = true;
          break;
        }
        if (lines[end].includes('Spacer(Modifier.height(24.dp))') && end > i + 5) {
          foundEnd = true;
          break;
        }
        end++;
        if (end - i > 200) break; // safety
      }
      
      if (foundEnd) {
        // Go back to find where this section actually ends (before the Sign Out button or next section)
        let sectionEnd = end;
        // Remove from start to sectionEnd
        const removedCount = sectionEnd - start;
        changes.push(`Removed All Settings section (lines ${start+1}-${sectionEnd})`);
        skipUntil = sectionEnd;
        // Add any section that comes after (like the Sign Out button area)
        // Don't add to result - let the next iteration handle it
        // Actually we want to keep the Sign Out button
        // So let's add everything from sectionEnd onwards
        for (let j = sectionEnd; j < lines.length; j++) {
          result.push(lines[j]);
        }
        break;
      }
    }
    result.push(lines[i]);
  }
  return result;
}
lines = removeAllSettingsSection(lines);

// ─────────────────────────────────────────────────────────────────
// Final result
// ─────────────────────────────────────────────────────────────────
const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log(`Changes applied: ${changes.length}`);
changes.forEach(c => console.log(`  ✓ ${c}`));
console.log(`\nFile size: ${original.length} → ${newContent.length} bytes`);
console.log('Done!');
