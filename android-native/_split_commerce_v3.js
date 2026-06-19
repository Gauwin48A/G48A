const fs = require('fs');
const path = require('path');

const srcPath = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt';
const outDir = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/';

let content = fs.readFileSync(srcPath, 'utf8');
// Remove BOM
if (content.charCodeAt(0) === 0xFEFF) content = content.substring(1);

// Find the first shared helpers comment to isolate imports
const sharedHelpersIdx = content.indexOf('// Shared helpers');
const importBlockEnd = content.lastIndexOf('\n', sharedHelpersIdx > 0 ? sharedHelpersIdx : 0);
const importBlock = content.substring(0, importBlockEnd > 0 ? importBlockEnd : content.indexOf('\n// ─'));

// Function to find section boundaries by function/class names
function findSection(content, startMarker, endMarker) {
    const startIdx = content.indexOf(startMarker);
    if (startIdx < 0) throw new Error(`Start marker not found: ${startMarker}`);
    
    let endIdx;
    if (typeof endMarker === 'string') {
        endIdx = content.indexOf(endMarker, startIdx + startMarker.length + 1);
        if (endIdx < 0) {
            // End marker not found - use end of string
            endIdx = content.length;
        }
    } else {
        // endMarker is a function that takes startIdx and returns endIdx
        endIdx = endMarker(content, startIdx, startMarker);
    }
    
    return { start: startIdx, end: endIdx, code: content.substring(startIdx, endIdx) };
}

// Define sections using function/class name markers
const sections = [
    {
        name: 'CommerceCommon',
        desc: 'Shared helpers',
        getSection: (c) => {
            const start = c.indexOf('// Shared helpers');
            // Everything between Shared helpers and PostWelcomeScreen
            const end = c.indexOf('// PostWelcomeScreen');
            return { start: start - 3 - c.substring(0, start).lastIndexOf('\n// ─'), end: end > start ? end : start + 1000 };
        }
    },
];

// Actually, let me use a different approach - find each function/class definition
// and extract from it to the next definition

// List of key definitions in order
const defs = [
    { name: 'postWelcomeScreen', marker: 'fun PostWelcomeScreen(' },
    { name: 'editPostViewModel', marker: 'class EditPostViewModel ' },
    { name: 'editPostScreen', marker: 'fun EditPostScreen(' },
    { name: 'tiersViewModel', marker: 'class TiersViewModel ' },
    { name: 'tierSelectionScreen', marker: 'fun TierSelectionScreen(' },
    { name: 'myPostsViewModel', marker: 'class MyPostsViewModel ' },
    { name: 'myPostsScreen', marker: 'fun MyPostsScreen(' },
    { name: 'soldPostsViewModel', marker: 'class SoldPostsViewModel ' },
    { name: 'boughtPostsViewModel', marker: 'class BoughtPostsViewModel ' },
    { name: 'soldPostsScreen', marker: 'fun SoldPostsScreen(' },
    { name: 'boughtPostsScreen', marker: 'fun BoughtPostsScreen(' },
    { name: 'offersViewModel', marker: 'class OffersViewModel ' },
    { name: 'offersScreen', marker: 'fun OffersScreen(' },
    { name: 'cartViewModel', marker: 'class CartViewModel ' },
    { name: 'cartScreen', marker: 'fun CartScreen(' },
    { name: 'recentlyViewedViewModel', marker: 'class RecentlyViewedViewModel ' },
    { name: 'recentlyViewedScreen', marker: 'fun RecentlyViewedScreen(' },
    { name: 'savedSearchesViewModel', marker: 'class SavedSearchesViewModel ' },
    { name: 'savedSearchesScreen', marker: 'fun SavedSearchesScreen(' },
    { name: 'compareViewModel', marker: 'class CompareViewModel ' },
    { name: 'compareScreen', marker: 'fun CompareScreen(' },
    { name: 'buyerViewViewModel', marker: 'class BuyerViewViewModel ' },
    { name: 'buyerViewScreen', marker: 'fun BuyerViewScreen(' },
    { name: 'saleDoneViewModel', marker: 'class SaleDoneViewModel ' },
    { name: 'saleDoneScreen', marker: 'fun SaleDoneScreen(' },
    { name: 'saleUndoneViewModel', marker: 'class SaleUndoneViewModel ' },
    { name: 'saleUndoneScreen', marker: 'fun SaleUndoneScreen(' },
    { name: 'paymentViewModel', marker: 'class PaymentViewModel ' },
    { name: 'paymentScreen', marker: 'fun PaymentScreen(' },
];

// Find positions of all definitions
const positions = [];
defs.forEach(d => {
    const idx = content.indexOf(d.marker);
    if (idx >= 0) {
        positions.push({ name: d.name, marker: d.marker, idx });
    } else {
        console.log(`WARN: ${d.name} marker not found: ${d.marker.substring(0, 40)}...`);
    }
});
positions.sort((a, b) => a.idx - b.idx);

