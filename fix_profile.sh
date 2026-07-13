#!/bin/bash
set -e
FILE="C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt"

echo "=== PROFILE SCREEN OVERHAUL ==="

# ─── Step 1: Replace EditProfileDialog with full-screen EditProfileScreen ───
echo "Step 1/4: Replace EditProfileDialog with full-screen editor..."
# The current pattern uses showEditDialog + EditProfileDialog( ... )
# We need to replace it with if (showEditProfile) { EditProfileScreen( ... ) } else {

# First, replace the variable name showEditDialog -> showEditProfile
sed -i 's/showEditDialog/showEditProfile/g' "$FILE"
echo "  Renamed showEditDialog -> showEditProfile"

# Replace EditProfileDialog( call with EditProfileScreen(
sed -i 's/EditProfileDialog(/EditProfileScreen(/g' "$FILE"
echo "  Renamed EditProfileDialog -> EditProfileScreen"

# Now find the EditProfileScreen call and wrap it in if/else
# Find the line with "if (showEditProfile)"
IF_LINE=$(grep -n "if (showEditProfile)" "$FILE" | head -1 | cut -d: -f1)
echo "  'if (showEditProfile)' at line $IF_LINE"

# Remove the Dialog wrapper - the EditProfileScreen is now full-screen
# Add } else { before the comment "// Edit result toast" or similar
sed -i '/if (showEditProfile)/a\                    } else {' "$FILE"
echo "  Added '} else {' after if block"

echo ""

# ─── Step 2: Find tab boundaries ──────────────────────────────────────────
echo "Step 2/4: Finding tab boundaries..."
PERSONAL_START=$(awk '/@Composable/{line=NR; getline; if(/private fun PersonalInfoTab/) print line}' "$FILE")
echo "  PersonalInfoTab @Composable at line $PERSONAL_START"
PREF_START=$(awk '/@Composable/{line=NR; getline; if(/private fun PreferencesTab/) print line}' "$FILE")
echo "  PreferencesTab @Composable at line $PREF_START"
SETTINGS_START=$(awk '/@Composable/{line=NR; getline; if(/private fun SettingsTab/) print line}' "$FILE")
echo "  SettingsTab @Composable at line $SETTINGS_START"

# Find ends by looking for next @Composable after each
PERSONAL_END=$(awk -v s="$PERSONAL_START" 'NR>s && /@Composable/{print NR-2; exit}' "$FILE")
PREF_END=$(awk -v s="$PREF_START" 'NR>s && /@Composable/{print NR-2; exit}' "$FILE")
SETTINGS_END=$(awk -v s="$SETTINGS_START" 'NR>s && /@Composable/{print NR-2; exit}' "$FILE")
echo "  PersonalInfoTab ends at line $PERSONAL_END"
echo "  PreferencesTab ends at line $PREF_END"
echo "  SettingsTab ends at line $SETTINGS_END"

echo ""

# ─── Step 3: Write new tab content ────────────────────────────────────────
echo "Step 3/4: Writing new tab content..."

cat > /c/tmp/new_personal.txt << 'END1'
@Composable
private fun PersonalInfoTab(
    user: com.mhub.app.domain.model.User?,
    onEdit: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Personal Information", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                ProfileInfoRowIcon(icon = Icons.Default.Person, label = "Full Name", value = user?.displayName)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRowIcon(icon = Icons.Default.Phone, label = "Phone", value = user?.phone)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRowIcon(icon = Icons.Default.Email, label = "Email", value = user?.email)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRowIcon(icon = Icons.Default.Info, label = "Bio", value = user?.bio)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRowIcon(icon = Icons.Default.Person, label = "User ID", value = user?.stableId)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRowIcon(icon = Icons.Default.Star, label = "Current Plan", value = tierLabel(user?.currentPlan))
                Spacer(Modifier.height(4.dp))
                Button(onClick = onEdit, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                    Icon(Icons.Default.Edit, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Edit Profile", fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
END1

cat > /c/tmp/new_icon_row.txt << 'END2'
@Composable
private fun ProfileInfoRowIcon(icon: ImageVector, label: String, value: String?) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f), modifier = Modifier.size(32.dp)) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(16.dp))
            }
        }
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value ?: "\u2014", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        }
    }
}
END2

