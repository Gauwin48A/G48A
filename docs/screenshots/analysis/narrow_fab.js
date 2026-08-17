const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);
// screencap raw is w*h*4, sometimes with a tiny header; detect via candidates
const bytes = buf.length;
let w = 0, h = 0, off = 0;
const candidates = [[640, 1280], [720, 1600], [1080, 2400], [1080, 2340]];
for (const [cw, ch] of candidates) {
  if (cw * ch * 4 === bytes) { w = cw; h = ch; off = 0; break; }
  if (cw * ch * 4 === bytes - 16) { w = cw; h = ch; off = 16; break; }
}
if (!w) { console.error('unknown dims, bytes=' + bytes); process.exit(1); }
console.error('detected', w, 'x', h, 'offset', off);
function px(x, y) {
  const i = off + (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
function isFabPixel(c) {
  return c[2] > 150 && c[2] > c[0] + 60 && c[1] > c[0] + 20;
}
let minX = 9999, maxX = -1, minY = 9999, maxY = -1, count = 0;
for (let y = h - 190; y < h - 60; y++) {
  for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x++) {
    if (isFabPixel(px(x, y))) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      count++;
    }
  }
}
if (count) {
  const cx = Math.round((minX + maxX) / 2);
  console.log('FAB circle: x[' + minX + '-' + maxX + '] y[' + minY + '-' + maxY + ']');
  console.log('FAB center x = ' + cx + ', screen center = ' + Math.round(w / 2) + ', offset = ' + (cx - Math.round(w / 2)) + 'px');
} else {
  console.log('FAB not found');
}
