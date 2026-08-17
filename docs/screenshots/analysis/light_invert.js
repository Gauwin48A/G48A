const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const bytes = buf.length;
let w = 0, h = 0, off = 0;
const candidates = [[1080, 2400], [1080, 2340], [720, 1600], [640, 1280]];
for (const [cw, ch] of candidates) {
  if (cw * ch * 4 === bytes) { w = cw; h = ch; off = 0; break; }
  if (cw * ch * 4 === bytes - 16) { w = cw; h = ch; off = 16; break; }
}
if (!w) { console.error('unknown dims'); process.exit(1); }
function lum(x, y) {
  const i = off + (y * w + x) * 4;
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
const chars = '  .:-=+*#%@'; // bright -> space, dark -> @
const y0 = h - 190, y1 = h, cols = 72, rows = 36;
for (let r = 0; r < rows; r++) {
  let row = '';
  const sy = y0 + ((y1 - y0) * r) / rows + (y1 - y0) / (2 * rows);
  for (let c = 0; c < cols; c++) {
    const sx = (w * c) / cols + w / (2 * cols);
    const l = lum(Math.round(sx), Math.round(sy));
    // dark pixel -> dense char
    row += chars[Math.min(10, Math.floor((255 - l) * 10 / 256))];
  }
  console.log(row);
}
