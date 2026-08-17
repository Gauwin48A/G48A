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
if (!w) { console.error('unknown dims bytes=' + bytes); process.exit(1); }
console.error('detected', w, 'x', h, 'off', off);
function lum(x, y) {
  const i = off + (y * w + x) * 4;
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
function px(x, y) {
  const i = off + (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
const chars = ' .:-=+*#%@';
const y0 = h - 190, y1 = h, cols = 72, rows = 36;
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
console.log('=== surface + bar color profile (x=40, edge) ===');
for (let y = h - 160; y < h; y += 8) {
  const c = px(40, y);
  console.log('  y=' + y + ' rgb(' + c.join(',') + ')');
}
console.log('=== FAB center region (icon row) ===');
const fabY = h - 130;
let minX = 9999, maxX = -1;
for (let x = Math.round(w * 0.3); x < Math.round(w * 0.7); x++) {
  const c = px(x, fabY);
  const r = c[0], g = c[1], b = c[2];
  if (b > 180 && b > r + 40 && g > r + 20) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
}
if (maxX > 0) {
  console.log('FAB blob x[' + minX + '-' + maxX + '] center=' + Math.round((minX + maxX) / 2) + ', screen center=' + Math.round(w / 2));
} else {
  console.log('FAB blob not found at y=' + fabY);
}
