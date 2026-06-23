const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'client/src/pages/AllPosts.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the Price ↓ sort button's closing pattern and insert Most Viewed after it
const priceDescMarker = 'tr("price_high", "Price \\u2193"),';
const idx = content.indexOf(priceDescMarker);
if (idx === -1) {
  console.error('Could not find Price ↓ sort button');
  process.exit(1);
}

// Find the closing of the Price ↓ button's createElement
// After tr(...), we need to find the closing ")," that belongs to this button
const afterPriceDesc = content.substring(idx + priceDescMarker.length);
const closeParenIdx = afterPriceDesc.indexOf(')');
if (closeParenIdx === -1) {
  console.error('Could not find closing paren for Price ↓ button');
  process.exit(1);
}

// The structure after tr() is: \n                  ),\n
// We need to insert the Most Viewed button before the \n                ),\n that comes after

// Let's find the exact pattern: after tr() line, there's \n                  ),\n                ),\n
// The first ), closes the button, the second ), closes the sort section wrapper
const buttonClose = afterPriceDesc.substring(0, closeParenIdx + 1);
console.log(`Button close pattern: "${buttonClose.replace(/\n/g, '\\n')}"`);

// After the button closing ), we need to find what follows
const restAfterClose = afterPriceDesc.substring(closeParenIdx + 1);

// Now find the wrapper close
const wrapperClose = restAfterClose.indexOf('\n                ),');
if (wrapperClose === -1) {
  console.error('Could not find sort section wrapper close');
  process.exit(1);
}

// The wrapper close is at restAfterClose[wrapperClose]
const wrapperCloseStr = restAfterClose.substring(wrapperClose, wrapperClose + 19);
console.log(`Wrapper close: "${wrapperCloseStr.replace(/\n/g, '\\n')}"`);

// Insert the Most Viewed button between the button close and the wrapper close
const buttonCloseLen = closeParenIdx + 1; // length of ")" marker + 1 for the )
const wrapperCloseFullLen = wrapperClose + 19;

const mostViewedBtn = `\n                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => b({ sortBy: "views_desc", latestWindow: "" }),
                    className: \`px-2.5 py-1 rounded-full transition \${t.sortBy === "views_desc" ? "bg-blue-600 text-white" : "hover:bg-[var(--surface-2)]"}\`,
                  },
                  tr("most_viewed", "Most Viewed"),
                ),`;

const newRest = restAfterClose.substring(0, wrapperClose) + mostViewedBtn + restAfterClose.substring(wrapperClose);
const newContent = content.substring(0, idx + priceDescMarker.length) + newRest;

// Verify
const mostViewedCount = (newContent.match(/most_viewed/g) || []).length;
console.log(`Most Viewed references in new content: ${mostViewedCount}`);

if (mostViewedCount !== 1) {
  console.error('ERROR: Expected exactly 1 reference to "most_viewed"');
  process.exit(1);
}

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully added Most Viewed sort button!');
process.exit(0);
