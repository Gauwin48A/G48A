const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/rewards/RewardsScreen.kt';
let c = fs.readFileSync(path, 'utf8');

// Find the RewardsScreen function body and add state before the first LaunchedEffect
const funcStart = 'fun RewardsScreen(';
const funcIdx = c.indexOf(funcStart);

if (funcIdx === -1) {
    console.log('ERROR: Could not find RewardsScreen function');
    process.exit(1);
}

const afterFunc = c.substring(funcIdx);
const launchIdx = afterFunc.indexOf('LaunchedEffect(Unit)');

if (launchIdx === -1) {
    console.log('ERROR: Could not find LaunchedEffect anchor');
    process.exit(1);
}

// Find the last \r\n\r\n before LaunchedEffect - this is where state declarations live
const beforeLaunch = afterFunc.substring(0, launchIdx);
const insertPos = beforeLaunch.lastIndexOf('\r\n    // Auto-clear action result');

if (insertPos === -1) {
    // Try alternative pattern
    const altPos = beforeLaunch.lastIndexOf('\r\n\r\n    LaunchedEffect');
    if (altPos > 0) {
        // Insert right before the blank line that precedes LaunchedEffect
        const declaration = '\r\n    // Confetti trigger on milestone claim success\r\n    var showConfetti by remember { mutableStateOf(false) }\r\n    LaunchedEffect(state.actionResult) {\r\n        if (state.actionResult?.contains("Milestone") == true || state.actionResult?.contains("\uD83C\uDF89") == true) {\r\n            showConfetti = true\r\n        }\r\n    }\r\n    LaunchedEffect(showConfetti) {\r\n        if (showConfetti) {\r\n            kotlinx.coroutines.delay(2500)\r\n            showConfetti = false\r\n        }\r\n    }\r\n';
        const globalPos = funcIdx + altPos + 2;
        c = c.substring(0, globalPos) + declaration + c.substring(globalPos);
        fs.writeFileSync(path, c, 'utf8');
        console.log('Added confetti state declarations via alt pattern');
        process.exit(0);
    }
    console.log('ERROR: Could not find insert location. insertPos:', insertPos, 'altPos:', altPos);
    process.exit(1);
}

// Add state declarations after the "Auto-clear action result" comment block
const declaration = '\r\n    // Confetti trigger on milestone claim success\r\n    var showConfetti by remember { mutableStateOf(false) }\r\n    LaunchedEffect(state.actionResult) {\r\n        if (state.actionResult?.contains("Milestone") == true || state.actionResult?.contains("\uD83C\uDF89") == true) {\r\n            showConfetti = true\r\n        }\r\n    }\r\n    LaunchedEffect(showConfetti) {\r\n        if (showConfetti) {\r\n            kotlinx.coroutines.delay(2500)\r\n            showConfetti = false\r\n        }\r\n    }\r\n';

const globalPos = funcIdx + insertPos;
c = c.substring(0, globalPos) + declaration + c.substring(globalPos);
fs.writeFileSync(path, c, 'utf8');
console.log('Added confetti state declarations successfully');
