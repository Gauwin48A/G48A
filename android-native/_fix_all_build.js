const fs = require('fs');

// Fix 1: MOCK_EXPLORE_POSTS visibility in ExploreScreen.kt
let exploreContent = fs.readFileSync('android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt', 'utf8');
if (exploreContent.charCodeAt(0) === 0xFEFF) exploreContent = exploreContent.substring(1);

if (exploreContent.includes('private val MOCK_EXPLORE_POSTS')) {
    exploreContent = exploreContent.replace('private val MOCK_EXPLORE_POSTS', 'val MOCK_EXPLORE_POSTS');
    fs.writeFileSync('android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt', exploreContent, 'utf8');
    console.log('FIXED: MOCK_EXPLORE_POSTS visibility (private -> public)');
} else {
    console.log('OK: MOCK_EXPLORE_POSTS already public');
}

// Fix 2: CompareItemHolder in CommerceScreens.kt
let commerceContent = fs.readFileSync('android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt', 'utf8');
if (commerceContent.charCodeAt(0) === 0xFEFF) commerceContent = commerceContent.substring(1);

if (!commerceContent.includes('object CompareItemHolder')) {
    const marker = '// PostWelcomeScreen';
    const insertText = `// ──────────────────────────────────────────────────────────────────────────────
// CompareItemHolder — singleton holding posts selected for side-by-side comparison
// ──────────────────────────────────────────────────────────────────────────────
object CompareItemHolder {
    var posts: List<Post> = emptyList()
}

`;
    commerceContent = commerceContent.replace(marker, insertText + marker);
    console.log('FIXED: Added CompareItemHolder');
} else {
    console.log('OK: CompareItemHolder already exists');
}

// Fix 3: CompareScreen onOpenPost parameter
const oldSig = 'fun CompareScreen(onBack: () -> Unit, viewModel: CompareViewModel = hiltViewModel())';
const newSig = 'fun CompareScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: CompareViewModel = hiltViewModel())';
if (commerceContent.includes(oldSig)) {
    commerceContent = commerceContent.replace(oldSig, newSig);
    console.log('FIXED: CompareScreen signature (added onOpenPost)');
} else if (commerceContent.includes('onOpenPost')) {
    console.log('OK: CompareScreen already has onOpenPost');
} else {
    console.log('WARN: Could not find CompareScreen signature');
}

fs.writeFileSync('android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt', commerceContent, 'utf8');
console.log('\nAll fixes applied. Ready to build.');
