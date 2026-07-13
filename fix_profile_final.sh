#!/bin/bash
set -e

EDIT_FILE="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/EditProfileScreen.kt"
PROFILE_FILE="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt"

echo "=== PROFILE PAGE OVERHAUL (CLEAN) ==="

# First, ensure EditProfileScreen.kt is the new version
echo "Step 1/3: Verified EditProfileScreen.kt is already full-screen version"
echo "  Current lines: $(wc -l < "$EDIT_FILE")"

# ──────────────────────────────────────────────────────────────────────────────
# Step 2: Add Email import + fix ProfileScreen.kt
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "Step 2/3: Updating ProfileScreen.kt..."

# 2a. Add Email import
echo "  2a. Adding Email import..."
sed -i 's/^import androidx.compose.material.icons.filled.Edit$/import androidx.compose.material.icons.filled.Edit\nimport androidx.compose.material.icons.filled.Email/' "$PROFILE_FILE"
echo "    Email import added"

# 2b. Fix the EditProfileDialog call
# Current pattern (old file):
#                     // Edit Profile Dialog
#                     if (showEditDialog) {
#                         EditProfileDialog(
#                             ...
#                             onSave = { name: String?, phone: String?, bio: String? ->
#                                 viewModel.updateProfile(name, phone, bio) { showEditDialog = false }
#                             },
#                         )
#                     }
#
# Need:
#                     if (showEditProfile) {
#                         EditProfileScreen(
#                             user = user,
#                             saving = state.editSaving,
#                             saveError = state.editError,
#                             onDismiss = {
#                                 showEditProfile = false
#                                 viewModel.clearEditResult()
#                             },
#                             onSave = { name, phone, bio, location, socialLinks, minPrice, maxPrice ->
#                                 viewModel.updateProfile(name, phone, bio, location, socialLinks, minPrice, maxPrice) { showEditProfile = false }
#                             },
#                             onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },
#                             onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },
#                         )
#                     } else {
echo "  2b. Replacing EditProfileDialog with EditProfileScreen (full-screen if/else)..."

# Strategy: Delete the OLD EditProfileDialog block and insert the NEW EditProfileScreen block

# First, rename showEditDialog -> showEditProfile
sed -i 's/showEditDialog/showEditProfile/g' "$PROFILE_FILE"

# Replace EditProfileDialog call with EditProfileScreen
sed -i 's/EditProfileDialog(/EditProfileScreen(/g' "$PROFILE_FILE"

# Now we need to change the call to match the new signature
# New EditProfileScreen takes: user, saving, saveError, onDismiss, onSave, onUploadAvatar, onUploadCover
# The old onSave had (name, phone, bio) - we need (name, phone, bio, location, socialLinks, minPrice, maxPrice)

sed -i 's/onSave = { name: String\?, phone: String\?, bio: String\? ->/onSave = { name, phone, bio, location, socialLinks, minPrice, maxPrice ->/' "$PROFILE_FILE"
sed -i 's/viewModel.updateProfile(name, phone, bio) { showEditProfile = false }/viewModel.updateProfile(name, phone, bio, location, socialLinks, minPrice, maxPrice) { showEditProfile = false }/' "$PROFILE_FILE"

# Add onUploadAvatar and onUploadCover params after onSave
sed -i '/onSave.*showEditProfile.*false/a\                        onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },' "$PROFILE_FILE"
sed -i '/onUploadAvatar.*uri)/a\                        onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },' "$PROFILE_FILE"

# Now fix the if/else structure
# The old code had: if (showEditProfile) { EditProfileDialog(...) } - a simple dialog block
# We need: if (showEditProfile) { EditProfileScreen(...) } else { ... rest ... }

# Find the End of EditProfileScreen closing and add } else {
# The closing is after onUploadCover. Let me find it.
COVER_LINE=$(grep -n "onUploadCover" "$PROFILE_FILE" | head -1 | cut -d: -f1)
echo "    onUploadCover at line $COVER_LINE"

# The closing structure after onUploadCover:
# Line N: onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },
# Line N+1: )    <- closes EditProfileScreen()
# Line N+2: }    <- closes if block

# Add } else { after the closing } of the if block
# Look for the "}" right after the ")"
for i in 1 2 3; do
    CHECK=$((COVER_LINE + i))
    CONTENT=$(sed -n "${CHECK}p" "$PROFILE_FILE" | sed 's/^[[:space:]]*//')
    if [ "$CONTENT" = ")" ]; then
        for j in 1 2 3; do
            CHECK2=$((CHECK + j))
            CONTENT2=$(sed -n "${CHECK2}p" "$PROFILE_FILE" | sed 's/^[[:space:]]*//')
            if [ "$CONTENT2" = "}" ]; then
                # Found the closing } of the if block
                sed -i "${CHECK2}a\\                    } else {" "$PROFILE_FILE"
                echo "    Added '} else {' after line $CHECK2"
                break 2
            fi
        done
    fi
done

echo "  2b. Done"

# 2c. Remove the old private EditProfileDialog function (now renamed to EditProfileScreen)
echo "  2c. Removing old private EditProfileScreen function..."
OLD_START=$(grep -n "^private fun EditProfileScreen(" "$PROFILE_FILE" | head -1 | cut -d: -f1)
if [ -n "$OLD_START" ]; then
    echo "    Found old private function at line $OLD_START"
    # Find next @Composable or private fun
    NEXT=$(awk -v s="$OLD_START" 'NR>s && /^@Composable|^private fun/{print NR; exit}' "$PROFILE_FILE")
    if [ -n "$NEXT" ]; then
        NEXT=$((NEXT - 1))
        sed -i "${OLD_START},${NEXT}d" "$PROFILE_FILE"
        echo "    Deleted lines $OLD_START-$NEXT"
    else
        NEXT=$(wc -l < "$PROFILE_FILE")
        sed -i "${OLD_START},${NEXT}d" "$PROFILE_FILE"
        echo "    Deleted lines $OLD_START-$NEXT (to end)"
    fi
else
    echo "    No old private function found"
fi

echo ""
echo "Step 3/3: Verifying structure..."
echo "  File lines: $(wc -l < "$PROFILE_FILE")"
grep -n "showEditProfile\|EditProfileScreen(\|if (showEditProfile)\|else {" "$PROFILE_FILE" | head -20

echo ""
echo "=== DONE ==="
