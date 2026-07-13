const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/social/SocialScreens.kt');
let content = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

const lines = content.split('\n');

// Find the ReviewsScreen section boundaries
const sectionStart = '// ReviewsScreen';
const sectionEnd = '// ──────────────────────────────────────────────────────────────────────────────';

let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === sectionStart) {
        startIdx = i;
        break;
    }
}

// Find the second occurrence of sectionEnd (the one after ReviewsScreen)
let endCount = 0;
let endIdx = -1;
for (let i = (startIdx > 0 ? startIdx : 0); i < lines.length; i++) {
    if (lines[i].trim() === sectionEnd) {
        endCount++;
        if (endCount === 2) {
            endIdx = i;
            break;
        }
    }
}

if (startIdx < 0 || endIdx < 0) {
    console.log(`ERROR: Could not find section boundaries. startIdx=${startIdx}, endIdx=${endIdx}`);
    process.exit(1);
}

console.log(`Found ReviewsScreen from line ${startIdx + 1} to ${endIdx + 1} (${endIdx - startIdx} lines)`);

// Remove the lines
const newLines = [...lines.slice(0, startIdx), ...lines.slice(endIdx)];
content = newLines.join('\n');

fs.writeFileSync(FILE, content, 'utf8');

const opens = (content.match(/{/g) || []).length;
const closes = (content.match(/}/g) || []).length;
console.log(`SUCCESS: ReviewsScreen removed. Lines before: ${lines.length}, after: ${newLines.length}. Braces: ${opens}/${closes} (diff=${opens - closes}).`);
