const fs = require("fs");
const buf = fs.readFileSync("emu-screenshots/analysis/screen2.raw");
const w = 1080, h = 2400;
function rgb(x, y) {
  const i = ((y * w + x) * 4);
  return [buf[i], buf[i + 1], buf[i + 2]];
}
console.log("=== VERTICAL SCAN at x=450 (FAB column), y 2200-2390 ===");
for (let y = 2200; y < 2390; y += 8) {
  console.log("y=" + y, rgb(450, y).join(","));
}
console.log("=== VERTICAL SCAN at x=90 (Home column) ===");
for (let y = 2200; y < 2390; y += 12) {
  console.log("y=" + y, rgb(90, y).join(","));
}
console.log("=== HORIZONTAL SCAN at y=2245 (bar top edge) ===");
let prev = null;
for (let x = 0; x < w; x += 20) {
  const c = rgb(x, 2245).join(",");
  if (c !== prev) { console.log("x=" + x, c); prev = c; }
}
console.log("=== HORIZONTAL SCAN at y=2360 (bar bottom / gesture area) ===");
prev = null;
for (let x = 0; x < w; x += 20) {
  const c = rgb(x, 2360).join(",");
  if (c !== prev) { console.log("x=" + x, c); prev = c; }
}
