const fs = require('fs');
const path = require('path');

const appFile = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');
const regex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
let match;
const imports = [];

while ((match = regex.exec(appFile)) !== null) {
  imports.push(match[1]);
}

console.log(`🔍 Checking all ${imports.length} page routes in App.jsx...\n`);
let missingCount = 0;
let emptyCount = 0;

imports.forEach(imp => {
  const fullPath = path.resolve(__dirname, '../src', imp);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ MISSING FILE: ${imp}`);
    missingCount++;
  } else {
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      console.log(`⚠️ EMPTY FILE: ${imp}`);
      emptyCount++;
    } else {
      console.log(`  ✅ Verified (${stat.size} bytes): ${imp}`);
    }
  }
});

console.log("\n----------------------------------------");
if (missingCount === 0 && emptyCount === 0) {
  console.log(`🎉 100% COMPLETE! ALL ${imports.length} PAGE COMPONENTS EXIST & ARE NON-EMPTY!`);
} else {
  console.log(`❌ FOUND ISSUES: ${missingCount} missing, ${emptyCount} empty.`);
}
