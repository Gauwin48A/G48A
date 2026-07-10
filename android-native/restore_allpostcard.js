const fs = require('fs');
const path = 'app/src/main/java/com/mhub/app/ui/explore/ExploreScreen.kt';
let content = fs.readFileSync(path, 'utf8');

// Find the AllPostCard function
const cardStart = content.indexOf('fun AllPostCard(');
if (cardStart < 0) { console.log('ERROR: AllPostCard not found'); process.exit(1); }

// Find where AllPostCard ends
let cardEnd = content.indexOf('\nprivate fun ', cardStart + 10);
if (cardEnd < 0) cardEnd = content.indexOf('\n@Composable\n', cardStart + 10);
if (cardEnd < 0) cardEnd = cardStart + 3000;

// Get the function body
const cardBody = content.substring(cardStart, cardEnd);

// Check if showPostMenu is declared at the top (after val context = LocalContext.current)
const declPoint = cardBody.indexOf('val context = LocalContext.current');
if (declPoint < 0) { console.log('ERROR: Could not find declaration point'); process.exit(1); }

// Find the line after val context = LocalContext.current
const afterDecl = cardBody.indexOf('\n', declPoint) + 1;

// Check if showPostMenu is already declared in the right place
if (cardBody.substring(0, afterDecl + 200).includes('showPostMenu')) {
    console.log('showPostMenu already declared at top level');
} else {
    // Add showPostMenu declaration after val context
    const insertion = '    var showPostMenu by remember { mutableStateOf(false) }\n';
    const newBody = cardBody.substring(0, afterDecl) + insertion + cardBody.substring(afterDecl);
    content = content.substring(0, cardStart) + newBody + content.substring(cardEnd);
    cardEnd += insertion.length; // Adjust for insertion
    console.log('Added showPostMenu declaration');
}

// Now check if the AlertDialog is at the right scope level
// Find all occurrences of AlertDialog in AllPostCard
const currentCardBody = content.substring(cardStart, cardEnd);
const alertDialogIdx = currentCardBody.indexOf('AlertDialog(');
if (alertDialogIdx < 0) {
    console.log('ERROR: AlertDialog not found in function body');
    process.exit(1);
}

// Check what's before the AlertDialog - it should be at the function level, not inside a lambda
const beforeAlert = currentCardBody.substring(Math.max(0, alertDialogIdx - 200), alertDialogIdx);
if (beforeAlert.includes(') {')) {
    // The AlertDialog is inside a non-composable lambda
    console.log('AlertDialog appears to be inside a non-composable lambda - needs fixing');
    
    // Find the AlertDialog and its closing brace
    const alertStart = alertDialogIdx;
    // Count braces to find the closing
    let braceCount = 1;
    let alertEnd = alertStart + 12; // skip "AlertDialog("
    while (braceCount > 0 && alertEnd < currentCardBody.length) {
        if (currentCardBody[alertEnd] === '{') braceCount++;
        if (currentCardBody[alertEnd] === '}') braceCount--;
        alertEnd++;
    }
    
    // Remove the AlertDialog from its current position
    const alertText = currentCardBody.substring(alertStart, alertEnd);
    console.log('AlertDialog length:', alertText.length);
    
    // Find the end of the Card's content - look for the last } that closes the Card
    const cardContentEnd = currentCardBody.lastIndexOf('        }');
    if (cardContentEnd < 0) { console.log('ERROR: Cannot find Card end'); process.exit(1); }
    
    // The AlertDialog should go AFTER the Card closes but BEFORE the function closes
    // Find where the function body ends (before the last closing brace)
    const lastBrace = currentCardBody.lastIndexOf('}');
    const funcBodyEnd = currentCardBody.substring(0, lastBrace).lastIndexOf('}');
    
    // Build the new function body: remove alert from current position, add to end of function
    const beforeAlertSection = currentCardBody.substring(0, alertStart);
    const afterAlertSection = currentCardBody.substring(alertEnd);
    const cleanedBody = beforeAlertSection + afterAlertSection;
    
    // Now add AlertDialog at the end, before the closing } of the function
    const funcEnd = cleanedBody.lastIndexOf('}');
    const newFuncBody = cleanedBody.substring(0, funcEnd) + '\n' + alertText + '\n' + cleanedBody.substring(funcEnd);
    
    content = content.substring(0, cardStart) + newFuncBody + content.substring(cardEnd);
    console.log('Moved AlertDialog to top-level function scope');
} else {
    console.log('AlertDialog appears to be at the right scope level');
}

fs.writeFileSync(path, content);
console.log('SUCCESS: AllPostCard function fixed');
