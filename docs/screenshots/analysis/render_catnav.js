// Render bottom band of a raw RGBA screencap (16-byte header + RGBA pixels)
const fs = require("fs");
const file = process.argv[2];
const y0 = parseInt(process.argv[3] || "2150", 10);
const y1 = parseInt(process.argv[4] || "2400", 10);
const cols = parseInt(process.argv[5] || "108", 10);
const buf = fs.readFileSync(file);
const w = 1080, h = 2400;
const HDR = 16;
function px(x, y) {
  const i = HDR + ((y * w + x) * 4);
  return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]];
}
function lum(x, y) {
  const [r, g, b] = px(x, y);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
const chars = " .:-=+*#%@";
const rows = Math.max(8, Math.floor((y1 - y0) / 12));
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
