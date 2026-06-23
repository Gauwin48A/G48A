const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Add import for LocalContext if not already present
if (!content.includes('import androidx.compose.ui.platform.LocalContext')) {
    content = content.replace(
        'import androidx.compose.ui.platform.LocalClipboardManager',
        'import androidx.compose.ui.platform.LocalClipboardManager\nimport androidx.compose.ui.platform.LocalContext'
    );
    console.log('Added LocalContext import');
}

// Add val context = LocalContext.current in FeedPostAddScreen
// Find the line "LaunchedEffect(state.success) { if (state.success) onBack() }"
const oldLine = '    LaunchedEffect(state.success) { if (state.success) onBack() }';
const newLine = '    LaunchedEffect(state.success) { if (state.success) onBack() }\n    val context = LocalContext.current';

if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    console.log('Added context variable');
} else {
    console.log('ERROR: Could not find LaunchedEffect line');
    // Try alternative - the line might have been modified
    const altLine = 'LaunchedEffect(state.success) { if (state.success) onBack() }';
    if (content.includes(altLine)) {
        content = content.replace(altLine, '    LaunchedEffect(state.success) { if (state.success) onBack() }\n    val context = LocalContext.current');
        console.log('Added context variable (alt match)');
    } else {
        process.exit(1);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
