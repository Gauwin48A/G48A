import fs from 'fs';
let c = fs.readFileSync('client/src/pages/AllPosts.jsx', 'utf-8');

// The problem: there's a stray `,` on its own line between the props closing 
// and the CategoryBar component. Remove it.
// Pattern:         },\n        ,\n        React.createElement(AllPostsCategoryBar
const oldStr = '        },\n        ,\n        React.createElement(AllPostsCategoryBar';
const newStr = '        },\n        React.createElement(AllPostsCategoryBar';

if (c.includes(oldStr)) {
  c = c.replace(oldStr, newStr);
  fs.writeFileSync('client/src/pages/AllPosts.jsx', c, 'utf-8');
  console.log('Fixed: removed stray comma');
} else {
  console.log('Pattern not found - checking exact bytes...');
  // Try to find just the , on its own line
  const idx = c.indexOf('        ,\n        React.createElement(AllPostsCategoryBar');
  if (idx >= 0) {
    console.log('Found lonely comma at', idx);
    // Read before to see context
    console.log('Before:', JSON.stringify(c.substring(idx - 20, idx)));
    console.log('After:', JSON.stringify(c.substring(idx, idx + 60)));
    
    // Remove it
    c = c.substring(0, idx) + c.substring(idx + 9); // remove '        ,\n'
    fs.writeFileSync('client/src/pages/AllPosts.jsx', c, 'utf-8');
    console.log('Fixed via direct removal');
  } else {
    console.log('Even the simpler pattern was not found');
    // Try without the newline character
    const lines = c.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === ',' && i > 0 && lines[i-1].includes('},')) {
        // This might be our target - verify context
        if (i + 1 < lines.length && lines[i+1].includes('React.createElement(AllPostsCategoryBar')) {
          console.log(`Found stray comma at line ${i+1}`);
          lines.splice(i, 1);
          c = lines.join('\n');
          fs.writeFileSync('client/src/pages/AllPosts.jsx', c, 'utf-8');
          found = true;
          console.log('Fixed by deleting line');
          break;
        }
      }
    }
    if (!found) console.log('Could not fix automatically');
  }
}

// Also check for any OTHER syntax issues from our star rating insertion
const starIdx = c.indexOf('text-amber-400');
if (starIdx >= 0) {
  console.log('Star ratings present - checking syntax around them...');
  const context = c.substring(Math.max(0, starIdx - 200), Math.min(c.length, starIdx + 400));
  console.log(context);
}
