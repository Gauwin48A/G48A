const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(
  'android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt',
  'utf8'
);

// Extract imports (lines 0-68 approximately)
const lines = content.split('\n');
const importEndIdx = lines.findIndex((l, i) => i > 0 && l.includes('// Shared helpers'));
const header = lines.slice(0, importEndIdx).join('\n');

const PKG = 'package com.mhub.app.ui.commerce';

// Shared helpers that need to remain accessible
const commonHelpers = lines.slice(importEndIdx, 76).join('\n'); // ScreenTopBar, PostListItem, StatusChip, EmptyState
const textFieldHelpers = lines.slice(598, 665).join('\n'); // MhubTextFieldWithCounter, MhubTextField

// Definition map: name -> { startLine, endLine }
const sections = [
  // Simple screens first (bottom of file)
  { name: 'PaymentScreen.kt',     start: 4206, end: 4386 },
  { name: 'SaleUndoneScreen.kt',  start: 3909, end: 4205 },
  { name: 'SaleDoneScreen.kt',    start: 3297, end: 3908 },
  { name: 'BuyerViewScreen.kt',   start: 3121, end: 3296 },
  { name: 'CompareScreen.kt',     start: 2944, end: 3120 },
  { name: 'SavedSearchesScreen.kt', start: 2755, end: 2943 },
  { name: 'RecentlyViewedScreen.kt', start: 2469, end: 2754 },
  { name: 'CartScreen.kt',        start: 2029, end: 2468 },
  { name: 'OffersScreen.kt',      start: 1809, end: 2028 },
  { name: 'BoughtScreen.kt',      start: 1725, end: 1808 },
  { name: 'SoldPostsScreen.kt',   start: 1632, end: 1724 },
  { name: 'MyPostsScreen.kt',     start: 1324, end: 1587 },
  { name: 'TierSelectionScreen.kt', start: 665, end: 1272 },
  { name: 'EditPostScreen.kt',    start: 276, end: 597 },
  { name: 'PostWelcomeScreen.kt', start: 173, end: 275 },
];

const targetDir = 'android-native/app/src/main/java/com/mhub/app/ui/commerce';

// Create each file with proper package + imports + content
sections.forEach(({ name, start, end }) => {
  const zeroBasedStart = start;
  const zeroBasedEnd = Math.min(end, lines.length - 1);
  const sectionLines = lines.slice(zeroBasedStart, zeroBasedEnd + 1);
  const body = sectionLines.join('\n');

  const fileContent = `${PKG}\n\n${body}\n`;
  fs.writeFileSync(path.join(targetDir, name), fileContent, 'utf8');
  console.log(`Created ${name} (lines ${zeroBasedStart}-${zeroBasedEnd})`);
});

// Create CommerceCommon.kt with shared helpers
const commonContent = `${PKG}

${commonHelpers}
${textFieldHelpers}
`;
fs.writeFileSync(path.join(targetDir, 'CommerceCommon.kt'), commonContent, 'utf8');
console.log('Created CommerceCommon.kt');

// Preserve CompareItemHolder + mock data in a separate file
const mockStart = 1273; // CompareItemHolder start
const mockEnd = 1323; // end of MOCK_COMPARE_POSTS
const mockLines = lines.slice(mockStart, mockEnd + 1);
const mockContent = `${PKG}

${mockLines.join('\n')}
`;
fs.writeFileSync(path.join(targetDir, 'CommerceData.kt'), mockContent, 'utf8');
console.log('Created CommerceData.kt');

console.log('\nDone! Created', sections.length + 2, 'files.');
