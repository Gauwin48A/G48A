#!/usr/bin/env python3
"""
Apply remaining ProfileScreen.kt changes that failed to apply via JS scripts.
Uses line-number-based operations for reliability.
"""
import re

path = r"C:\Users\laksh\GITHUB\1hub_rep2\G48A\android-native\app\src\main\java\com\mhub\app\ui\profile\ProfileScreen.kt"

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Read {len(lines)} lines")

changes_made = []

# ─────────────────────────────────────────────────────────────────────
# 1. Remove Share OutlinedButton (lines around 1056)
# Find the block starting with OutlinedButton containing shareProfile
# ─────────────────────────────────────────────────────────────────────
i = 0
while i < len(lines):
    if 'viewModel.shareProfile(context)' in lines[i]:
        # Find the start of this OutlinedButton
        start = i
        while start > 0 and not lines[start].strip().startswith('OutlinedButton('):
            start -= 1
        # Find the end of this OutlinedButton
        end = i
        depth = 0
        while end < len(lines):
            if '{' in lines[end]:
                depth += lines[end].count('{')
            if '}' in lines[end]:
                depth -= lines[end].count('}')
            if depth <= 0 and end > i:
                end += 1
                break
            end += 1
        # Also include the next line if it's a Spacer
        if end < len(lines) and 'Spacer' in lines[end]:
            end += 1
        # Remove lines start-1 (the blank line before) to end
        actual_start = start - 1
        while actual_start >= 0 and lines[actual_start].strip() == '':
            actual_start -= 1
        actual_start += 1  # Keep the blank line before
        
        removed = lines[actual_start:end]
        lines[actual_start:end] = []
        changes_made.append(f"Removed Share OutlinedButton (lines {actual_start+1}-{end})")
        i = actual_start
    i += 1

# ─────────────────────────────────────────────────────────────────────
# 2. Remove KYC Verify Button (the Button with onOpenKyc onClick)
# ─────────────────────────────────────────────────────────────────────
i = 0
while i < len(lines):
    line = lines[i]
    if 'onClick = onOpenKyc' in line and 'Button(' in ''.join(lines[max(0,i-5):i+1]):
        # Find the start of this Button
        start = i
        while start > 0 and 'Button(' not in lines[start]:
            start -= 1
        # Make sure it's not OutlinedButton
        if 'OutlinedButton' in lines[start]:
            i += 1
            continue
        # Find the end - look for the closing of the Button lambda
        end = i
        depth = 0
        found_start = False
        while end < len(lines):
            if '{' in lines[end]:
                depth += lines[end].count('{')
                found_start = True
            if '}' in lines[end]:
                depth -= lines[end].count('}')
            if found_start and depth <= 0 and end > i:
                end += 1
                break
            end += 1
        
        # Remove from line before start to end
        actual_start = start - 1
        while actual_start >= 0 and lines[actual_start].strip() == '':
            actual_start -= 1
        actual_start += 1
        
        removed = lines[actual_start:end]
        lines[actual_start:end] = []
        changes_made.append(f"Removed KYC Button (lines {actual_start+1}-{end})")
        i = actual_start
    i += 1

# ─────────────────────────────────────────────────────────────────────
# 3. Remove Edit OutlinedButton (the Prominent Edit Profile button)
# ─────────────────────────────────────────────────────────────────────
i = 0
while i < len(lines):
    line = lines[i]
    if 'showEditDialog = true' in line and 'OutlinedButton' in ''.join(lines[max(0,i-5):i+1]):
        # Find the start of this OutlinedButton
        start = i
        while start > 0 and 'OutlinedButton(' not in lines[start]:
            start -= 1
        # Find the end
        end = i
        depth = 0
        found_start = False
        while end < len(lines):
            if '{' in lines[end]:
                depth += lines[end].count('{')
                found_start = True
            if '}' in lines[end]:
                depth -= lines[end].count('}')
            if found_start and depth <= 0 and end > i:
                end += 1
                break
            end += 1
        
        actual_start = start - 1
        while actual_start >= 0 and lines[actual_start].strip() == '':
            actual_start -= 1
        actual_start += 1
        
        removed = lines[actual_start:end]
        lines[actual_start:end] = []
        changes_made.append(f"Removed Edit OutlinedButton (lines {actual_start+1}-{end})")
        i = actual_start
    i += 1

# ─────────────────────────────────────────────────────────────────────
# 4. Remove dead code sections
# ─────────────────────────────────────────────────────────────────────

# 4a. Remove UserReview data class definition and reviews field
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if skip_until > i:
        continue
    
    # Remove 'val reviews: List<UserReview>' from ProfileState
    if 'val reviews: List<UserReview>' in line:
        changes_made.append(f"Removed reviews field from ProfileState (line {i+1})")
        continue
    
    # Remove UserReview data class
    if line.strip().startswith('data class UserReview'):
        # Skip until the closing brace
        j = i
        depth = 0
        while j < len(lines):
            if '{' in lines[j]:
                depth += lines[j].count('{')
            if '}' in lines[j]:
                depth -= lines[j].count('}')
            j += 1
            if depth <= 0:
                break
        skip_until = j
        changes_made.append(f"Removed UserReview data class (lines {i+1}-{j})")
        continue
    
    # Remove the loadReviews function - find 'fun loadReviews()'
    if line.strip().startswith('fun loadReviews()'):
        j = i
        depth = 0
        while j < len(lines):
            if '{' in lines[j]:
                depth += lines[j].count('{')
            if '}' in lines[j]:
                depth -= lines[j].count('}')
            j += 1
            if depth <= 0:
                break
        # Also remove the 'private var reviewsLoaded = false' line before it
        k = i - 3
        while k >= 0:
            if 'reviewsLoaded' in lines[k]:
                # Remove from k to j
                new_lines.extend(lines[len(new_lines):k])
                skip_until = j
                changes_made.append(f"Removed loadReviews and reviewsLoaded (lines {k+1}-{j})")
                break
            k -= 1
        else:
            skip_until = j
            changes_made.append(f"Removed loadReviews function (lines {i+1}-{j})")
        continue
    
    new_lines.append(line)
