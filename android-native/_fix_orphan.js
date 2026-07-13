const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Find orphaned @Composable at line 2794 (0-indexed 2793)
const start = 2793;
if (!lines[start] || !lines[start].trim().startsWith('@Composable')) {
    console.log('ERROR: Line 2794 is not @Composable. Found:', lines[start]);
    process.exit(1);
}

// Check if the next lines look like a function signature without a function name
const nextLine = lines[start + 1] || '';
if (!nextLine.includes('saving: Boolean') && !nextLine.includes('saveError')) {
    console.log('ERROR: Line 2795 is not the EditProfileDialog params. Found:', nextLine);
    process.exit(1);
}

// Count braces to find the end
let depth = 0;
let end = start;
for (let i = start; i < lines.length; i++) {
    const opens = (lines[i].match(/{/g) || []).length;
    const closes = (lines[i].match(/}/g) || []).length;
    depth += opens - closes;
    if (depth <= 0 && i > start) {
        end = i + 1;
        break;
    }
}
if (end === start) {
    end = lines.length;
    console.log('Warning: Could not find closing brace, removing to end of file');
}

console.log(`Removing lines ${start+1} to ${end} (${end - start} lines)`);

// Remove the orphaned function
const newLines = [...lines.slice(0, start), ...lines.slice(end)];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');

console.log(`File now has ${newLines.length} lines (was ${lines.length})`);
console.log('Done!');
