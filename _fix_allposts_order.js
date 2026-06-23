const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'client/src/pages/AllPosts.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the CategoryBar block
// It starts with: "        React.createElement(AllPostsCategoryBar, {"
// It ends with:   "        }),"
const catBarStartMarker = '        React.createElement(AllPostsCategoryBar, {';
const catBarStartIdx = content.indexOf(catBarStartMarker);
if (catBarStartIdx === -1) {
  console.error('Could not find AllPostsCategoryBar start marker');
  process.exit(1);
}

// Find the end of CategoryBar block - look for "        })," after the start
const catBarEndSearchStart = catBarStartIdx + catBarStartMarker.length;
const catBarEndIdx = content.indexOf('        }),\n', catBarEndSearchStart);
if (catBarEndIdx === -1) {
  console.error('Could not find AllPostsCategoryBar end marker');
  process.exit(1);
}
const catBarEndIdxEnd = catBarEndIdx + '        }),\n'.length;

const catBarBlock = content.substring(catBarStartIdx, catBarEndIdxEnd);
console.log(`CategoryBar block: ${catBarStartIdx} -> ${catBarEndIdxEnd} (${catBarBlock.length} chars)`);

// Find the QuickFilters block
// It starts after the CategoryBar block: "        C && React.createElement("
const qfStartMarker = '        C && React.createElement(';
const qfStartIdx = content.indexOf(qfStartMarker, catBarEndIdxEnd);
if (qfStartIdx === -1) {
  console.error('Could not find QuickFilters start marker after CategoryBar');
  process.exit(1);
}

// Now we need to find where the QuickFilters block ends.
// We need to count parentheses: starting at qfStartIdx.
// The structure is: C && React.createElement("div", { ... }, React.createElement(AllPostsQuickFilters, { ... }))
// We need to find the closing ).

let depth = 0;
let inString = false;
let stringChar = null;
let escapeNext = false;

// Skip the "C && " prefix to start counting from React.createElement(
for (let i = qfStartIdx; i < content.length; i++) {
  const ch = content[i];
  
  if (escapeNext) {
    escapeNext = false;
    continue;
  }
  
  if (inString) {
    if (ch === '\\') {
      escapeNext = true;
    } else if (ch === stringChar) {
      inString = false;
    }
    continue;
  }
  
  if (ch === '"' || ch === "'" || ch === '`') {
    inString = true;
    stringChar = ch;
    continue;
  }
  
  if (ch === '(') {
    if (i >= qfStartIdx && i < qfStartIdx + '        C && '.length) {
      // This is the start of React.createElement( - the first (
      // Actually, just count from here
    }
    depth++;
  } else if (ch === ')') {
    depth--;
    if (depth === 0) {
      // Found the closing parenthesis of the QuickFilters block
      const qfEndIdxEnd = i + 1;
      const qfBlock = content.substring(qfStartIdx, qfEndIdxEnd);
      console.log(`QuickFilters block: ${qfStartIdx} -> ${qfEndIdxEnd} (${qfBlock.length} chars)`);
      
      // Now swap: remove both blocks and insert them in reverse order
      // But we also need to handle the comma between them
      
      // The structure is:
      //   [CategoryBar]),
      //   C && React.createElement(...QuickFilters...) 
      // We want:
      //   C && React.createElement(...QuickFilters...),
      //   [CategoryBar])
      
      // First, combine the two blocks into swapped order
      const afterCategory = content.substring(catBarEndIdxEnd, qfStartIdx);
      console.log(`Content between blocks: "${afterCategory}" (${afterCategory.length} chars)`);
      
      // The new content: QuickFilters first, then CategoryBar
      const newBlocks = qfBlock + ',\n' + catBarBlock.replace('        }),', '        })');
      
      // Replace the old blocks (from CategoryBar start through QuickFilters end)
      const before = content.substring(0, catBarStartIdx);
      const after = content.substring(qfEndIdxEnd);
      
      const newContent = before + newBlocks + after;
      
      // Verify
      const catCountBefore = (content.match(/AllPostsCategoryBar/g) || []).length;
      const qfCountBefore = (content.match(/AllPostsQuickFilters/g) || []).length;
      const catCountAfter = (newContent.match(/AllPostsCategoryBar/g) || []).length;
      const qfCountAfter = (newContent.match(/AllPostsQuickFilters/g) || []).length;
      
      console.log(`\nBefore: CategoryBar refs: ${catCountBefore}, QuickFilters refs: ${qfCountBefore}`);
      console.log(`After: CategoryBar refs: ${catCountAfter}, QuickFilters refs: ${qfCountAfter}`);
      
      if (catCountBefore !== catCountAfter || qfCountBefore !== qfCountAfter) {
        console.error('ERROR: Component reference count mismatch!');
        process.exit(1);
      }
      
      // Write the file
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('\nSuccessfully swapped order: QuickFilters now renders BEFORE CategoryBar');
      
      // Also verify by searching for the new order
      const qfFirstIdx = newContent.indexOf(qfBlock);
      const catBarAfterIdx = newContent.indexOf(catBarBlock, qfFirstIdx + qfBlock.length);
      if (qfFirstIdx !== -1 && catBarAfterIdx !== -1 && qfFirstIdx < catBarAfterIdx) {
        console.log('Verified: QuickFilters appears BEFORE CategoryBar in the output ✓');
      } else {
        console.error('ERROR: Order verification failed!');
        process.exit(1);
      }
      
      process.exit(0);
    }
  }
}

console.error('Could not find closing parenthesis for QuickFilters block');
process.exit(1);