// Group sections: screens with their companion ViewModels
const screenGroups = [
    { files: ['CommerceCommon'], description: 'Shared helpers (ScreenTopBar, PostListItem, etc.)' },
    { files: ['PostWelcomeScreen'], description: 'PostWelcomeScreen' },
    { files: ['EditPostScreen'], description: 'EditPostViewModel + EditPostScreen + MhubTextField helpers' },
    { files: ['TierSelectionScreen'], description: 'TiersViewModel + TierSelectionScreen + TierCard' },
    { files: ['MyPostsScreen'], description: 'MyPostsViewModel + MyPostsScreen + MyPostCard' },
    { files: ['SoldPostsScreen'], description: 'SoldPostsViewModel + BoughtPostsViewModel + PostListUiState + SoldPostsScreen + SoldPostsListScreen' },
    { files: ['BoughtScreen'], description: 'BoughtPostsScreen (standalone composable)' },
    { files: ['OffersScreen'], description: 'OffersViewModel + OffersScreen' },
    { files: ['CartScreen'], description: 'CartViewModel + CartScreen' },
    { files: ['RecentlyViewedScreen'], description: 'RecentlyViewedViewModel + RecentlyViewedScreen' },
    { files: ['SavedSearchesScreen'], description: 'SavedSearchesViewModel + SavedSearchesScreen' },
    { files: ['CompareScreen'], description: 'CompareViewModel + CompareScreen' },
    { files: ['BuyerViewScreen'], description: 'BuyerViewViewModel + BuyerViewScreen' },
    { files: ['SaleDoneScreen'], description: 'SaleDoneViewModel + SaleDoneScreen' },
    { files: ['SaleUndoneScreen'], description: 'SaleUndoneViewModel + SaleUndoneScreen' },
    { files: ['PaymentScreen'], description: 'PaymentViewModel + PaymentScreen' },
];

// Build extraction plan based on position groups
const extractionPlan = [];

// First group: Shared helpers (from '// Shared helpers' before first position)
const sharedStartIdx = content.indexOf('// Shared helpers');
const firstPos = positions[0].idx;
const sharedCode = content.substring(sharedStartIdx - 25, firstPos - 25 > sharedStartIdx ? firstPos - 25 : firstPos);
extractionPlan.push({ name: 'CommerceCommon', code: sharedCode });

// Each subsequent group: from its first position to the next group's first position
for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const nextPos = i + 1 < positions.length ? positions[i + 1].idx : content.length;
    
    // Find the group name - start from position and go backwards to find the definition start
    const lineStart = content.lastIndexOf('\n', pos.idx - 2) + 1;
    const code = content.substring(lineStart, nextPos === content.length ? content.length : content.lastIndexOf('\n', nextPos - 2));
    
    // Determine the output filename based on the function/class name
    let fileName = '';
    if (pos.name.includes('editPost')) fileName = 'EditPostScreen';
    else if (pos.name.includes('tiers') || pos.name.includes('tierSelection')) fileName = 'TierSelectionScreen';
    else if (pos.name.includes('myPosts')) fileName = 'MyPostsScreen';
    else if (pos.name.includes('soldPosts')) fileName = 'SoldPostsScreen';
    else if (pos.name.includes('boughtPosts')) fileName = 'BoughtScreen';
    else if (pos.name.includes('offers')) fileName = 'OffersScreen';
    else if (pos.name.includes('cart')) fileName = 'CartScreen';
    else if (pos.name.includes('recentlyViewed')) fileName = 'RecentlyViewedScreen';
    else if (pos.name.includes('savedSearches')) fileName = 'SavedSearchesScreen';
    else if (pos.name.includes('compare')) fileName = 'CompareScreen';
    else if (pos.name.includes('buyerView')) fileName = 'BuyerViewScreen';
    else if (pos.name.includes('saleDone')) fileName = 'SaleDoneScreen';
    else if (pos.name.includes('saleUndone')) fileName = 'SaleUndoneScreen';
    else if (pos.name.includes('payment')) fileName = 'PaymentScreen';
    else if (pos.name.includes('postWelcome')) fileName = 'PostWelcomeScreen';
    
    if (fileName) {
        const existing = extractionPlan.find(e => e.name === fileName);
        if (existing) {
            existing.code += '\n\n' + code;
        } else {
            extractionPlan.push({ name: fileName, code: code });
        }
    }
}

// Write all files
extractionPlan.forEach(item => {
    // Clean the code - remove BOM if present
    let cleanCode = item.code.trim();
    if (cleanCode.charCodeAt(0) === 0xFEFF) cleanCode = cleanCode.substring(1);
    
    let fileContent = importBlock + '\n\n' + cleanCode;
    
    if (item.name === 'CommerceCommon') {
        fileContent = importBlock + '\n\n' + cleanCode
            .replace(/\bprivate val bgGradient/g, 'internal val bgGradient')
            .replace(/\bprivate val brandGrad/g, 'internal val brandGrad')
            .replace(/\bprivate fun ScreenTopBar/g, 'internal fun ScreenTopBar')
            .replace(/\bprivate fun MhubTextFieldWithCounter/g, 'internal fun MhubTextFieldWithCounter')
            .replace(/\bprivate fun MhubTextField/g, 'internal fun MhubTextField')
            .replace(/\bprivate fun PostListItem/g, 'internal fun PostListItem')
            .replace(/\bprivate fun StatusChip/g, 'internal fun StatusChip')
            .replace(/\bprivate fun EmptyState/g, 'internal fun EmptyState');
    }
    
    const fpath = path.join(outDir, item.name + '.kt');
    fs.writeFileSync(fpath, fileContent, 'utf8');
    console.log(`CREATED ${item.name}.kt (${cleanCode.split('\n').length} lines)`);
});

console.log('\n--- EXTRACTION COMPLETE ---');
console.log(`${extractionPlan.length} files created.`);
