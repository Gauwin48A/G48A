import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";

const ADB = "C:\\Android\\Sdk\\platform-tools\\adb.exe";

function adb(...args) {
  return spawnSync(ADB, ["-s", "emulator-5554", ...args], { encoding: "utf8", timeout: 30000 });
}
function sleep(ms) {
  spawnSync(process.execPath, ["-e", `setTimeout(()=>{},${ms})`], { timeout: ms + 5000 });
}

// Force stop and fresh launch
adb("shell", "am", "force-stop", "com.zaruda.app.debug");
sleep(1000);

adb("shell", "am", "start", "-n", "com.zaruda.app.debug/com.zaruda.app.MainActivity",
    "--es", "debug_route", "parity/page/category_hub");
console.log("Launched. Waiting 30s for cold start + auto-login...");
sleep(30000);

const buf = execSync(`"${ADB}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 50*1024*1024 });
fs.writeFileSync("test-screenshots/quick-test-30s.png", buf);
console.log(`30s: ${Math.round(buf.length / 1024)}KB`);

// Now test onNewIntent navigation
adb("shell", "am", "start", "-n", "com.zaruda.app.debug/com.zaruda.app.MainActivity",
    "--activity-single-top", "--es", "debug_route", "parity/page/all_posts");
console.log("Sent all_posts intent. Waiting 8s...");
sleep(8000);

const buf2 = execSync(`"${ADB}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 50*1024*1024 });
fs.writeFileSync("test-screenshots/quick-test-allposts-8s.png", buf2);
console.log(`all_posts: ${Math.round(buf2.length / 1024)}KB`);

// One more
adb("shell", "am", "start", "-n", "com.zaruda.app.debug/com.zaruda.app.MainActivity",
    "--activity-single-top", "--es", "debug_route", "parity/page/login");
console.log("Sent login intent. Waiting 8s...");
sleep(8000);

const buf3 = execSync(`"${ADB}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 50*1024*1024 });
fs.writeFileSync("test-screenshots/quick-test-login-8s.png", buf3);
console.log(`login: ${Math.round(buf3.length / 1024)}KB`);

