const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
// Read and normalize line endings
let raw = fs.readFileSync(filePath, 'utf-8');
let content = raw.replace(/\r\n/g, '\n');
const originalLines = content.split('\n');
const changes = [];

// ── Helper to find block end by brace counting ──
function findBlockEnd(lines, startIdx) {
    let depth = 0;
    let started = false;
    for (let i = startIdx; i < lines.length; i++) {
        const opens = (lines[i].match(/{/g) || []).length;
        const closes = (lines[i].match(/}/g) || []).length;
        if (opens > 0) started = true;
        depth += opens - closes;
        if (started && depth <= 0 && i > startIdx) {
            return i + 1;
        }
    }
    return lines.length;
}

// ── Helper to remove a range ──
function removeRange(linesArray, start, end) {
    const removed = linesArray.splice(start, end - start);
    return removed;
}

let lines = [...originalLines];

// 1. Remove 'val reviews: List<UserReview>' from ProfileState
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('val reviews: List<UserReview>')) {
        changes.push(`Removed reviews field (line ${i+1}): ${lines[i].trim().substring(0, 40)}`);
        lines.splice(i, 1);
        break;
    }
}

// 2. Remove UserReview data class
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^data class UserReview\b/)) {
        const end = findBlockEnd(lines, i);
        if (end - i < 50) {
            changes.push(`Removed UserReview data class (lines ${i+1}-${end})`);
            lines.splice(i, end - i);
            break;
        }
    }
}

// 3. Remove loadReviews function (including reviewsLoaded variable before it)
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^private var reviewsLoaded = false/)) {
        // Find the start of loadReviews function
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('fun loadReviews()')) {
            j++;
        }
        if (j < lines.length) {
            const end = findBlockEnd(lines, j);
            if (end - i < 100) {
                changes.push(`Removed reviewsLoaded + loadReviews (lines ${i+1}-${end})`);
                lines.splice(i, end - i);
                break;
            }
        }
    }
}

// 4. Remove EditProfileDialog call block (if showEditDialog)
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'if (showEditDialog) {' || lines[i].trim() === 'if (showEditDialog) {' && 
        lines.slice(i, i + 20).join('\n').includes('EditProfileDialog')) {
        const end = findBlockEnd(lines, i);
        const blockText = lines.slice(i, end).join('\n');
        if (blockText.includes('EditProfileDialog') && end - i < 30) {
            changes.push(`Removed EditProfileDialog call block (lines ${i+1}-${end})`);
            lines.splice(i, end - i);
            break;
        }
    }
}

// 5. Remove LaunchedEffect + ReviewsTab call
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('loadReviews()') && lines[i].includes('LaunchedEffect')) {
        // Remove this line and the ReviewsTab line after it
        if (i + 1 < lines.length && lines[i + 1].includes('ReviewsTab(reviews = state.reviews)')) {
            changes.push(`Removed LaunchedEffect loadReviews + ReviewsTab call (lines ${i+1}-${i+2})`);
            lines.splice(i, 2);
            break;
        }
    }
}

// 6. Remove ReviewsTab composable
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^private fun ReviewsTab\(/)) {
        const end = findBlockEnd(lines, i);
        if (end - i < 200) {
            changes.push(`Removed ReviewsTab composable (lines ${i+1}-${end})`);
            lines.splice(i, end - i);
            break;
        }
    }
}

// 7. Remove EditProfileDialog composable
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^private fun EditProfileDialog\(/)) {
        const end = findBlockEnd(lines, i);
        if (end - i < 200) {
            changes.push(`Removed EditProfileDialog composable (lines ${i+1}-${end})`);
            lines.splice(i, end - i);
            break;
        }
    }
}

// 8. Remove the Reviews tab from ScrollableTabRow (Tab 4)
// Find the ScrollableTabRow and remove the Reviews tab
for (let i = 0; i < lines.length; i++) {
    // Find the Reviews tab entry in ScrollableTabRow
    if (lines[i].includes('selectedTab == 4') && lines[i].includes('profile_tab_reviews')) {
        changes.push(`Removed Reviews tab from ScrollableTabRow (line ${i+1})`);
        lines.splice(i, 1);
        break;
    }
}

// Write back with original line endings (CRLF)
let output = lines.join('\r\n');
fs.writeFileSync(filePath, output, 'utf-8');

console.log(`Changes applied: ${changes.length}`);
changes.forEach(c => console.log(`  ✓ ${c}`));
console.log(`Lines: ${originalLines.length} → ${lines.length}`);
console.log('Done!');
