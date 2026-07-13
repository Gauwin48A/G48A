const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Find the orphaned function params - look for 'saveError:' as marker
let startLine = -1;
for (let i = 2790; i < Math.min(lines.length, 2820); i++) {
    if (lines[i].includes('saveError:') && lines[i].includes('String?')) {
        // Back up to find @Composable or the start
        let j = i;
        while (j > 0 && !lines[j].trim().startsWith('@Composable') && 
               !lines[j].trim().startsWith('private fun') && j > i - 5) j--;
        startLine = j;
        break;
    }
}

if (startLine === -1) {
    console.log('ERROR: Could not find orphaned function params');
    process.exit(1);
}

console.log(`Orphaned function starts at line ${startLine + 1}: "${lines[startLine].trim()}"`);

// Count braces to find the end - but only start counting depth after we see the first '{'
let depth = 0;
let hasOpened = false;
let end = lines.length;

for (let i = startLine; i < lines.length; i++) {
    const opens = (lines[i].match(/{/g) || []).length;
    const closes = (lines[i].match(/}/g) || []).length;
    
    if (opens > 0) hasOpened = true;
    depth += opens - closes;
    
    if (hasOpened && depth <= 0 && i > startLine) {
        end = i + 1;
        break;
    }
}

console.log(`Removing lines ${startLine + 1} to ${end} (${end - startLine} lines)`);

// Verify we're not removing too much (safety check: should be < 300 lines for a function)
if (end - startLine > 300) {
    console.log('ERROR: Trying to remove too many lines. Aborting.');
    process.exit(1);
}

// Remove the orphaned function
const newLines = [...lines.slice(0, startLine), ...lines.slice(end)];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');

console.log(`File now has ${newLines.length} lines (was ${lines.length})`);
console.log('Done!');
