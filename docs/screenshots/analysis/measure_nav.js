const fs = require("fs");
const buf = fs.readFileSync("emu-screenshots/analysis/screen2.raw");
const w = 1080, h = 2400;
function lum(x, y) {
  const i = ((y * w + x) * 4);
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
// Find bright clusters on a given row band (avg over a few rows)
function clusters(y0, y1, threshold) {
  const colBright = [];
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = y0; y < y1; y++) s += lum(x, y);
    colBright.push(s / (y1 - y0));
  }
  const runs = [];
  let inRun = false, start = 0;
  for (let x = 0; x < w; x++) {
    const b = colBright[x] > threshold;
    if (b && !inRun) { inRun = true; start = x; }
    if (!b && inRun) {
      if (x - start >= 6) runs.push({ start, end: x, center: (start + x) / 2, width: x - start });
      inRun = false;
    }
  }
  if (inRun && w - start >= 6) runs.push({ start, end: w, center: (start + w) / 2, width: w - start });
  return runs;
}
// Icon row band: y 2245-2285 (icons sit above labels). Label band: y 2305-2340.
console.log("ICON clusters (y2245-2295):");
console.log(JSON.stringify(clusters(2245, 2295, 100)));
console.log("LABEL clusters (y2305-2340):");
console.log(JSON.stringify(clusters(2305, 2340, 90)));
// Expected slot centers for 6 equal slots: 90,270,450,630,810,990
console.log("Expected slot centers: 90,270,450,630,810,990");
