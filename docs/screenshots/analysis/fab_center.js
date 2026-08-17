const fs = require('fs');
const file = process.argv[2] || 'emu-screenshots/analysis/catnav2.raw';
const buf = fs.readFileSync(file);
const w = 1080, h = 2400;
function lum(x, y) {
  const i = (y * w + x) * 4;
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
// FAB is the indigo circle near center. Scan for its color signature (185,204,255-ish tinted bright)
function findFab() {
  // Sample icon row band y=2210-2260 for the bright indigo blob
  let xs = [];
  for (let x = 300; x < 700; x++) {
    let hits = 0;
    for (let y = 2200; y < 2270; y++) {
      const i = (y * w + x) * 4;
      const r = buf[i], g = buf[i + 1], bl = buf[i + 2];
      if (r > 150 && g > 150 && bl > 200) hits++;
    }
    if (hits > 5) xs.push(x);
  }
  if (xs.length) {
    console.log('FAB blob x range: [' + xs[0] + '-' + xs[xs.length - 1] + '] center=' + Math.round((xs[0] + xs[xs.length - 1]) / 2));
  } else {
    console.log('FAB blob not found (maybe unselected/tint differs)');
  }
  console.log('Screen center x = ' + Math.round(w / 2));
  // Also print the FAB color at its center if found
  const cx = Math.round((xs[0] + xs[xs.length - 1]) / 2);
  if (xs.length) {
    for (let y = 2200; y < 2280; y += 10) {
      const i = (y * w + cx) * 4;
      console.log('  FAB at x=' + cx + ' y=' + y + ' rgb(' + buf[i] + ',' + buf[i + 1] + ',' + buf[i + 2] + ')');
    }
  }
}
findFab();

// Compare with each nav item label center
console.log('\nNav slots (expected evenly-spaced 6 slots of 180px):');
for (let s = 0; s < 6; s++) {
  const center = 90 + s * 180;
  console.log('  slot ' + s + ' center=' + center + ' (offset from screen center: ' + (center - 540) + ')');
}
