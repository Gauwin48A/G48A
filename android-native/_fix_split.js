/**
 * Fix: profileCountryOptions declaration was split by AvatarWithRing insertion.
 * Lines 1960: "private val profileCountryOptions" (incomplete)
 * Lines ~2014: " = listOf(" + list items (orphaned)
 * Merge them back together.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
const EOL = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(EOL);

// Find the incomplete declaration
const declIdx = lines.findIndex(l => l.trim() === 'private val profileCountryOptions');
if (declIdx >= 0) {
  console.log(`Found incomplete declaration at line ${declIdx + 1}`);
  
  // Change the declaration to include = listOf(
  lines[declIdx] = 'private val profileCountryOptions = listOf(';
  
  // Find the orphaned = listOf( that follows
  const orphanIdx = lines.findIndex((l, i) => 
    i > declIdx && l.trim() === '= listOf('
  );
  
  if (orphanIdx >= 0) {
    console.log(`Found orphaned = listOf at line ${orphanIdx + 1}`);
    
    // Find the closing ")" of the orphaned list
    let closeIdx = orphanIdx;
    for (let i = orphanIdx; i < Math.min(orphanIdx + 30, lines.length); i++) {
      if (lines[i].trim() === ')' && i > orphanIdx) {
        closeIdx = i;
        break;
      }
    }
    console.log(`Orphaned list spans lines ${orphanIdx + 1} to ${closeIdx + 1}`);
    
    // Extract the list items (from orphanIdx+1 to closeIdx-1)
    const listItems = lines.slice(orphanIdx + 1, closeIdx);
    
    // Insert the list items after the declaration
    // Calculate proper indentation
    const indent = '    '; // 4 spaces for content inside listOf
    const insertAfter = declIdx;
    for (let j = listItems.length - 1; j >= 0; j--) {
      lines.splice(insertAfter + 1, 0, indent + listItems[j].trim());
    }
    
    // Remove the orphaned block (including the = listOf( and closing ))
    const removeStart = orphanIdx + listItems.length; // after inserting, orphanIdx shifted
    // Actually we inserted listItems.length items after declIdx, so orphanIdx shifted
    const actualOrphanStart = orphanIdx + listItems.length;
    const actualCloseIdx = closeIdx + listItems.length;
    lines.splice(actualOrphanStart, actualCloseIdx - actualOrphanStart + 1);
    
    console.log('✓ Fixed: merged profileCountryOptions declaration');
  } else {
    console.log('No orphaned list found - checking if declaration is complete');
    // It might already be complete now
  }
} else {
  console.log('Could not find profileCountryOptions declaration');
}

// Write back
content = lines.join(EOL);
fs.writeFileSync(filePath, content, 'utf8');
console.log(`File now has ${lines.length} lines`);

// Check brace balance
let open = 0, close = 0;
for (const l of lines) {
  open += (l.match(/{/g) || []).length;
  close += (l.match(/}/g) || []).length;
}
console.log(`Brace balance: open=${open}, close=${close}, diff=${open-close}`);
