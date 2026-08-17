const fs = require('fs');
const zlib = require('zlib');
const file = process.argv[2];
const b = fs.readFileSync(file);
let off = 8;
let w, h, colorType, bitDepth;
const idat = [];
while (off < b.length) {
  const len = b.readUInt32BE(off);
  const type = b.toString('ascii', off + 4, off + 8);
  const data = b.slice(off + 8, off + 8 + len);
  if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
  if (type === 'IDAT') idat.push(data);
  if (type === 'IEND') break;
  off += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat));
const bpp = colorType === 6 ? 4 : 3;
const stride = w * bpp;
const pxBuf = Buffer.alloc(h * stride);
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
      const pa = x >= bpp ? prev[x - bpp] : 0;
      v += pa + a - c - d >= 0 ? Math.floor(Math.sqrt(pa * pa + a * a - c * c - d * d)) : 0;
    }
    v = v & 0xff;
    cur[x] = v;
  }
  cur.copy(pxBuf, y * stride);
  prev = cur;
}
function lum(x, y) {
  const i = (y * stride) + x * bpp;
  return (pxBuf[i] * 299 + pxBuf[i + 1] * 587 + pxBuf[i + 2] * 114) / 1000;
}
function px(x, y) {
  const i = (y * stride) + x * bpp;
  return [pxBuf[i], pxBuf[i + 1], pxBuf[i + 2]];
}
const chars = ' .:-=+*#%@';
const y0 = 1700, y1 = 2400, cols = 72, rows = 60;
for (let r = 0; r < rows; r++) {
  let row = '';
  const sy = y0 + ((y1 - y0) * r) / rows + (y1 - y0) / (2 * rows);
  for (let c = 0; c < cols; c++) {
    const sx = (w * c) / cols + w / (2 * cols);
    const l = lum(Math.round(sx), Math.round(sy));
    row += chars[Math.min(9, Math.floor((l * 10) / 256))];
  }
  console.log(row);
}
console.log('=== color samples at bottom bands ===');
for (let y = 1850; y < 2400; y += 25) {
  const c = px(540, y);
  console.log('y=' + y + ' rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
}
