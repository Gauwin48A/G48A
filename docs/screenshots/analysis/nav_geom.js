// Measure bottom nav on each captured screen: FAB center, label row y, bar top edge.
const fs = require("fs");
const w = 1080, h = 2400, HDR = 16;
function px(b, x, y) {
  const i = HDR + ((y * w + x) * 4);
  return [b[i], b[i + 1], b[i + 2]];
}
function lum(b, x, y) {
  const [r, g, bl] = px(b, x, y);
  return (r * 299 + g * 587 + bl * 114) / 1000;
}
function measure(file) {
  const b = fs.readFileSync(file);
  // 1. FAB center: indigo (185,204,255) in dark theme — find centroid of matches in the FAB band
  let sx = 0, sy = 0, n = 0;
  for (let y = 2200; y < 2360; y++) {
    for (let x = 400; x < 700; x++) {
      const [r, g, bl] = px(b, x, y);
      if (bl > 200 && g > 150 && r > 100 && r < bl) { sx += x; sy += y; n++; }
    }
  }
  const fab = n > 0 ? { cx: Math.round(sx / n), cy: Math.round(sy / n), n } : null;
  // 2. Label row: find rows with bright (text) pixels between y 2240-2320
  let labelRow = null;
  for (let y = 2220; y < 2340; y++) {
    let bright = 0;
    for (let x = 40; x < w - 40; x += 4) if (lum(b, x, y) > 120) bright++;
    if (bright > 10 && labelRow === null) labelRow = y;
  }
  // 3. Bar top edge: scan up from bottom for first row where NOT surface-ish color at x=60.
  //    Surface (22,29,45) vs content bg (22,28,38) — both dark; instead detect the horizontal
  //    shadow line or the start of the dense bright label row.
  return { fab, labelRow };
}
const files = ["allposts", "for_you", "feed", "rewards", "drawer"];
for (const f of files) {
  try { console.log(f, JSON.stringify(measure(f + ".raw"))); } catch (e) { console.log(f, "ERR", e.message); }
}
