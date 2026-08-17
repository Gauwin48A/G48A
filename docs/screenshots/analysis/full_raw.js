const fs = require("fs");
const buf = fs.readFileSync("emu-screenshots/analysis/screen2.raw");
const w = 1080, h = 2400;
function lum(x, y) {
  const i = ((y * w + x) * 4);
  return (buf[i] * 299 + buf[i + 1] * 587 + buf[i + 2] * 114) / 1000;
}
const chars = " .:-=+*#%@";
for (let band = 0; band < 6; band++) {
  console.log("--- band " + band + " y=" + Math.floor(h * band / 6) + "-" + Math.floor(h * (band + 1) / 6) + " ---");
  const y0 = Math.floor(h * band / 6), y1 = Math.floor(h * (band + 1) / 6);
  const cols = 90, rows = 12;
  for (let r = 0; r < rows; r++) {
    let row = "";
    const sy = y0 + ((y1 - y0) * r) / rows;
    for (let c = 0; c < cols; c++) {
      const sx = (w * c) / cols;
      const l = lum(Math.floor(sx), Math.floor(sy));
      row += chars[Math.min(9, Math.floor(l * 10 / 256))];
    }
    console.log(row);
  }
}
