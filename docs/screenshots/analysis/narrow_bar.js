const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const w = 720, h = 1600;
function lum(x, y) {
  const i = (y * w + x) * 4;
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
function px(x, y) {
  const i = (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
const chars = ' .:-=+*#%@';
// Bottom region y1450-1600 -> 72 cols x 40 rows
const y0 = 1450, y1 = 1600, cols = 72, rows = 40;
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
console.log('=== vertical profile x=360 (screen center) ===');
for (let y = 1460; y < 1600; y += 10) {
  const c = px(360, y);
  console.log('  y=' + y + ' rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
}
