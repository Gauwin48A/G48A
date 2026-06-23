const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt');
let content = fs.readFileSync(filePath, 'utf8');

// Add android.net.Uri import after LocalContext/LocalClipboardManager
if (!content.includes('import android.net.Uri')) {
    // Find a good place to add it - after existing platform imports
    const markers = [
        'import androidx.compose.ui.platform.LocalContext',
        'import androidx.compose.ui.platform.LocalClipboardManager',
        'import androidx.compose.ui.res.stringResource',
    ];
    
    for (const marker of markers) {
        if (content.includes(marker)) {
            content = content.replace(marker, marker + '\nimport android.net.Uri');
            console.log('Added Uri import after', marker);
            break;
        }
    }
}

// Dedup if needed
while (content.includes('import android.net.Uri\nimport android.net.Uri')) {
    content = content.replace('import android.net.Uri\nimport android.net.Uri', 'import android.net.Uri');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File saved');
