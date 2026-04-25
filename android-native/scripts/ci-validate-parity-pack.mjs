import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

async function latestDir(baseDir, prefix) {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const dirs = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
        .map((entry) => entry.name);
    if (dirs.length === 0) return "";

    const stats = await Promise.all(dirs.map(async (name) => ({
        name,
        stat: await fs.stat(path.join(baseDir, name)),
    })));
    stats.sort((a, b) => {
        const delta = b.stat.mtimeMs - a.stat.mtimeMs;
        return delta !== 0 ? delta : b.name.localeCompare(a.name);
    });
    return path.join(baseDir, stats[0].name);
}

function runNodeScript(scriptPath) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath], { stdio: "inherit" });
        child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Validation script failed with exit code ${code}`));
        });
    });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const screenshotRoot = path.join(repoRoot, "android-native", "test-screenshots");
const requirePacks = String(process.env.PARITY_REQUIRE_PACKS || "false").toLowerCase() === "true";

const latestWebPack = await latestDir(screenshotRoot, "web-reference-");
const latestAndroidPack = await latestDir(screenshotRoot, "route-walkthrough-web-parity-");

if (!latestWebPack || !latestAndroidPack) {
    if (requirePacks) {
        // eslint-disable-next-line no-console
        console.error("Parity screenshot packs are required, but latest web/android packs were not found.");
        process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.log("Parity screenshot validation skipped: no local web/android screenshot packs found.");
    process.exit(0);
}

const validateScript = path.join(__dirname, "validate-parity-pack.mjs");
await runNodeScript(validateScript);

