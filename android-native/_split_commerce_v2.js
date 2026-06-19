const fs = require('fs');
const path = require('path');

const srcPath = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt';
const outDir = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/';

let content = fs.readFileSync(srcPath, 'utf8');
// Remove BOM
if (content.charCodeAt(0) === 0xFEFF) content = content.substring(1);

const lines = content.split('\n');

// Extract the package + imports (lines 0 to the shared helpers comment)
// Shared helpers start at line 65 (0-indexed)
// But let's find the exact import boundary
const sharedHelpersIdx = lines.findIndex(l => l.trim().startsWith('// ─') && l.includes('Shared helpers'));
const importBlock = sharedHelpersIdx >= 0 ? lines.slice(0, sharedHelpersIdx).join('\n') : lines.slice(0, 65).join('\n');

// ============================================================
// Section boundaries (0-indexed, found via grep)
// ============================================================
const sections = [
    { name: 'CommerceCommon', start: 65, end: 169, desc: 'Shared helpers (ScreenTopBar, PostListItem, StatusChip, EmptyState, MhubTextField, CompareItemHolder)' },
    { name: 'PostWelcomeScreen', start: 174, end: 274, desc: 'PostWelcomeScreen' },
    { name: 'EditPostScreen', start: 274, end: 663, desc: 'EditPostViewModel + EditPostScreen' },
    { name: 'TierSelectionScreen', start: 663, end: 1282, desc: 'TiersViewModel + TierSelectionScreen' },
    { name: 'MyPostsScreen', start: 1282, end: 1540, desc: 'MyPostsViewModel + MyPostsScreen' },
    { name: 'SoldPostsScreen', start: 1540, end: 1665, desc: 'SoldPostsViewModel + BoughtPostsViewModel + SoldPostsScreen' },
    { name: 'BoughtScreen', start: 1665, end: 1749, desc: 'BoughtPostsScreen' },
    { name: 'OffersScreen', start: 1749, end: 1969, desc: 'OffersViewModel + OffersScreen' },
    { name: 'CartScreen', start: 1969, end: 2409, desc: 'CartViewModel + CartScreen' },
    { name: 'RecentlyViewedScreen', start: 2409, end: 2695, desc: 'RecentlyViewedViewModel + RecentlyViewedScreen' },
    { name: 'SavedSearchesScreen', start: 2695, end: 2884, desc: 'SavedSearchesViewModel + SavedSearchesScreen' },
    { name: 'CompareScreen', start: 2884, end: 3033, desc: 'CompareViewModel + CompareScreen' },
    { name: 'BuyerViewScreen', start: 3033, end: 3209, desc: 'BuyerViewViewModel + BuyerViewScreen' },
    { name: 'SaleDoneScreen', start: 3209, end: 3821, desc: 'SaleDoneViewModel + SaleDoneScreen' },
    { name: 'SaleUndoneScreen', start: 3821, end: 4118, desc: 'SaleUndoneViewModel + SaleUndoneScreen' },
    { name: 'PaymentScreen', start: 4118, end: lines.length, desc: 'PaymentViewModel + PaymentScreen' },
];

// ============================================================
// Extract sections
// ============================================================
const extractedFiles = [];

sections.forEach(section => {
    const code = lines.slice(section.start, section.end).join('\n').trim();
    if (!code) {
        console.log(`SKIP ${section.name}: empty section`);
        return;
    }
    
    let fileContent = importBlock + '\n\n' + code;
    
    // For CommerceCommon, change private to internal
    if (section.name === 'CommerceCommon') {
        // Remove BOM from the code section
        let commonCode = code;
        // Already handled above
        fileContent = importBlock + '\n\n// ──────────────────────────────────────────────────────────────────────────────\n// Shared helpers used across Commerce screens\n// ──────────────────────────────────────────────────────────────────────────────\n' + 
            commonCode
                .replace(/\bprivate val bgGradient/g, 'internal val bgGradient')
                .replace(/\bprivate val brandGrad/g, 'internal val brandGrad')
                .replace(/\bprivate fun ScreenTopBar/g, 'internal fun ScreenTopBar')
                .replace(/\bprivate fun MhubTextFieldWithCounter/g, 'internal fun MhubTextFieldWithCounter')
                .replace(/\bprivate fun MhubTextField/g, 'internal fun MhubTextField')
                .replace(/\bprivate fun PostListItem/g, 'internal fun PostListItem')
                .replace(/\bprivate fun StatusChip/g, 'internal fun StatusChip')
                .replace(/\bprivate fun EmptyState/g, 'internal fun EmptyState')
                .replace(/\bprivate fun TierCard/g, 'internal fun TierCard')
                .replace(/\bprivate fun MyPostCard/g, 'internal fun MyPostCard')
                .replace(/\bprivate fun SoldPostsListScreen/g, 'internal fun SoldPostsListScreen');
    }
    
    const filePath = path.join(outDir, section.name + '.kt');
    fs.writeFileSync(filePath, fileContent, 'utf8');
    extractedFiles.push(section.name);
    console.log(`CREATED ${section.name}.kt (lines ${section.start}-${section.end})`);
});

// ============================================================
// Trim CommerceScreens.kt to a deprecation notice
// ============================================================
const notice = `package com.mhub.app.ui.commerce

/**
 * CommerceScreens.kt has been split into individual files for better maintainability.
 * Each screen + ViewModel pair is now in its own file:
 * - CommerceCommon.kt (shared helpers: ScreenTopBar, PostListItem, StatusChip, EmptyState, MhubTextField)
 * - PostWelcomeScreen.kt
 * - EditPostScreen.kt
 * - TierSelectionScreen.kt
 * - MyPostsScreen.kt
 * - SoldPostsScreen.kt
 * - BoughtScreen.kt
 * - OffersScreen.kt
 * - CartScreen.kt
 * - RecentlyViewedScreen.kt
 * - SavedSearchesScreen.kt
 * - CompareScreen.kt
 * - BuyerViewScreen.kt
 * - SaleDoneScreen.kt
 * - SaleUndoneScreen.kt
 * - PaymentScreen.kt
 *
 * Please edit the individual files instead of this stub.
 */
`;

fs.writeFileSync(srcPath, notice, 'utf8');
console.log('\nTRIMMED CommerceScreens.kt to deprecation notice');
console.log('\n--- EXTRACTION COMPLETE ---');
console.log(`${extractedFiles.length + 1} files created (including CommerceCommon.kt and trimmed CommerceScreens.kt)`);
