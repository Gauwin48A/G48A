const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt';
let content = fs.readFileSync(path, 'utf8');

if (content.includes('object CompareItemHolder')) {
    console.log('CompareItemHolder already exists');
    process.exit(0);
}

// Find the PostWelcomeScreen comment section and insert before it
const marker = '// ──────────────────────────────────────────────────────────────────────────────\n// PostWelcomeScreen';
const insertText = `// ──────────────────────────────────────────────────────────────────────────────
// CompareItemHolder — singleton holding posts selected for side-by-side comparison
// ──────────────────────────────────────────────────────────────────────────────
object CompareItemHolder {
    var posts: List<Post> = emptyList()
}

`;

if (content.includes(marker)) {
    content = content.replace(marker, insertText + marker);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Added CompareItemHolder successfully');
} else {
    console.log('ERROR: marker not found');
    process.exit(1);
}
