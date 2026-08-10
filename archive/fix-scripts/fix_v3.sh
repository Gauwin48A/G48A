#!/bin/bash
set -e
FILE="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt"
echo "=== Profile Screen Clean V3 ==="
echo "File: $(wc -l < "$FILE") lines"

# ─── 1. Add Email import ───
echo ""
echo "1/5: Adding Email import..."
sed -i 's/^import androidx.compose.material.icons.filled.Edit$/import androidx.compose.material.icons.filled.Edit\nimport androidx.compose.material.icons.filled.Email/' "$FILE"
echo "  OK ($(wc -l < "$FILE") lines)"

# ─── 2. Rename showEditDialog -> showEditProfile ───
echo ""
echo "2/5: Renaming showEditDialog -> showEditProfile..."
sed -i 's/showEditDialog/showEditProfile/g' "$FILE"
echo "  OK"

# ─── 3. Rename EditProfileDialog -> EditProfileScreen ───
echo ""
echo "3/5: Renaming EditProfileDialog -> EditProfileScreen..."
sed -i 's/EditProfileDialog/EditProfileScreen/g' "$FILE"
echo "  OK"

# ─── 4. Delete old private EditProfileScreen function ───
echo ""
echo "4/5: Removing old private EditProfileScreen function..."
OLD_START=$(grep -n "^private fun EditProfileScreen(" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$OLD_START" ]; then
    NEXT_FUN=$(awk -v s="$OLD_START" 'NR>s && /^@Composable|^private fun/{print NR; exit}' "$FILE")
    if [ -n "$NEXT_FUN" ]; then
        OLD_END=$((NEXT_FUN - 1))
        sed -i "${OLD_START},${OLD_END}d" "$FILE"
        echo "  Deleted lines $OLD_START-$OLD_END ($((OLD_END-OLD_START+1)) lines)"
    fi
fi

# ─── 5. Fix EditProfileScreen call + if/else structure ───
echo ""
echo "5/5: Fixing EditProfileScreen call + if/else structure..."

# 5a. Find the EditProfileScreen block
CALL_LINE=$(grep -n "EditProfileScreen(" "$FILE" | head -1 | cut -d: -f1)
echo "  EditProfileScreen call at line $CALL_LINE"

if [ -z "$CALL_LINE" ]; then
    echo "  ERROR: EditProfileScreen call not found!"
    exit 1
fi
# 5b. Fix the onSave params
sed -i 's/onSave = { name: String?, phone: String?, bio: String? ->/onSave = { name, phone, bio, location, socialLinks, minPrice, maxPrice ->/' "$FILE"

# 5c. Fix the viewModel.updateProfile call
sed -i 's/viewModel.updateProfile(name, phone, bio) { showEditProfile = false }/viewModel.updateProfile(name, phone, bio, location, socialLinks, minPrice, maxPrice) { showEditProfile = false }/' "$FILE"

# 5d. Add onUploadAvatar after onSave line
# Find the line with onSave and add params after the closing }, of onSave
sed -i '/onSave = { name, phone, bio, location, socialLinks, minPrice, maxPrice ->/,/},/{ /}/a\                            onUploadAvatar = { uri -> viewModel.uploadAvatar(context, uri) },' "$FILE"
sed -i '/onUploadAvatar.*uri)/a\                            onUploadCover = { uri -> viewModel.uploadCoverImage(context, uri) },' "$FILE"
echo "  Updated onSave params and added image upload callbacks"

# 5e. Add } else { after the EditProfileScreen block's closing }
# Find the closing } of if(showEditProfile)
# Look for the pattern: ")" then next line "}"
# Right after EditProfileScreen's closing paren
CLOSE_LINE=$(grep -n "onUploadCover" "$FILE" | head -1 | cut -d: -f1)
if [ -n "$CLOSE_LINE" ]; then
    for i in 1 2 3 4; do
        CHECK=$((CLOSE_LINE + i))
        CONTENT=$(sed -n "${CHECK}p" "$FILE" | sed 's/^[[:space:]]*//')
        if [ "$CONTENT" = ")" ]; then
            for j in 1 2 3; do
                CHECK2=$((CHECK + j))
                CONTENT2=$(sed -n "${CHECK2}p" "$FILE" | sed 's/^[[:space:]]*//')
                if [ "$CONTENT2" = "}" ]; then
                    sed -i "${CHECK2}a\\                    } else {" "$FILE"
                    echo "  Added '} else {' after line $CHECK2 (closing of if block)"
                    break 2
                fi
            done
        fi
    done
fi

# 5f. Add closing } for the else block
# Find where the main else -> closes (the } before // ── Tab composables ──)
TAB_LINE=$(grep -n "// ── Tab composables" "$FILE" | head -1 | cut -d: -f1)
echo "  Tab composables marker at line $TAB_LINE"
# Look for the last ^                    }$ before the tab composables line
for ((i=TAB_LINE-1; i>=1; i--)); do
    CONTENT=$(sed -n "${i}p" "$FILE" | sed 's/^[[:space:]]*//')
    if [ "$CONTENT" = "}" ]; then
        # This is likely the close of the outer else ->
        # Insert a new "}" before it to close the inner else
        sed -i "${i}i\\                    }" "$FILE"
        echo "  Added closing '}' for else block before line $i"
        break
    fi
done

echo ""
echo "=== DONE ==="
echo "File: $(wc -l < "$FILE") lines"
echo ""
echo "=== Verification of if/else ==="
grep -n "if (showEditProfile)\|else {" "$FILE" | head -10
