const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let code = fs.readFileSync(filePath, 'utf-8');
const original = code;

// ──────────────────────────────────────────────────────────────────────────
// 1. Remove stale params from ProfileScreen function signature
// ──────────────────────────────────────────────────────────────────────────

// Remove onOpenChat
code = code.replace(
    '    onOpenChat: () -> Unit = {},\n',
    ''
);

// Remove onOpenOffers
code = code.replace(
    '    onOpenOffers: () -> Unit = {},\n',
    ''
);

// Remove onOpenAddresses
code = code.replace(
    '    onOpenAddresses: () -> Unit = {},\n',
    ''
);

// Remove onOpenMyFeed
code = code.replace(
    '    onOpenMyFeed: () -> Unit = {},\n',
    ''
);

// Remove onOpenReviews
code = code.replace(
    '    onOpenReviews: (String) -> Unit = {},\n',
    ''
);

// ──────────────────────────────────────────────────────────────────────────
// 2. Remove stale references in ProfileScreen body
// ──────────────────────────────────────────────────────────────────────────

// Remove Feed chip
code = code.replace(
    /\s*CompactActionChip\(icon = Icons\.AutoMirrored\.Filled\.Message, label = "Feed", accentColor = Color\(0xFF6366F1\), onClick = onOpenMyFeed, modifier = Modifier\.weight\(1f\)\)\n/,
    '\n'
);

// Remove Reviews chip
code = code.replace(
    /\s*CompactActionChip\(icon = Icons\.Filled\.Star, label = "Reviews", accentColor = Color\(0xFFF59E0B\), onClick = \{ onOpenReviews\(userId\) \}, modifier = Modifier\.weight\(1f\)\)\n/,
    '\n'
);

// Remove Offers chip
code = code.replace(
    /\s*CompactActionChip\(icon = Icons\.AutoMirrored\.Filled\.TrendingUp, label = "Offers", accentColor = Color\(0xFFF97316\), onClick = onOpenOffers, modifier = Modifier\.weight\(1f\)\)\n/,
    '\n'
);

// Remove Messages row
code = code.replace(
    /\s*ProfileMenuItemCompact\(icon = Icons\.AutoMirrored\.Filled\.Message, label = "Messages", subtitle = "Chat with buyers", onClick = onOpenChat\)\n/,
    '\n'
);

// Remove ReviewsTab call
code = code.replace(
    /\s*ReviewsTab\(reviews = state\.reviews\)\n/,
    '\n'
);

// ──────────────────────────────────────────────────────────────────────────
// 3. Remove SettingsTab, SettingsRow, ReviewsTab function definitions
// ──────────────────────────────────────────────────────────────────────────