lines = new_lines

# ─────────────────────────────────────────────────────────────────────
# 5. Remove ReviewsTab composable function and its call
# ─────────────────────────────────────────────────────────────────────
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if skip_until > i:
        continue
    
    # Remove ReviewsTab call in selectedTab == 4 block
    if 'ReviewsTab(reviews = state.reviews)' in line:
        changes_made.append(f"Removed ReviewsTab call (line {i+1})")
        # Also remove the LaunchedEffect line before it
        if i > 0 and 'loadReviews' in lines[i-1]:
            new_lines = lines[:i-1]
            skip_until = i + 1
            changes_made.append(f"Also removed LaunchedEffect loadReviews (line {i})")
            continue
    
    # Remove ReviewsTab composable function
    if line.strip().startswith('private fun ReviewsTab('):
        j = i
        depth = 0
        while j < len(lines):
            if '{' in lines[j]:
                depth += lines[j].count('{')
            if '}' in lines[j]:
                depth -= lines[j].count('}')
            j += 1
            if depth <= 0:
                break
        skip_until = j
        changes_made.append(f"Removed ReviewsTab composable (lines {i+1}-{j})")
        continue
    
    new_lines.append(line)
lines = new_lines

# ─────────────────────────────────────────────────────────────────────
# 6. Replace EditProfileDialog call with EditProfileScreen
# ─────────────────────────────────────────────────────────────────────
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if skip_until > i:
        continue
    
    # Find the EditProfileDialog call block
    stripped = line.strip()
    if stripped == 'if (showEditDialog) {' or stripped == 'if (showEditDialog) {':
        # Find the matching closing brace
        j = i
        depth = 0
        while j < len(lines):
            if '{' in lines[j]:
                depth += lines[j].count('{')
            if '}' in lines[j]:
                depth -= lines[j].count('}')
            j += 1
            if depth <= 0:
                break
        
        # Check if this block contains EditProfileDialog
        block_text = ''.join(lines[i:j])
        if 'EditProfileDialog' in block_text:
            # Replace the entire block with nothing (remove it)
            skip_until = j
            changes_made.append(f"Removed EditProfileDialog block (lines {i+1}-{j})")
            continue
    
    new_lines.append(line)
lines = new_lines

# ─────────────────────────────────────────────────────────────────────
# 7. Remove "All Settings" collapsible section
# ─────────────────────────────────────────────────────────────────────
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if skip_until > i:
        continue
    
    stripped = line.strip()
    if 'All Settings' in line and ('showSettingsExpanded' in line or 'showSettingsExpanded' in ''.join(lines[max(0,i-3):i+3])):
        # Find the start of the Card that contains "All Settings"
        start = i
        while start > 0 and 'Card(' not in lines[start] and 'Surface(' not in lines[start]:
            start -= 1
        # Check if we're in the right section
        nearby_text = ''.join(lines[start:i+5])
        if 'All Settings' in nearby_text:
            # Find the end of this section
            j = i
            depth = 0
            # Look for next major section start (next item/tab block or Spacer)
            marker_found = False
            while j < len(lines):
                if 'HorizontalDivider' in lines[j]:
                    pass  # Divider is part of this section
                if selectedTab and 'selectedTab' in lines[j] and j > i + 5:
                    marker_found = True
                    break
                if 'Spacer(Modifier.height(24.dp))' in lines[j] and j > i + 5:
                    marker_found = True
                    j += 1
                    break
                j += 1
            
            if marker_found:
                removed = lines[start:j]
                new_lines.extend(lines[len(new_lines):start])
                skip_until = j
                changes_made.append(f"Removed All Settings section (lines {start+1}-{j})")
                continue
    
    new_lines.append(line)
lines = new_lines

# ─────────────────────────────────────────────────────────────────────
# 8. Remove the old EditProfileDialog composable function at bottom of file
# ─────────────────────────────────────────────────────────────────────
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if skip_until > i:
        continue
    
    stripped = line.strip()
    if stripped.startswith('private fun EditProfileDialog('):
        j = i
        depth = 0
        while j < len(lines):
            if '{' in lines[j]:
                depth += lines[j].count('{')
            if '}' in lines[j]:
                depth -= lines[j].count('}')
            j += 1
            if depth <= 0:
                break
        skip_until = j
        changes_made.append(f"Removed EditProfileDialog composable (lines {i+1}-{j})")
        continue
    
    new_lines.append(line)
lines = new_lines

print(f"\nChanges made: {len(changes_made)}")
for c in changes_made:
    print(f"  ✓ {c}")

print(f"\nTotal lines after changes: {len(lines)}")

# Write back
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"File written successfully")
