/**
 * Fix the corrupted createDemoUser function
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'app/src/main/java/com/mhub/app/ui/profile/ProfileScreen.kt');
let content = fs.readFileSync(filePath, 'utf8');
const CR = '\n'; // Use \n since file has LF endings now

// Find and replace the corrupted function
const oldFunc = `    private fun createDemoUser(): User {        return User(            id = \"demo_user\",            userId = \"demo_user\",            fullName = \"Demo User\",            phone = \"+91-9876543210\",            email = \"demo@mhub.app\",            bio = \"This is a demo account for preview purposes.\",            username = \"demo_user\",            currentPlan = \"premium\",            kycStatus = null,            role = \"seller\",            pictureUrl = null,            coverImage = null,            rewardsRank = \"DEMO\",            isVerified = true,        )    }`;

const newFunc = `    private fun createDemoUser(): User {
        return User(
            id = "demo_user",
            userId = "demo_user",
            fullName = "Demo User",
            phone = "+91-9876543210",
            email = "demo@mhub.app",
            bio = "This is a demo account for preview purposes.",
            username = "demo_user",
            currentPlan = "premium",
            kycStatus = null,
            role = "seller",
            pictureUrl = null,
            coverImage = null,
            rewardsRank = "DEMO",
            isVerified = true,
        )
    }`;

if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Fixed corrupted createDemoUser function');
} else {
  console.log('✗ Could not find corrupted function pattern');
  // Let's try line-based approach
  const lines = content.split(/\r?\n/);
  const startIdx = lines.findIndex(l => l.includes('private fun createDemoUser'));
  if (startIdx >= 0) {
    // Find end of function (closing })
    let endIdx = startIdx;
    let braceCount = 0;
    for (let i = startIdx; i < lines.length && i < startIdx + 30; i++) {
      braceCount += (lines[i].match(/{/g) || []).length;
      braceCount -= (lines[i].match(/}/g) || []).length;
      if (braceCount <= 0 && i > startIdx) {
        endIdx = i;
        break;
      }
    }
    console.log(`Found function at lines ${startIdx+1}-${endIdx+1}`);
    const replacement = [
      '    private fun createDemoUser(): User {',
      '        return User(',
      '            id = "demo_user",',
      '            userId = "demo_user",',
      '            fullName = "Demo User",',
      '            phone = "+91-9876543210",',
      '            email = "demo@mhub.app",',
      '            bio = "This is a demo account for preview purposes.",',
      '            username = "demo_user",',
      '            currentPlan = "premium",',
      '            kycStatus = null,',
      '            role = "seller",',
      '            pictureUrl = null,',
      '            coverImage = null,',
      '            rewardsRank = "DEMO",',
      '            isVerified = true,',
      '        )',
      '    }',
    ];
    lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('✓ Fixed via line-based approach');
  } else {
    console.log('✗ Could not find createDemoUser function at all');
  }
}
