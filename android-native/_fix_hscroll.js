const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Add back horizontalScroll import
if (!content.includes('import androidx.compose.foundation.horizontalScroll')) {
    // Find the rememberScrollState import and add horizontalScroll after it
    const marker = 'import androidx.compose.foundation.rememberScrollState';
    if (content.includes(marker)) {
        content = content.replace(marker, marker + '\nimport androidx.compose.foundation.horizontalScroll');
        console.log('Added horizontalScroll import');
    } else {
        console.log('ERROR: rememberScrollState import not found');
        process.exit(1);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
