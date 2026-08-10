#!/usr/bin/env node
// Usage: node find.js "<pattern>"  — prints nodes whose text/content-desc contains pattern.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pattern = process.argv[2] || '';
const file = path.join(__dirname, '_ui.xml');

function adb(...args) {
  const r = spawnSync('adb', args, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : '';
}

for (let i = 0; i < 2; i++) {
  const r = spawnSync('adb', ['shell', 'uiautomator', 'dump', '/sdcard/_ui.xml'], { stdio: 'ignore' });
  if (r.status === 0) break;
}
const xml = adb('shell', 'cat', '/sdcard/_ui.xml');
fs.writeFileSync(file, xml);

const re = /<node[^>]*>/g;
let m;
let count = 0;
while ((m = re.exec(xml)) !== null) {
  const n = m[0];
  const text = (n.match(/text="([^"]*)"/) || [])[1] || '';
  const desc = (n.match(/content-desc="([^"]*)"/) || [])[1] || '';
  const cls = (n.match(/class="([^"]*)"/) || [])[1] || '';
  const bounds = (n.match(/bounds="([^"]*)"/) || [])[1] || '';
  const clickable = (n.match(/clickable="([^"]*)"/) || [])[1] || 'false';
  const combined = text + ' ' + desc;
  if (pattern && combined.toLowerCase().includes(pattern.toLowerCase())) {
    count++;
    console.log(`text="${text}" desc="${desc}" clickable=${clickable} bounds=${bounds} class=${cls.split('.').pop()}`);
  }
}
if (!count) console.log(`(no nodes matching "${pattern}")`);
