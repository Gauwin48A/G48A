const fs = require("fs");
const buf = fs.readFileSync("emu-screenshots/analysis/screen2.raw");
const w = 1080, h = 2400;
function lum(x, y) {
  const i = ((y * w + x) * 4);
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
function rgb(x, y) {
  const i = ((y * w + x) * 4);
  return [buf[i], buf[i + 1], buf[i + 2]];
}
// Fine render: bar region y 2230-2380, 90 cols x 30 rows
const chars = " .:-=+*#%@";
console.log("=== LIVE BOTTOM BAR (y2230-2380) ===");
const y0 = 2230, y1 = 2380, cols = 90, rows = 30;
for (let r = 0; r < rows; r++) {
  let row = "";
  const sy = y0 + ((y1 - y0) * r) / rows;
  for (let c = 0; c < cols; c++) {
    const sx = (w * c) / cols;
    const l = lum(Math.floor(sx), Math.floor(sy));
    row += chars[Math.min(9, Math.floor(l * 10 / 256))];
  }
  console.log(row);
}
// Detect the bar surface color at several x positions
console.log("=== SURFACE COLOR SAMPLES ===");
for (const x of [30, 150, 270, 450, 630, 810, 990, 1050]) {
  console.log("x=" + x, "y=2280:", rgb(x, 2280).join(","), " y=2320:", rgb(x, 2320).join(","));
}
