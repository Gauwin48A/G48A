const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);
// Find dimensions: try common resolutions whose w*h*4 equals file length
const bytes = buf.length;
let w = 0, h = 0;
const candidates = [[640, 1280], [720, 1600], [1080, 2400], [1080, 2340], [720, 1280], [360, 800]];
for (const [cw, ch] of candidates) {
  if (cw * ch * 4 === bytes) { w = cw; h = ch; break; }
}
if (!w) {
  // fallback: 16:9 based on byte length /4 = w*h
  const total = bytes / 4;
  w = Math.round(Math.sqrt(total * 9 / 16));
  h = Math.round(total / w);
}
console.error('detected', w, 'x', h, 'bytes', bytes);
function lum(x, y) {
  const i = (y * w + x) * 4;
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
function px(x, y) {
  const i = (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
const chars = ' .:-=+*#%@';
// Bottom region: last 170px -> 72 cols x 34 rows
const y1 = h;
const y0 = h - 170;
const cols = 72, rows = 34;
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
console.log('=== vertical profile x=' + Math.round(w / 2) + ' (screen center) ===');
for (let y = h - 150; y < h; y += 8) {
  const c = px(Math.round(w / 2), y);
  console.log('  y=' + y + ' rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
}
