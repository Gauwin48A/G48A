const fs = require("fs");
const buf = fs.readFileSync("emu-screenshots/analysis/screen2.raw");
const w = 1080, h = 2400;
function lum(x, y) {
  const i = ((y * w + x) * 4);
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
// For a given y, find bright runs (icons are small bright glyphs on dark bar)
function runs(y, threshold) {
  const out = [];
  let inRun = false, start = 0;
  for (let x = 0; x < w; x++) {
    const b = lum(x, y) > threshold;
    if (b && !inRun) { inRun = true; start = x; }
    if (!b && inRun) { if (x - start >= 4) out.push({ s: start, e: x, c: Math.round((start + x) / 2) }); inRun = false; }
  }
  if (inRun && w - start >= 4) out.push({ s: start, e: w, c: Math.round((start + w) / 2) });
  return out;
}
// Icon row: average over y 2248-2270 (icons above labels). Label row: 2305-2337.
function avgRuns(y0, y1, threshold) {
  const colLum = [];
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = y0; y <= y1; y++) s += lum(x, y);
    colLum.push(s / (y1 - y0 + 1));
  }
  const out = [];
  let inRun = false, start = 0;
  for (let x = 0; x < w; x++) {
    const b = colLum[x] > threshold;
    if (b && !inRun) { inRun = true; start = x; }
    if (!b && inRun) { if (x - start >= 4) out.push({ s: start, e: x, c: Math.round((start + x) / 2), w: x - start }); inRun = false; }
  }
  if (inRun && w - start >= 4) out.push({ s: start, e: w, c: Math.round((start + w) / 2), w: w - start });
  return out;
}
console.log("ICON band avg y2248-2270, thr 110:");
console.log(JSON.stringify(avgRuns(2248, 2270, 110)));
console.log("LABEL band avg y2308-2335, thr 80:");
console.log(JSON.stringify(avgRuns(2308, 2335, 80)));
// Bar surface boundary: scan column 40 for background->surface transition
console.log("BAR top boundary at x=40:");
for (let y = 2200; y < 2280; y += 4) {
  const c = [buf[((y * w + 40) * 4)], buf[((y * w + 40) * 4) + 1], buf[((y * w + 40) * 4) + 2]];
  console.log("y=" + y, c.join(","));
}
