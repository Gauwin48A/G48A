// Final visual geometry check across flow screens
const fs = require("fs");
const w = 1080, h = 2400, HDR = 16;
function px(b, x, y) {
  const i = HDR + ((y * w + x) * 4);
  return [b[i], b[i + 1], b[i + 2]];
}
function analyze(file) {
  const b = fs.readFileSync(file);
  // FAB centroid (indigo) in main nav
  let sx = 0, sy = 0, n = 0;
  for (let y = 2200; y < 2360; y++)
    for (let x = 380; x < 700; x++) {
      const [r, g, bl] = px(b, x, y);
      if (bl > 200 && g > 150 && r > 100 && r < bl) { sx += x; sy += y; n++; }
    }
  const fab = n ? `FAB@(${Math.round(sx / n)},${Math.round(sy / n)})` : "no-FAB";
  // bottom surface color (nav should extend to bottom)
  const c = px(b, 30, h - 18);
  const bottom = `bottom=${c[0]},${c[1]},${c[2]}`;
  return { fab, bottom };
}
const files = ["f_allposts", "f_feed", "f_rewards", "f_drawer", "f_cat_home", "f_cat_subcats", "f_cat_cart", "f_cat_wishlist", "f_cat_profile"];
for (const f of files) {
  try { console.log(f.padEnd(16), JSON.stringify(analyze(f + ".raw"))); }
  catch (e) { console.log(f, "ERR", e.message); }
}
