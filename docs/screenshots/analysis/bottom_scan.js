const fs = require("fs");
const zlib = require("zlib");
function decode(path) {
  const b = fs.readFileSync(path);
  let off = 8, w, h, colorType;
  const idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString("ascii", off + 4, off + 8);
    const data = b.slice(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const cur = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const c = prev[x];
      const d = x >= bpp ? prev[x - bpp] : 0;
      let v = cur[x];
      if (f === 1) v += a;
      else if (f === 2) v += c;
      else if (f === 3) v += Math.floor((a + c) / 2);
      else if (f === 4) {
        const p = a + c - d;
        const pa = Math.abs(p - a), pb = Math.abs(p - c), pc = Math.abs(p - d);
        v += pa <= pb && pa <= pc ? a : (pb <= pc ? c : d);
      }
      out[y * stride + x] = v & 255;
    }
    prev = Buffer.from(out.slice(y * stride, (y + 1) * stride));
  }
  return { out, w, h, bpp };
}
const { out, w, h, bpp } = decode(process.argv[2]);
function lum(px) {
  const i = px * bpp;
  return (out[i] * 299 + out[i + 1] * 587 + out[i + 2] * 114) / 1000;
}
// Render bottom 400px at fine resolution
const y0 = h - 400, y1 = h, cols = 90, rows = 48;
const chars = " .:-=+*#%@";
for (let r = 0; r < rows; r++) {
  let row = "";
  const sy = y0 + ((y1 - y0) * r) / rows;
  for (let c = 0; c < cols; c++) {
    const sx = (w * c) / cols;
    const py = Math.floor(sy), px = Math.floor(sx);
    const l = lum(py * w + px);
    row += chars[Math.min(9, Math.floor(l * 10 / 256))];
  }
  console.log(row);
}
