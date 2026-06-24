import fs from 'fs';
const c = fs.readFileSync('client/src/pages/AllPosts.jsx', 'utf-8');

// Find all occurrences of 'posted-today'
let pos = -1;
const positions = [];
while ((pos = c.indexOf('posted-today', pos + 1)) !== -1) {
  positions.push(pos);
}
console.log('posted-today occurrences at:', positions);

// For each occurrence beyond the first, show context
for (let i = 1; i < positions.length; i++) {
  const p = positions[i];
  const start = Math.max(0, p - 400);
  const end = Math.min(c.length, p + 400);
  console.log(`\n=== Occurrence ${i + 1} at ${p} ===`);
  console.log(c.substring(start, end));
}

// Also search for quickFilterChips in render section
console.log('\n=== Searching for quickFilter chips render ===');
const chipRenders = [];
let chipPos = -1;
while ((chipPos = c.indexOf('quickFilterChips', chipPos + 1)) !== -1) {
  chipRenders.push(chipPos);
}
console.log('quickFilterChips references:', chipRenders);

for (const p of chipRenders) {
  const start = Math.max(0, p - 50);
  const end = Math.min(c.length, p + 200);
  console.log(`\n--- At ${p}:`);
  console.log(c.substring(start, end));
}
