#!/usr/bin/env node
// Helper: dump current UI hierarchy texts & clickable nodes (Windows-friendly).
const { execSync, spawnSync } = require('child_process');

function adb(...args) {
  const local = process.env.LOCALAPPDATA;
  const candidates = [
    local ? `${local}/Android/Sdk/platform-tools/adb.exe` : null,
    process.env.ANDROID_HOME ? `${process.env.ANDROID_HOME}/platform-tools/adb.exe` : null,
    'adb',
  ].filter(Boolean);
  for (const adbBin of candidates) {
    try {
      const r = spawnSync(adbBin, args, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
      if (r.status === 0 || r.status === null) return r.stdout || '';
    } catch (e) { /* try next */ }
  }
  return '';
}

function dumpUi() {
  for (let i = 0; i < 2; i++) {
    const r = spawnSync('adb', ['shell', 'uiautomator', 'dump', '/sdcard/_ui.xml'], { stdio: 'ignore' });
    if (r.status === 0) break;
  }
  return adb('shell', 'cat', '/sdcard/_ui.xml');
}

const xml = dumpUi();
// Persist fresh dump locally so find.js / ad-hoc parsing share it.
require('fs').writeFileSync(require('path').join(__dirname, '_ui.xml'), xml);
if (!xml || xml.includes('no window')) {
  console.log('(no UI dump available)');
  process.exit(0);
}

const texts = [];
const clickables = [];
const re = /<node[^>]*>/g;
let m;
while ((m = re.exec(xml)) !== null) {
  const node = m[0];
  const text = (node.match(/text="([^"]*)"/) || [])[1] || '';
  const desc = (node.match(/content-desc="([^"]*)"/) || [])[1] || '';
  const cls = (node.match(/class="([^"]*)"/) || [])[1] || '';
  const bounds = (node.match(/bounds="([^"]*)"/) || [])[1] || '';
  const clickable = (node.match(/clickable="([^"]*)"/) || [])[1] === 'true';
  if (text.trim()) texts.push(text.trim());
  if (clickable && (text.trim() || desc.trim())) {
    const label = text.trim() || desc.trim();
    const [a, b] = bounds.split('][');
    if (a && b) {
      const [x1, y1] = a.replace('[', '').split(',');
      const [x2, y2] = b.replace(']', '').split(',');
      const cx = Math.round((parseInt(x1) + parseInt(x2)) / 2);
      const cy = Math.round((parseInt(y1) + parseInt(y2)) / 2);
      clickables.push({ label, cx, cy, cls: cls.split('.').pop() });
    }
  }
}

console.log('=== VISIBLE TEXTS ===');
console.log([...new Set(texts)].join(' | '));
console.log('=== CLICKABLE (label @ x,y [class]) ===');
for (const c of clickables) console.log(`${c.label} @ ${c.cx},${c.cy} [${c.cls}]`);