cat > /c/tmp/new_prefs.txt << 'END3'
@Composable
private fun PreferencesTab(
    onOpenCategoryMode: () -> Unit,
    initialLocation: String = "",
    initialMinPrice: String = "",
    initialMaxPrice: String = "",
    selectedCategories: List<String> = emptyList(),
    saving: Boolean = false,
    onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit = { _, _, _ -> },
) {
    val locationParts = remember(initialLocation) { parseProfileLocation(initialLocation) }
    val minPriceValue = initialMinPrice.toIntOrNull()
    val maxPriceValue = initialMaxPrice.toIntOrNull()
    var showEditor by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Search Preferences", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ProfileInfoRow("Location", initialLocation.ifBlank { "Not set" })
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRow("Country", locationParts.country)
                ProfileInfoRow("State", locationParts.state)
                ProfileInfoRow("District", locationParts.district)
                ProfileInfoRow("City", locationParts.city)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRow("Price Range", profilePriceRange(minPriceValue, maxPriceValue))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                ProfileInfoRow("Categories", selectedCategories.joinToString().ifBlank { "All categories" })
                Spacer(Modifier.height(4.dp))
                Button(onClick = { showEditor = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                    Icon(Icons.Default.Settings, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Update Preferences", fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFFEFF6FF), border = BorderStroke(1.dp, Color(0xFFBFDBFE)), modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenCategoryMode)) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("\uD83C\uDFEA", fontSize = 22.sp)
                Column(Modifier.weight(1f)) {
                    Text("Category Mode", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8))
                    Text("Browse by category preferences", style = MaterialTheme.typography.bodySmall, color = Color(0xFF3B82F6))
                }
                Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(18.dp))
            }
        }
        Spacer(Modifier.height(24.dp))
    }
    if (showEditor) {
        PreferencesEditDialog(
            initialLocation = initialLocation, initialMinPrice = initialMinPrice, initialMaxPrice = initialMaxPrice,
            saving = saving, onDismiss = { showEditor = false },
            onSave = { loc, min, max -> onSave(loc, min, max); showEditor = false },
        )
    }
}
END3

