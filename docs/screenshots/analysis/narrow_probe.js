const fs = require('fs');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const bytes = buf.length;
let w = 0, h = 0, off = 0;
const candidates = [[640, 1280], [720, 1600], [1080, 2400], [1080, 2340]];
for (const [cw, ch] of candidates) {
  if (cw * ch * 4 === bytes) { w = cw; h = ch; off = 0; break; }
  if (cw * ch * 4 === bytes - 16) { w = cw; h = ch; off = 16; break; }
}
console.error('detected', w, 'x', h, 'offset', off);
function px(x, y) {
  const i = off + (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
const cx = Math.round(w / 2);
console.log('screen width', w, 'center', cx);
// Probe the FAB area (center ± 120px) across the bottom bar
for (let x = cx - 120; x <= cx + 120; x += 20) {
  const c = px(x, h - 120);
  console.log('  x=' + x + ' y=' + (h - 120) + ' rgb(' + c.join(',') + ')');
}
// Find any bright/indigo pixels in the bar
let found = 0;
for (let y = h - 180; y < h - 40; y += 4) {
  for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x += 2) {
    const c = px(x, y);
    if (c[2] > 150 && c[2] > c[0] + 40 && c[0] < 150) {
      if (found < 12) console.log('  indigo at x=' + x + ' y=' + y + ' rgb(' + c.join(',') + ')');
      found++;
    }
  }
}
console.log('total indigo-ish px:', found);
