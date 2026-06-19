const fs = require('fs');
const path = 'android-native/app/src/main/java/com/mhub/app/ui/rewards/RewardsScreen.kt';
let c = fs.readFileSync(path, 'utf8');

let changes = 0;

// 1. Add showConfetti state + LaunchedEffect triggers after the auto-clear actionResult block
const stateAnchor = 'viewModel.clearActionResult()\r\n        }\r\n\r\n        // Confetti trigger on milestone claim\r\n        var showConfetti by remember { mutableStateOf(false) }\r\n        LaunchedEffect(state.actionResult) {\r\n            if (state.actionResult?.contains(\"Milestone\") == true || state.actionResult?.contains(\"\uD83C\uDF89\") == true) {\r\n                showConfetti = true\r\n            }\r\n        }\r\n        LaunchedEffect(showConfetti) {\r\n            if (showConfetti) {\r\n                kotlinx.coroutines.delay(2500)\r\n                showConfetti = false\r\n            }\r\n        }\r\n';

// Find the pattern: after actionResult auto-clear, before Scaffold
const clearActionEnd = 'viewModel.clearActionResult()';
const scaffoldStart = '\r\n    Scaffold(';

const clearIdx = c.indexOf(clearActionEnd);
const scaffIdx = c.indexOf(scaffoldStart, clearIdx);

if (clearIdx > 0 && scaffIdx > 0) {
    const beforeScaffold = c.substring(clearIdx + clearActionEnd.length + 10, scaffIdx);
    // Check if confetti state was already added
    if (!c.includes('showConfetti by remember')) {
        // Insert the confetti state declarations right before Scaffold(
        c = c.replace(scaffoldStart, stateAnchor + scaffoldStart);
        changes++;
        console.log('Added confetti state and LaunchedEffect triggers');
    } else {
        console.log('Confetti state already exists');
    }
} else {
    console.log('Could not find anchor points. clearIdx:', clearIdx, 'scaffIdx:', scaffIdx);
}

// 2. Add ConfettiAnimation() call - right before the closing of RewardsScreen composable
const composableEnd = '}\r\n}\r\n\r\n// ──────────────────────────── Helpers ────────────────────────────────';
const confettiCall = '\r\n    }\r\n    // Confetti overlay (on top of Scaffold, inside RewardsScreen)\r\n    if (showConfetti) {\r\n        ConfettiAnimation()\r\n    }\r\n}\r\n\r\n// ──────────────────────────── Helpers ────────────────────────────────';

if (c.includes(composableEnd)) {
    c = c.replace(composableEnd, confettiCall);
    changes++;
    console.log('Added ConfettiAnimation() call at end of RewardsScreen');
} else {
    console.log('Could not find composable end marker');
}

fs.writeFileSync(path, c, 'utf8');
console.log('Done. Changes made:', changes);
