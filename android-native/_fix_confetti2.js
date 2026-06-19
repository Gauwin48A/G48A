const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/rewards/RewardsScreen.kt';
let c = fs.readFileSync(path, 'utf8');

// Find the marker: val darkTheme = isSystemInDarkTheme() followed by comments
const marker = 'val darkTheme = isSystemInDarkTheme()\r\n\r\n    // Always attempt to load on mount';
const idx = c.indexOf(marker);

if (idx === -1) {
    console.log('ERROR: Could not find marker. Trying alternative...');
    const idx2 = c.indexOf('isSystemInDarkTheme()');
    if (idx2 > 0) {
        console.log('Found isSystemInDarkTheme at', idx2, 'Context:', JSON.stringify(c.substring(idx2, idx2 + 100)));
    }
    process.exit(1);
}

const insert = [
    '    val darkTheme = isSystemInDarkTheme()',
    '',
    '    // Confetti trigger on milestone claim success',
    '    var showConfetti by remember { mutableStateOf(false) }',
    '    LaunchedEffect(state.actionResult) {',
    '        if (state.actionResult?.contains("Milestone") == true || state.actionResult?.contains("\uD83C\uDF89") == true) {',
    '            showConfetti = true',
    '        }',
    '    }',
    '    LaunchedEffect(showConfetti) {',
    '        if (showConfetti) {',
    '            kotlinx.coroutines.delay(2500)',
    '            showConfetti = false',
    '        }',
    '    }',
    '',
    '    // Always attempt to load on mount',
].join('\r\n');

c = c.replace(marker, insert);
fs.writeFileSync(path, c, 'utf8');
console.log('SUCCESS: Added showConfetti state declarations');
