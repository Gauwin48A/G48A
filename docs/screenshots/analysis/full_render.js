const fs = require('fs');
const file = process.argv[2] || 'emu-screenshots/analysis/launch_fresh.raw';
const buf = fs.readFileSync(file);
const w = 1080, h = 2400;
function lum(x, y) {
  const i = (y * w + x) * 4;
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
function px(x, y) {
  const i = (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
const chars = ' .:-=+*#%@';
// Whole screen: 1080x2400 -> 54 cols x 120 rows
const cols = 54, rows = 120;
for (let r = 0; r < rows; r++) {
  let row = '';
  const sy = (h * r) / rows + h / (2 * rows);
  for (let c = 0; c < cols; c++) {
    const sx = (w * c) / cols + w / (2 * cols);
    const l = lum(Math.round(sx), Math.round(sy));
    row += chars[Math.min(9, Math.floor((l * 10) / 256))];
  }
  console.log(row);
}
