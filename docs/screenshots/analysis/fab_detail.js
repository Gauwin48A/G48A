const fs = require("fs");
const buf = fs.readFileSync("emu-screenshots/analysis/screen2.raw");
const w = 1080, h = 2400;
function rgb(x, y) {
  const i = ((y * w + x) * 4);
  return [buf[i], buf[i + 1], buf[i + 2]];
}
// Render a color-classified grid over the FAB region (x 380-530, y 2235-2350)
function classify(c) {
  const [r, g, b] = c;
  // indigo/primary = 185,204,255-ish (selected/FAB)
  if (r > 150 && g > 170 && b > 220) return "I"; // indigo
  // light text = onSurfaceVariant bright
  if (r > 150 && g > 150 && b > 150) return "L"; // light
  // mid blue-grey
  if (r > 100 && g > 110 && b > 150) return "M"; // mid
  // dark surface = 22,29,45 / 22,28,38
  return "."; // dark
}
console.log("=== FAB GRID (x380-530 step 15, y2235-2350 step 10) ===");
for (let y = 2235; y < 2350; y += 10) {
  let row = "";
  for (let x = 380; x < 530; x += 15) row += classify(rgb(x, y));
  console.log("y=" + y, row);
}
console.log("=== MORE ICON GRID (x935-1040 step 8, y2240-2300 step 8) ===");
for (let y = 2240; y < 2300; y += 8) {
  let row = "";
  for (let x = 935; x < 1040; x += 8) row += classify(rgb(x, y));
  console.log("y=" + y, row);
}
console.log("=== HOME ICON GRID (x60-130 step 6, y2240-2300 step 8) ===");
for (let y = 2240; y < 2300; y += 8) {
  let row = "";
  for (let x = 60; x < 130; x += 6) row += classify(rgb(x, y));
  console.log("y=" + y, row);
}
