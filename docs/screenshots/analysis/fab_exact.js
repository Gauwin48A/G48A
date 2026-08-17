const fs = require('fs');
const file = process.argv[2] || 'emu-screenshots/analysis/catnav2.raw';
const buf = fs.readFileSync(file);
const w = 1080, h = 2400;
function px(x, y) {
  const i = (y * w + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
// FAB is a circle with containerColor = primary (indigo). On dark theme primary is likely
// a bright indigo (185,204,255) OR a medium indigo. Find the circle by scanning for its
// distinctive tint within y 2200-2300, x 350-550.
function isFabPixel(c) {
  // Primary color in dark theme — indigo/violet family: blue significantly > red, medium-high blue
  return c[2] > 150 && c[2] > c[0] + 60 && c[1] > c[0] + 20;
}
let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
let count = 0;
for (let y = 2150; y < 2350; y++) {
  for (let x = 300; x < 700; x++) {
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
  console.log('FAB circle detected: x[' + minX + '-' + maxX + '] y[' + minY + '-' + maxY + ']');
  console.log('  FAB center = (' + Math.round((minX + maxX) / 2) + ', ' + Math.round((minY + maxY) / 2) + ')');
  console.log('  Screen center = (540, ...)  →  FAB x-offset from screen center: ' + (Math.round((minX + maxX) / 2) - 540));
} else {
  console.log('No FAB circle found with that tint. Sampling bar center pixels:');
  for (let x = 380; x < 540; x += 20) {
    console.log('  x=' + x + ' y=2230: ' + px(x, 2230).join(',') + '  y=2250: ' + px(x, 2250).join(','));
  }
}
