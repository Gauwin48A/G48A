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
console.error('detected', w, 'x', h);
function px(x, y) {
  const i = off + (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
// Item slot centers (6 slots): 90,270,450,630,810,990
const slots = [90, 270, 450, 630, 810, 990];
const names = ['Home', 'All Posts', 'Sell FAB', 'Feed', 'Rewards', 'More'];
console.log('Icon row (y=2235) and label row (y=2285) colors per slot:');
for (let s = 0; s < slots.length; s++) {
  const cx = slots[s];
  const icon = px(cx, 2235);
  const label = px(cx, 2285);
  const bar = px(cx, 2320);
  console.log('  ' + names[s] + ' icon=rgb(' + icon.join(',') + ') label=rgb(' + label.join(',') + ') bar=rgb(' + bar.join(',') + ')');
}
// Find min/max luminance across label row for contrast assessment
function lum(c) { return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; }
console.log('\nBar top edge (x=540):');
for (let y = h - 175; y < h - 140; y += 4) {
  console.log('  y=' + y + ' rgb(' + px(540, y).join(',') + ')');
}
