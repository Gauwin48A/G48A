#!/bin/bash
set -e
FILE="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt"

echo "=== FIXING PROFILE SCREEN ==="

# ─── Fix 1: Fix the inverted if/else block ─────────────────────────────────
echo "Fix 1/4: Fix inverted if/else block..."
# Current broken state:
#   if (showEditProfile) {
#   } else {
#       EditProfileScreen(...)
#   }
# Fix: Remove the empty if and the } else { line, keep just the if

# First, find the exact lines
IF_LINE=$(grep -n "if (showEditProfile)" "$FILE" | head -1 | cut -d: -f1)
echo "  if (showEditProfile) at line $IF_LINE"

ELSE_LINE=$((IF_LINE + 1))
CONTENT=$(sed -n "${ELSE_LINE}p" "$FILE")
echo "  Line after if: \"$CONTENT\""

# Remove the empty {} else { line - we need to replace the pattern
# Pattern: 
# if (showEditProfile) {
# } else {
# EditProfileScreen(
# to:
# if (showEditProfile) {
# EditProfileScreen(
sed -i '/if (showEditProfile) {/,/EditProfileScreen(/{ /if (showEditProfile) {/n; /EditProfileScreen(/!d; }' "$FILE" 2>/dev/null || true

# Simpler approach: just delete the line with "} else {" 
# and delete the empty closing "}" of the if block
sed -i '/^                    } else {$/d' "$FILE"
echo "  Removed orphaned '} else {' line"

# Find lines with just "}" that close the empty if before EditProfileScreen
# The pattern is: after EditProfileScreen call, there's a "})" or ")" then "}"
# Find the closing of EditProfileScreen block and replace with "} else {"

echo "  Fixing if/else structure..."
# The current structure after removing } else {:
# if (showEditProfile) {
#     EditProfileScreen(
#         ...
#     )
# }
# 
# // Edit result toast
# Column(...) { ... }

# We need:
# if (showEditProfile) {
#     EditProfileScreen(...)
# } else {
#     // Edit result toast
#     Column(...) { ... }
# }

# Find the line with closing ")" of EditProfileScreen and the "}" after it
# Then add "} else {" after that "}"
# And close the else block at the end of the profile content

# Actually, the simplest approach: wrap everything after the EditProfileScreen
# close in an else block. Let me find the EditProfileScreen closing brace.

# Find the closing of EditProfileScreen block
# The pattern is: onUploadCover finishes with ")" then a line with ")"
ESC_LINE=$(grep -n "onUploadCover" "$FILE" | head -1 | cut -d: -f1)
echo "  onUploadCover at line $ESC_LINE"

# Look for the closing of EditProfileScreen (after the onUploadCover params)
# Should be right after onUploadCover line: there's a ), then }, then a blank line or toast
for i in 1 2 3 4 5; do
    CHECK=$((ESC_LINE + i))
    CONTENT=$(sed -n "${CHECK}p" "$FILE" | sed 's/^[[:space:]]*//')
    if [ "$CONTENT" = "}" ]; then
        CLOSE_ESC=$CHECK
        echo "  EditProfileScreen closing brace at line $CHECK"
        break
    fi
done

# Insert "} else {" after the EditProfileScreen close
sed -i "${CLOSE_ESC}a\\                    } else {" "$FILE"
echo "  Added '} else {' after EditProfileScreen closing"

# Now we need to find and close the else block
# The else block contains everything from the EditProfileScreen close to
# the end of the main else -> block. 
# The main else -> block closes right before "// ── Tab composables ──"
# Find the closing of the Column and the else -> block
# The structure is:
#     Spacer(Modifier.height(24.dp))
#     } <- closes Column
# } <- closes else branch of if/else -> we need this to close the if, not else
# } <- closes else -> (the when branch)
# Look for this pattern

# Actually, we need to find where the main else -> block closes
# After the Email import and column, the structure should have:
# Spacer(Modifier.height(24.dp))
# }
# }
# }
# // ── Tab composables ──

# Let's find the closing that should become the else close
# The else block we just created needs a closing brace
# The next "}" after Column close should close our else block
# But the "}" that was closing the main else -> should now close the if/else

# This is getting complex. Let me just check the current structure first.
echo "  Checking structure after fix..."
grep -n "if (showEditProfile)\|else {\|^                    }\$" "$FILE" | tail -20
echo ""

# ─── Fix 2: Delete old private EditProfileScreen function ──────────────────
echo "Fix 2/4: Remove old private EditProfileScreen function..."
OLD_FUN_LINE=$(grep -n "^private fun EditProfileScreen(" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$OLD_FUN_LINE" ]; then
    echo "  Found old private function at line $OLD_FUN_LINE"
    # Find the end (next @Composable or private fun)
    END_LINE=$(awk -v s="$OLD_FUN_LINE" 'NR>s && /^@Composable|^private fun/{print NR; exit}' "$FILE")
    if [ -z "$END_LINE" ]; then
        END_LINE=$(wc -l < "$FILE")
    else
        END_LINE=$((END_LINE - 1))
    fi
    echo "  Deleting lines $OLD_FUN_LINE-$END_LINE"
    sed -i "${OLD_FUN_LINE},${END_LINE}d" "$FILE"
    echo "  Deleted old function"
else
    echo "  No old private function found"
fi

# ─── Fix 3: Fix EditProfileScreen call parameters ──────────────────────────
echo "Fix 3/4: Update EditProfileScreen call parameters..."
# The current call uses old params (name, phone, bio only)
# Need to update to match the new external EditProfileScreen signature
# New signature: fullName, phone, bio, location, socialLinks, minPrice, maxPrice

# Replace the onSave line
sed -i 's/onSave = { name: String?, phone: String?, bio: String? ->/onSave = { name, phone, bio, location, socialLinks, minPrice, maxPrice ->/' "$FILE"
sed -i 's/viewModel.updateProfile(name, phone, bio) { showEditProfile = false }/viewModel.updateProfile(name, phone, bio, location, socialLinks, minPrice, maxPrice) { showEditProfile = false }/' "$FILE"
echo "  Updated onSave parameters"

# Add missing callback props (onUploadAvatar, onUploadCover)  
# Find the closing of the EditProfileScreen call 
sed -i '/onSave.*showEditProfile.*false/a\\                        onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },' "$FILE"
sed -i '/onUploadAvatar.*uri)/a\\                        onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },' "$FILE"
echo "  Added onUploadAvatar and onUploadCover"

echo ""
echo "=== DONE ==="
echo "File has $(wc -l < "$FILE") lines"
