const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Replace Icons.Default.Map with Icons.Filled.Map
if (content.includes('Icons.Default.Map')) {
    content = content.replace(/Icons\.Default\.Map/g, 'Icons.Filled.Map');
    console.log('Fixed Icons.Default.Map -> Icons.Filled.Map');
}

// Fix 2: Replace Icons.Default.ViewList with Icons.AutoMirrored.Filled.ViewList
if (content.includes('Icons.Default.ViewList')) {
    content = content.replace(/Icons\.Default\.ViewList/g, 'Icons.AutoMirrored.Filled.ViewList');
    console.log('Fixed Icons.Default.ViewList -> Icons.AutoMirrored.Filled.ViewList');
}

// Fix 3: Add isMapView parameter to AllPostsBrowse composable
const allPostsBrowseSig = '    onSetPriceRange: (Float, Float) -> Unit = { _, _ -> },\n)';
const allPostsBrowseSigFixed = '    onSetPriceRange: (Float, Float) -> Unit = { _, _ -> },\n    isMapView: Boolean = false,\n)';
if (content.includes(allPostsBrowseSig) && !content.includes('isMapView: Boolean = false')) {
    content = content.replace(allPostsBrowseSig, allPostsBrowseSigFixed);
    console.log('Added isMapView parameter to AllPostsBrowse');
}

fs.writeFileSync(path, content, 'utf8');
console.log('ExploreScreen.kt build fixes applied successfully');
