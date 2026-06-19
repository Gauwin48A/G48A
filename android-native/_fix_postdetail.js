const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/home/PostDetailScreen.kt';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

// 1. Add missing imports
if (!content.includes('import androidx.compose.foundation.layout.WindowInsets')) {
    content = content.replace(
        'import androidx.compose.foundation.layout.width\n',
        'import androidx.compose.foundation.layout.width\nimport androidx.compose.foundation.layout.WindowInsets\nimport androidx.compose.foundation.layout.windowInsetsPadding\n'
    );
    changes++;
    console.log('Added WindowInsets/windowInsetsPadding imports');
}

if (!content.includes('import androidx.compose.material.icons.filled.Check')) {
    content = content.replace(
        'import androidx.compose.material.icons.filled.Call\n',
        'import androidx.compose.material.icons.filled.Call\nimport androidx.compose.material.icons.filled.Check\n'
    );
    changes++;
    console.log('Added Check icon import');
}

// 2. Move isOwner declaration before Scaffold
// The pattern: after "if (showInterestModal && state.post != null) {" block, before Scaffold(
// We need to find the Scaffold( call and add val isOwner before it
const scaffoldIdx = content.indexOf('\nScaffold(\n');
if (scaffoldIdx > 0) {
    // Find the closing of the interest modal block before Scaffold
    const beforeScaffold = content.substring(0, scaffoldIdx);
    // Check if isOwner is already declared before Scaffold
    if (beforeScaffold.includes('val isOwner =')) {
        console.log('isOwner already declared before Scaffold');
    } else {
        // Find the isOwner inside the Scaffold content block and move it
        const isOwnerRegex = /\n\s*val isOwner = state\.ownerInsights != null/;
        const match = content.match(isOwnerRegex);
        if (match) {
            // Replace the inline declaration with empty string
            content = content.replace(isOwnerRegex, '');
            // Then add it before the Scaffold( call
            content = content.replace(
                '\nScaffold(\n',
                '\n    val isOwner = state.ownerInsights != null\n\nScaffold(\n'
            );
            changes++;
            console.log('Moved isOwner before Scaffold');
        } else {
            console.log('Could not find isOwner declaration pattern');
        }
    }
}

fs.writeFileSync(path, content, 'utf8');
console.log(`Done. ${changes} changes made.`);