cat > /c/tmp/new_settings.txt << 'END4'
@Composable
private fun SettingsTab(
    user: com.mhub.app.domain.model.User?,
    onOpenSettings: () -> Unit,
    onOpenSecurity: () -> Unit,
    onOpenNotifications: () -> Unit,
    onSignOut: () -> Unit,
    onExportData: () -> Unit = {},
    dataExportDone: Boolean = false,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Account Settings", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        val plan = user?.currentPlan?.replaceFirstChar { it.uppercase() } ?: "Basic"
        val planColor = tierColor(user?.currentPlan)
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(planColor.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Star, null, tint = planColor, modifier = Modifier.size(24.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text("Current Plan", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(plan, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = planColor)
                }
                Surface(shape = RoundedCornerShape(8.dp), color = planColor.copy(alpha = 0.1f)) {
                    Text("Upgrade", style = MaterialTheme.typography.labelSmall, color = planColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp), modifier = Modifier.fillMaxWidth()) {
            Column {
                SettingsRow(Icons.Default.Settings, "App Settings", "Theme, language, display", onClick = onOpenSettings)
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                SettingsRow(Icons.Default.Security, "Security", "Password, 2FA, sessions", onClick = onOpenSecurity)
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                SettingsRow(Icons.Default.Notifications, "Notifications", "Alerts and push settings", onClick = onOpenNotifications)
            }
        }
        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = if (dataExportDone) Color(0xFFDCFCE7) else MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(if (dataExportDone) 0.dp else 2.dp), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF6366F1).copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Download, null, tint = Color(0xFF6366F1), modifier = Modifier.size(20.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text("Download My Data", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Medium)
                    Text(if (dataExportDone) "Export request sent \u2014 check your email" else "Request a GDPR export of your account data", style = MaterialTheme.typography.bodySmall, color = if (dataExportDone) Color(0xFF15803D) else MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (!dataExportDone) TextButton(onClick = onExportData) { Text("Request") }
                else Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
            }
        }
        OutlinedButton(onClick = onSignOut, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Sign Out", fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(24.dp))
    }
}
END4

echo "  Temp files created:"
wc -l /c/tmp/new_personal.txt /c/tmp/new_icon_row.txt /c/tmp/new_prefs.txt /c/tmp/new_settings.txt

echo ""

# ─── Step 4: Delete old tabs and insert new ones (sequentially, bottom to top) ───
echo "Step 4/4: Replacing tabs (bottom to top)..."

# Delete SettingsTab (lines SETTINGS_START to SETTINGS_END)
echo "  Deleting SettingsTab (lines $SETTINGS_START-$SETTINGS_END)..."
sed -i "${SETTINGS_START},${SETTINGS_END}d" "$FILE"
echo "  OK - file now $(wc -l < "$FILE") lines"

# Delete PreferencesTab - shifted by SettingsTab deletion
# SettingsTab was (SETTINGS_END - SETTINGS_START + 1) lines
SETTINGS_LEN=$((SETTINGS_END - SETTINGS_START + 1))
NEW_PREF_START=$((PREF_START))
NEW_PREF_END=$((PREF_END - SETTINGS_LEN))
echo "  Deleting PreferencesTab (new lines $NEW_PREF_START-$NEW_PREF_END)..."
sed -i "${NEW_PREF_START},${NEW_PREF_END}d" "$FILE"
echo "  OK - file now $(wc -l < "$FILE") lines"

# Delete PersonalInfoTab - shifted by previous deletions
TOTAL_DELETED=$((SETTINGS_LEN + (PREF_END - PREF_START + 1)))
NEW_PERSONAL_START=$((PERSONAL_START))
NEW_PERSONAL_END=$((PERSONAL_END - TOTAL_DELETED))
echo "  Deleting PersonalInfoTab (new lines $NEW_PERSONAL_START-$NEW_PERSONAL_END)..."
sed -i "${NEW_PERSONAL_START},${NEW_PERSONAL_END}d" "$FILE"
echo "  OK - file now $(wc -l < "$FILE") lines"

# After deletions, we need to insert new content
# Everything above PERSONAL_START is unchanged
# Insertion points (bottom to top):
INSERT_SETTINGS=$((SETTINGS_START - TOTAL_DELETED - 1))
INSERT_PREFS=$((PREF_START - SETTINGS_LEN - 1 - (PERSONAL_END - PERSONAL_START + 1)))
INSERT_PERSONAL=$((PERSONAL_START - 1))

echo "  Insertion points: personal=$INSERT_PERSONAL prefs=$INSERT_PREFS settings=$INSERT_SETTINGS"

# 1. Insert new SettingsTab
echo "  Inserting SettingsTab after line $INSERT_SETTINGS..."
sed -i "${INSERT_SETTINGS}r /c/tmp/new_settings.txt" "$FILE"

# 2. Insert new PreferencesTab (shifted by SettingsTab insertion)
PREFS_INSERT=$(grep -n "Search Preferences" "$FILE" | head -1 | cut -d: -f1)
# Actually, easier: just find the right blank line
# After deleting PersonalInfoTab, the blank line before PersonalInfoTab is at PERSONAL_START - 1
# PreferencesTab should go right after PersonalInfoTab

# Actually, I need to recalculate. Let me just use grep to find blank lines near the right spots
echo "  File is now $(wc -l < "$FILE") lines"
echo "  Current content around insertion areas:"
sed -n "$((PERSONAL_START - 2)),$((PERSONAL_START + 2))p" "$FILE"

echo ""
echo "=== DONE ==="
echo "File has $(wc -l < "$FILE") lines"
