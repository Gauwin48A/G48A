/**
 * Remove duplicate old createDemoUser and fix missing closing brace
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
const CR = '\n';

// ─── Fix 1: Remove duplicate old createDemoUser ──────────────────────────
const oldDupStart = `                    currentPlan = "premium",`;
const oldDupEnd = `    fun shareProfile(context: android.content.Context) {`;

// Find the old duplicate by looking for the pattern that follows the good function
const goodFuncEnd = `    }\n\n\n    fun shareProfile(context`;
const badPattern = `            currentPlan = "premium",
            isKycVerified = false,
            kycStatus = null,
            role = "user",
            avatar = null,
            coverImage = null,
            rewardsRank = "DEMO",
        )
    }


    fun shareProfile(context`;

if (content.includes(badPattern)) {
  content = content.replace(badPattern, `
    fun shareProfile(context`);
  console.log('✓ Removed old duplicate createDemoUser function');
} else {
  console.log('✗ Could not find duplicate pattern');
  // Try line-based approach
  const lines = content.split(/\r?\n/);
  const dupIdx = lines.findIndex((l, i) => i > 400 && l.includes('currentPlan = "premium"') && !l.includes('Demo User'));
  if (dupIdx >= 0) {
    // Find the end of this section (up to "fun shareProfile")
    const shareProfileIdx = lines.findIndex((l, i) => i > dupIdx && l.includes('fun shareProfile(context'));
    if (shareProfileIdx >= 0) {
      // Check if there's a blank line before shareProfile
      let removeEnd = shareProfileIdx - 1;
      while (removeEnd > dupIdx && lines[removeEnd].trim() === '') removeEnd--;
      lines.splice(dupIdx - 1, removeEnd - dupIdx + 2);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log('✓ Removed duplicate via line-based approach');
    }
  }
}

// ─── Fix 2: Check for missing closing brace at end ──────────────────────
// Read file again since we may have changed it
content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
const lastLine = lines[lines.length - 1].trim();
console.log(`File has ${lines.length} lines, last line: "${lastLine}"`);

// Check if the file ends with just closing braces (which should be the case for a valid file)
// Count total braces to find imbalance
let totalOpen = 0;
let totalClose = 0;
for (const line of lines) {
  totalOpen += (line.match(/{/g) || []).length;
  totalClose += (line.match(/}/g) || []).length;
}

const diff = totalOpen - totalClose;
console.log(`Brace balance: ${totalOpen} open, ${totalClose} close, diff=${diff}`);

if (diff > 0) {
  // Add missing closing braces
  for (let i = 0; i < diff; i++) {
    lines.push('}');
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`✓ Added ${diff} missing closing braces (diff=${diff})`);
} else if (diff < 0) {
  console.log(`⚠ Too many closing braces by ${Math.abs(diff)}`);
}
