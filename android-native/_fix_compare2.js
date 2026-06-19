const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt';
let content = fs.readFileSync(path, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
}

if (content.includes('object CompareItemHolder')) {
    console.log('CompareItemHolder already exists');
    process.exit(0);
}

// Find PostWelcomeScreen
const idx = content.indexOf('PostWelcomeScreen');
if (idx < 0) {
    console.log('ERROR: PostWelcomeScreen not found');
    process.exit(1);
}

// Find the comment block before PostWelcomeScreen
const preBlock = content.lastIndexOf('// ─', idx);
if (preBlock < 0) {
    console.log('ERROR: comment block not found');
    process.exit(1);
}

const insertText = `// ──────────────────────────────────────────────────────────────────────────────
// CompareItemHolder — singleton holding posts selected for side-by-side comparison
// ──────────────────────────────────────────────────────────────────────────────
object CompareItemHolder {
    var posts: List<Post> = emptyList()
}

`;

content = content.substring(0, preBlock) + insertText + content.substring(preBlock);
fs.writeFileSync(path, content, 'utf8');
console.log('Added CompareItemHolder successfully');
