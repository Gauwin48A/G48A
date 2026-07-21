import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const ADB = "C:\\Android\\Sdk\\platform-tools\\adb.exe";
const dir = "test-screenshots/timing-test";
fs.mkdirSync(dir, { recursive: true });

function sleep(ms) {
  spawnSync(process.execPath, ["-e", `setTimeout(()=>{},${ms})`], { timeout: ms + 5000 });
}

for (const sec of [8, 12, 16, 20, 25]) {
  sleep(sec * 1000);
  try {
    const buf = execSync(`"${ADB}" -s emulator-5554 exec-out screencap -p`, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 15000,
    });
    const f = `${dir}/${sec}s.png`;
    fs.writeFileSync(f, buf);
    console.log(`${sec}s: ${Math.round(buf.length / 1024)}KB`);
  } catch (e) {
    console.log(`${sec}s: FAILED ${e.message}`);
  }
}

