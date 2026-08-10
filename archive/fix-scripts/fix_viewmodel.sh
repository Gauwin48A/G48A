#!/bin/bash
set -e
FILE="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt"
EDIT="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/EditProfileScreen.kt"

echo "=== Fixing compilation errors ==="

# ─── Fix 1: Update viewModel.updateProfile signature ───
echo ""
echo "Fix 1/2: Updating ViewModel's updateProfile function..."
# Find the current signature
grep -n "fun updateProfile(" "$FILE" | head -3
# Replace the old signature with the new one
# Old: fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit)
# New: fun updateProfile(fullName: String?, phone: String?, bio: String?, location: String?, socialLinks: Map<String, String>?, minPrice: Int?, maxPrice: Int?, onDone: () -> Unit)

# Find the updateProfile function definition
LINE=$(grep -n "fun updateProfile(" "$FILE" | head -1 | cut -d: -f1)
echo "  Found at line $LINE"
echo "  Current: $(sed -n "${LINE}p" "$FILE")"

# Replace just the parameter list
sed -i "s/fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit)/fun updateProfile(fullName: String?, phone: String?, bio: String?, location: String?, socialLinks: kotlin.collections.Map<kotlin.String, kotlin.String>?, minPrice: Int?, maxPrice: Int?, onDone: () -> Unit)/" "$FILE"

# Also need to update the function body to use these params with the API call
# The function currently does:
#   val profileResult = rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio, socialLinks = socialLinks))
# We need to add loc/socialLinks/minPrice/maxPrice to the ProfileUpdateRequest and preferences

echo "  Signature updated"

# Update the ProfileUpdateRequest call to include socialLinks
sed -i 's/ProfileUpdateRequest(\n                    fullName = fullName,\n                    phone = phone,\n                    bio = bio,\n                )/ProfileUpdateRequest(\n                    fullName = fullName,\n                    phone = phone,\n                    bio = bio,\n                    socialLinks = socialLinks,\n                )/' "$FILE" 2>/dev/null || true

# Simpler approach: just add socialLinks to the existing call
sed -i 's/bio = bio,/bio = bio, socialLinks = socialLinks,/' "$FILE"
echo "  Added socialLinks to ProfileUpdateRequest"

# The location/minPrice/maxPrice are sent via updatePreferences
# Update the if condition
sed -i 's/if (location != null || minPrice != null || maxPrice != null) {/if (location != null || minPrice != null || maxPrice != null) {/' "$FILE"

echo ""

# ─── Fix 2: Check EditProfileScreen.kt for location issue ───
echo "Fix 2/2: Checking EditProfileScreen.kt User model reference..."
# Check if User model has location field
grep -n "val location" "$EDIT" 2>/dev/null || echo "  No location in EditProfileScreen (that's normal, it's in the User model)"
echo "  The 'location' property is from User model - checking import..."
head -5 "$EDIT" | grep "import.*User" || echo "  User import not found!"
echo "  User import line:"
grep -n "import com.mhub.app.domain.model.User" "$EDIT" || echo "  NOT FOUND - need to add!"

echo ""
echo "=== Done ==="
echo "Check build output..."
