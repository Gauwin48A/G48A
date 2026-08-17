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

// Find horizontal extent of "content" (non-background) pixels on a scan line.
function findRuns(y, threshold, gap = 8) {
  const runs = [];
  let start = -1;
  for (let x = 0; x < w; x++) {
    const l = lum(x, y);
    if (l > threshold) {
      if (start < 0) start = x;
    } else {
      if (start >= 0 && x - start >= 4) runs.push([start, x]);
      start = -1;
    }
  }
  if (start >= 0 && w - start >= 4) runs.push([start, w]);
  return runs;
}

// Scan multiple rows around icon row and label row, merge runs that overlap across rows.
function stableRuns(yStart, yEnd, threshold, mergeGap = 40) {
  const all = [];
  for (let y = yStart; y <= yEnd; y += 3) {
    for (const [a, b] of findRuns(y, threshold)) all.push([a, b]);
  }
  all.sort((p, q) => p[0] - q[0]);
  const merged = [];
  for (const [a, b] of all) {
    if (merged.length && a - merged[merged.length - 1][1] < mergeGap) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
    } else {
      merged.push([a, b]);
    }
  }
  return merged.map(([a, b]) => ({ start: a, end: b, center: Math.round((a + b) / 2) }));
}

// Expected centers from the UI dump
const expected = [90, 270, 450, 630, 810, 990];
console.log('Icon row clusters (y 2235-2275):');
const icons = stableRuns(2235, 2275, 40);
icons.forEach((r, i) => console.log('  #' + i + ' [' + r.start + '-' + r.end + '] center=' + r.center));
console.log('Label row clusters (y 2280-2305):');
const labels = stableRuns(2280, 2305, 40);
labels.forEach((r, i) => console.log('  #' + i + ' [' + r.start + '-' + r.end + '] center=' + r.center));

// Surface color check at bar top vs bottom (seam detection)
console.log('\nBar vertical profile (x=540):');
for (let y = 2160; y < 2400; y += 10) {
  const c = px(540, y);
  console.log('  y=' + y + ' rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
}