// Find and remove SettingsTab function
const settingsTabStart = code.indexOf('\nprivate fun SettingsTab(');
if (settingsTabStart >= 0) {
    // Find where ReviewsTab ends (last function before end of file)
    const reviewsTabStart = code.indexOf('\nprivate fun ReviewsTab(', settingsTabStart);
    if (reviewsTabStart >= 0) {
        // Remove from SettingsTab to end of file
        code = code.substring(0, settingsTabStart);
    } else {
        // If no ReviewsTab, remove from SettingsTab to where SettingsRow ends
        const settingsRowStart = code.indexOf('\nprivate fun SettingsRow(', settingsTabStart);
        if (settingsRowStart >= 0) {
            // Find end of SettingsRow function (next top-level declaration or end)
            const afterRow = settingsRowStart + '\nprivate fun SettingsRow('.length;
            // Find the closing brace of SettingsRow's last line
            let braceCount = 0;
            let endIdx = afterRow;
            for (let i = afterRow; i < code.length; i++) {
                if (code[i] === '{') braceCount++;
                else if (code[i] === '}') braceCount--;
                if (braceCount === 0 && i > afterRow + 5) {
                    endIdx = i + 1;
                    break;
                }
            }
            code = code.substring(0, settingsTabStart);
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Add demo login fix in ProfileViewModel
// ──────────────────────────────────────────────────────────────────────────

// Add isDemoSession import
if (!code.includes('import com.mhub.app.ui.components.AppEmptyState')) {
    // Import line exists somewhere, use it
}

// Add createDemoUser() before the refresh() function
const refreshFunStart = code.indexOf('\n    fun refresh()');
if (refreshFunStart >= 0 && !code.includes('createDemoUser')) {
    const demoUserCode = `
    /** Create a synthetic User from the demo session token payload when server is unreachable. */
    private fun createDemoUser(): User {
        val token = repo.accessTokenFlow.value ?: return User(userId = "demo_user", id = "demo_user", fullName = "Demo User", email = "demo@mhub.local", name = "Demo User")
        return User(
            userId = JwtHelper.extractClaim(token, "userId") ?: JwtHelper.extractClaim(token, "id") ?: "demo_user",
            id = JwtHelper.extractClaim(token, "id") ?: "demo_user",
            fullName = JwtHelper.extractClaim(token, "name") ?: "Demo User",
            name = JwtHelper.extractClaim(token, "name") ?: "Demo User",
            email = JwtHelper.extractClaim(token, "email") ?: "demo@mhub.local",
            role = JwtHelper.extractClaim(token, "role") ?: "user",
        )
    }

`;
    code = code.substring(0, refreshFunStart) + demoUserCode + code.substring(refreshFunStart);
}

// Add isDemoSession handling in load() function - after retry failure handling
const retryAuthBlock = 'val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden';
const retryIdx = code.indexOf(retryAuthBlock);
if (retryIdx >= 0 && !code.includes('expired && repo.isDemoSession')) {
    // Replace the block after checking expired
    // Find the block after 'if (expired) {' that creates demo user
    const afterExpiredCheck = code.indexOf('if (expired) {', retryIdx);
    if (afterExpiredCheck >= 0) {
        const oldBlock = '                                if (expired) {\n                                        // Show login gate for expired sessions\n                                        _state.value = _state.value.copy(\n                                            loading = false, refreshing = false,\n                                            isSessionExpired = true, error = null,\n                                        )';
        const newBlock = '                                if (expired && repo.isDemoSession) {\n                                    val demoUser = createDemoUser()\n                                    _state.value = _state.value.copy(\n                                        loading = false, refreshing = false, user = demoUser,\n                                        error = "You\\\'re browsing in demo mode. Sign in for full access.",\n                                        isSessionExpired = false,\n                                    )\n                                } else if (expired) {\n                                        // Show login gate for expired sessions\n                                        _state.value = _state.value.copy(\n                                            loading = false, refreshing = false,\n                                            isSessionExpired = true, error = null,\n                                        )';
        if (code.includes(oldBlock)) {
            code = code.replace(oldBlock, newBlock);
        }
    }
}

// Also handle the else block for cachedProfile + demoSession 
const cachedDemoBlock = 'if (cachedProfile?.user != null || repo.isDemoSession) {';
if (!code.includes(cachedDemoBlock)) {
    const cachedProfileBlock = code.indexOf('if (cachedProfile?.user != null) {');
    if (cachedProfileBlock >= 0) {
        code = code.substring(0, cachedProfileBlock) + 'if (cachedProfile?.user != null || repo.isDemoSession) {' + code.substring(cachedProfileBlock + 'if (cachedProfile?.user != null) {'.length);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Pre-populate preferences with categories field in savePreferences
// ──────────────────────────────────────────────────────────────────────────

// Update savePreferences to accept categories parameter
const savePrefsSig = code.indexOf('fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?)');
if (savePrefsSig >= 0) {
    code = code.substring(0, savePrefsSig + 'fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?)'.length) + ', categories: List<String>? = null' + code.substring(savePrefsSig + 'fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?)'.length);
}

// Add categories to the PreferencesUpdateRequest
const updateReqCall = code.indexOf('api.updatePreferences(\n                    com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                        location = location,\n                        minPrice = minPrice,\n                        maxPrice = maxPrice,\n                    )');
if (updateReqCall >= 0 && !code.includes('categories = categories', updateReqCall)) {
    code = code.substring(0, updateReqCall) + 'api.updatePreferences(\n                    com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                        location = location,\n                        minPrice = minPrice,\n                        maxPrice = maxPrice,\n                        categories = categories,\n                    )' + code.substring(updateReqCall + 'api.updatePreferences(\n                    com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                        location = location,\n                        minPrice = minPrice,\n                        maxPrice = maxPrice,\n                    )'.length);
}

// Add selectedCategories to PreferencesTab
const prefsTabSig = code.indexOf('fun PreferencesTab(\n    initialLocation: String = "",\n    initialMinPrice: String = "",\n    initialMaxPrice: String = "",\n    saving: Boolean = false,');
if (prefsTabSig >= 0 && !code.includes('selectedCategories', prefsTabSig)) {
    code = code.substring(0, prefsTabSig) + 'fun PreferencesTab(\n    initialLocation: String = "",\n    initialMinPrice: String = "",\n    initialMaxPrice: String = "",\n    selectedCategories: List<String> = emptyList(),\n    saving: Boolean = false,' + code.substring(prefsTabSig + 'fun PreferencesTab(\n    initialLocation: String = "",\n    initialMinPrice: String = "",\n    initialMaxPrice: String = "",\n    saving: Boolean = false,'.length);
}

// Add onSave categories parameter
const prefsOnSaveSig = code.indexOf('onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit');
if (prefsOnSaveSig >= 0 && !code.includes('onSave: (location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>?)', prefsOnSaveSig)) {
    code = code.substring(0, prefsOnSaveSig) + 'onSave: (location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>?) -> Unit' + code.substring(prefsOnSaveSig + 'onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit'.length);
}

// Update PreferencesTab call in ProfileScreen to pass selectedCategories
const prefsTabCall = code.indexOf('PreferencesTab(\n            initialLocation = prefs?.location ?: "",\n            initialMinPrice = prefs?.minPrice?.toString() ?: "",\n            initialMaxPrice = prefs?.maxPrice?.toString() ?: "",\n            saving = prefsSaving,\n            onSave = { loc, min, max -> viewModel.savePreferences(loc, min, max) },');
if (prefsTabCall >= 0) {
    code = code.substring(0, prefsTabCall) + 'PreferencesTab(\n            initialLocation = prefs?.location ?: "",\n            initialMinPrice = prefs?.minPrice?.toString() ?: "",\n            initialMaxPrice = prefs?.maxPrice?.toString() ?: "",\n            selectedCategories = prefs?.categories.orEmpty(),\n            saving = prefsSaving,\n            onSave = { loc, min, max, cats -> viewModel.savePreferences(loc, min, max, cats) },' + code.substring(prefsTabCall + 'PreferencesTab(\n            initialLocation = prefs?.location ?: "",\n            initialMinPrice = prefs?.minPrice?.toString() ?: "",\n            initialMaxPrice = prefs?.maxPrice?.toString() ?: "",\n            saving = prefsSaving,\n            onSave = { loc, min, max -> viewModel.savePreferences(loc, min, max) },'.length);
}

// Add categories to PreferencesUpdateRequest in the updateProfile function
const updateReqCall2 = code.indexOf('api.updatePreferences(\n                            com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                                location = location?.takeIf { it.isNotBlank() },\n                                minPrice = minPrice,\n                                maxPrice = maxPrice,\n                            )');
if (updateReqCall2 >= 0 && !code.includes('categories', updateReqCall2)) {
    code = code.substring(0, updateReqCall2) + 'api.updatePreferences(\n                            com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                                location = location?.takeIf { it.isNotBlank() },\n                                minPrice = minPrice,\n                                maxPrice = maxPrice,\n                            )' + code.substring(updateReqCall2 + 'api.updatePreferences(\n                            com.mhub.app.data.remote.dto.PreferencesUpdateRequest(\n                                location = location?.takeIf { it.isNotBlank() },\n                                minPrice = minPrice,\n                                maxPrice = maxPrice,\n                            )'.length);
}

// ──────────────────────────────────────────────────────────────────────────
// 6. Update PreferencesEditDialog to accept and show categories
// ──────────────────────────────────────────────────────────────────────────

const prefsEditSig = code.indexOf('fun PreferencesEditDialog(\n    initialLocation: String,\n    initialMinPrice: String,\n    initialMaxPrice: String,\n    saving: Boolean,');
if (prefsEditSig >= 0 && !code.includes('initialCategories', prefsEditSig)) {
    code = code.substring(0, prefsEditSig) + 'fun PreferencesEditDialog(\n    initialLocation: String,\n    initialMinPrice: String,\n    initialMaxPrice: String,\n    initialCategories: List<String> = emptyList(),\n    saving: Boolean,' + code.substring(prefsEditSig + 'fun PreferencesEditDialog(\n    initialLocation: String,\n    initialMinPrice: String,\n    initialMaxPrice: String,\n    saving: Boolean,'.length);
}

// Update onSave parameter in PreferencesEditDialog
const editOnSaveSig = code.indexOf('onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit,', prefsEditSig > 0 ? prefsEditSig : 0);
if (editOnSaveSig >= 0 && !code.includes('onSave: (location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>?)', editOnSaveSig)) {
    code = code.substring(0, editOnSaveSig) + 'onSave: (location: String, minPrice: Int?, maxPrice: Int?, categories: List<String>?) -> Unit,' + code.substring(editOnSaveSig + 'onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit,'.length);
}

// Add selectedCats state
const editDialogBody = code.indexOf('var minPrice by remember(initialMinPrice) { mutableStateOf(initialMinPrice) }\n    var maxPrice by remember(initialMaxPrice) { mutableStateOf(initialMaxPrice) }', prefsEditSig > 0 ? prefsEditSig : 0);
if (editDialogBody >= 0 && !code.includes('selectedCats', editDialogBody)) {
    code = code.substring(0, editDialogBody) + 'var minPrice by remember(initialMinPrice) { mutableStateOf(initialMinPrice) }\n    var maxPrice by remember(initialMaxPrice) { mutableStateOf(initialMaxPrice) }\n    var selectedCats by remember(initialCategories) { mutableStateOf(initialCategories.toMutableList()) }' + code.substring(editDialogBody + 'var minPrice by remember(initialMinPrice) { mutableStateOf(initialMinPrice) }\n    var maxPrice by remember(initialMaxPrice) { mutableStateOf(initialMaxPrice) }'.length);
}

// Update PreferencesEditDialog onSave call to include cats
const editOnSaveCall = code.indexOf('onSave(loc, min, max)', prefsEditSig > 0 ? prefsEditSig : 0);
if (editOnSaveCall >= 0 && !code.includes('onSave(loc, min, max, cats)', editOnSaveCall)) {
    code = code.substring(0, editOnSaveCall) + 'onSave(loc, min, max, selectedCats.takeIf { it.isNotEmpty() })' + code.substring(editOnSaveCall + 'onSave(loc, min, max)'.length);
}

// ──────────────────────────────────────────────────────────────────────────
// Write the result
// ──────────────────────────────────────────────────────────────────────────

const changes = [];
if (code !== original) {
    fs.writeFileSync(filePath, code, 'utf-8');
    changes.push('ProfileScreen.kt updated successfully');
} else {
    changes.push('No changes made (patterns may not have matched)');
}

console.log('Changes applied:');
changes.forEach(c => console.log(' - ' + c));
console.log('File size:', code.length, 'chars,', code.split('\n').length, 'lines');
