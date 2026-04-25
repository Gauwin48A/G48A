import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
    const parsed = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const key = token.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            parsed[key] = true;
        } else {
            parsed[key] = next;
            i += 1;
        }
    }
    return parsed;
}

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

const args = parseArgs(process.argv.slice(2));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const screenshotRoot = path.join(repoRoot, "android-native", "test-screenshots");

const webPack = args.webPack
    ? path.resolve(String(args.webPack))
    : await latestDir(screenshotRoot, "web-reference-");
const androidPack = args.androidPack
    ? path.resolve(String(args.androidPack))
    : await latestDir(screenshotRoot, "route-walkthrough-web-parity-");
const minSize = Number.parseInt(String(args.minSize || "20000"), 10);
const criticalMinSize = Number.parseInt(String(args.criticalMinSize || "8000"), 10);
const minWidth = Number.parseInt(String(args.minWidth || "320"), 10);
const minHeight = Number.parseInt(String(args.minHeight || "480"), 10);

if (!webPack || !androidPack) {
    // eslint-disable-next-line no-console
    console.error("Could not resolve web/android screenshot pack directories.");
    process.exit(1);
}

const webManifestPath = path.join(webPack, "manifest.json");
const androidManifestPath = path.join(androidPack, "manifest.json");
const webManifest = JSON.parse(await fs.readFile(webManifestPath, "utf8"));
const androidManifest = JSON.parse(await fs.readFile(androidManifestPath, "utf8"));

const webOk = webManifest.filter((entry) => entry.status === "ok");
const androidEntries = androidManifest.filter((entry) => entry.file);

function parsePngDimensions(buffer) {
    if (!buffer || buffer.length < 24) return null;
    const pngSignature = "89504e470d0a1a0a";
    const signature = buffer.subarray(0, 8).toString("hex");
    if (signature !== pngSignature) return null;
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height };
}

const checkFiles = async (dir, entries) => {
    const missing = [];
    const tiny = [];
    const criticalTiny = [];
    const badDimensions = [];
    for (const entry of entries) {
        const filePath = path.join(dir, entry.file);
        try {
            const stat = await fs.stat(filePath);
            if (stat.size < minSize) tiny.push({ file: entry.file, size: stat.size });
            if (stat.size < criticalMinSize) criticalTiny.push({ file: entry.file, size: stat.size });
            const imageData = await fs.readFile(filePath);
            const dimensions = parsePngDimensions(imageData);
            if (!dimensions) {
                badDimensions.push({ file: entry.file, width: null, height: null, reason: "invalid_png" });
            } else if (dimensions.width < minWidth || dimensions.height < minHeight) {
                badDimensions.push({
                    file: entry.file,
                    width: dimensions.width,
                    height: dimensions.height,
                    reason: "below_min_dimensions",
                });
            }
        } catch {
            missing.push(entry.file);
        }
    }
    return { missing, tiny, criticalTiny, badDimensions };
};

const webFileCheck = await checkFiles(webPack, webOk);
const androidFileCheck = await checkFiles(androidPack, androidEntries);

const result = {
    webPack,
    androidPack,
    minSize,
    web: {
        routes: webManifest.length,
        ok: webOk.length,
        errors: webManifest.length - webOk.length,
        missingFiles: webFileCheck.missing,
        tinyFiles: webFileCheck.tiny,
        criticalTinyFiles: webFileCheck.criticalTiny,
        badDimensions: webFileCheck.badDimensions,
    },
    android: {
        states: androidEntries.length,
        missingFiles: androidFileCheck.missing,
        tinyFiles: androidFileCheck.tiny,
        criticalTinyFiles: androidFileCheck.criticalTiny,
        badDimensions: androidFileCheck.badDimensions,
    },
};

const outPath = path.join(androidPack, "validation-report.json");
await fs.writeFile(outPath, JSON.stringify(result, null, 2));

// eslint-disable-next-line no-console
console.log(JSON.stringify(result, null, 2));

const hasFailure =
    result.web.errors > 0 ||
    result.web.missingFiles.length > 0 ||
    result.android.missingFiles.length > 0 ||
    result.web.criticalTinyFiles.length > 0 ||
    result.android.criticalTinyFiles.length > 0 ||
    result.web.badDimensions.length > 0 ||
    result.android.badDimensions.length > 0;

if (hasFailure) {
    process.exitCode = 1;
}
