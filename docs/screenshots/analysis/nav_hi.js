const fs = require('fs');
const file = process.argv[2] || 'emu-screenshots/analysis/catapp.raw';
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
// Bottom nav region y2140-2400 -> 72 cols x 52 rows
const y0 = 2140, y1 = 2400, cols = 72, rows = 52;
for (let r = 0; r < rows; r++) {
  let row = '';
  const sy = y0 + ((y1 - y0) * r) / rows + (y1 - y0) / (2 * rows);
  for (let c = 0; c < cols; c++) {
    const sx = (w * c) / cols + w / (2 * cols);
    const l = lum(Math.round(sx), Math.round(sy));
    row += chars[Math.min(9, Math.floor((l * 10) / 256))];
  }
  console.log(row);
}
console.log('=== COLUMN PROFILES (icon row y=2245, label row y=2285) ===');
for (let x = 20; x < 1060; x += 60) {
  const c1 = px(x, 2245), c2 = px(x, 2285), c3 = px(x, 2320);
  console.log('x=' + x + ' icon:' + c1.join(',') + ' label:' + c2.join(',') + ' bar:' + c3.join(','));
}
