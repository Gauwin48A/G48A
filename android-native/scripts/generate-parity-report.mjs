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
const docsRoot = path.join(repoRoot, "android-native", "docs");
const matrixPath = path.join(docsRoot, "parity-route-matrix.md");

const webPack = args.webPack
    ? path.resolve(String(args.webPack))
    : await latestDir(screenshotRoot, "web-reference-");
const androidPack = args.androidPack
    ? path.resolve(String(args.androidPack))
    : await latestDir(screenshotRoot, "route-walkthrough-web-parity-");

const webManifest = JSON.parse(await fs.readFile(path.join(webPack, "manifest.json"), "utf8"));
const androidManifest = JSON.parse(await fs.readFile(path.join(androidPack, "manifest.json"), "utf8"));

const appSource = await fs.readFile(path.join(repoRoot, "client", "src", "App.jsx"), "utf8");
const catalogSource = await fs.readFile(
    path.join(repoRoot, "android-native", "app", "src", "main", "java", "com", "mhub", "app", "ui", "parity", "WebRouteCatalog.kt"),
    "utf8",
);
const navSource = await fs.readFile(
    path.join(repoRoot, "android-native", "app", "src", "main", "java", "com", "mhub", "app", "ui", "MhubApp.kt"),
    "utf8",
);

const webRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((route) => route && route !== "*");
const uniqueWebRoutes = [...new Set(webRoutes)];

const canonical = [...catalogSource.matchAll(/WebRouteReference\("[^"]+",\s*"[^"]+",\s*"([^"]+)"/g)].map((m) => m[1]);
const aliases = [...catalogSource.matchAll(/aliases\s*=\s*listOf\(([^)]*)\)/g)]
    .flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
const coveredPaths = new Set([...canonical, ...aliases]);
const missingCoverage = uniqueWebRoutes.filter((route) => !coveredPaths.has(route));

const explicitNativeScreens = [...new Set([...navSource.matchAll(/composable\((?:\s*route\s*=\s*)?Routes\.([A-Z_]+)/g)].map((m) => m[1]))];

const webOk = webManifest.filter((entry) => entry.status === "ok").length;
const webErrors = webManifest.length - webOk;

let matched = 0;
let partial = 0;
let missing = 0;
try {
    const matrixSource = await fs.readFile(matrixPath, "utf8");
    matched = Number((matrixSource.match(/- Matched: \*\*(\d+)\*\*/)?.[1] || "0"));
    partial = Number((matrixSource.match(/- Partial: \*\*(\d+)\*\*/)?.[1] || "0"));
    missing = Number((matrixSource.match(/- Missing: \*\*(\d+)\*\*/)?.[1] || "0"));
} catch {
    matched = 0;
    partial = 0;
    missing = missingCoverage.length;
}

const totalMatrix = matched + partial + missing;
const matchedRatio = totalMatrix > 0 ? matched / totalMatrix : 0;

const routeCoverageScore = Math.max(0, Math.min(10, 10 - missingCoverage.length * 2));
const visualFidelityScore = Number((5 + matchedRatio * 5).toFixed(1));
const uxFidelityScore = Number((5 + matchedRatio * 5).toFixed(1));
const uiBehaviorParityScore = Number((matchedRatio * 10).toFixed(1));
const weightedOverall = (
    routeCoverageScore * 0.25 +
    visualFidelityScore * 0.25 +
    uxFidelityScore * 0.25 +
    uiBehaviorParityScore * 0.25
).toFixed(1);

const perfectUiParity = missingCoverage.length === 0 && matchedRatio >= 1 && webErrors === 0;

const now = new Date().toISOString();
const report = [
    "# Android vs Web Parity Report",
    "",
    `Generated: ${now}`,
    "",
    "## Artifacts",
    `- Web reference pack: \`${webPack}\``,
    `- Android parity pack: \`${androidPack}\``,
    "",
    "## Metrics",
    `- Web routes (unique): **${uniqueWebRoutes.length}**`,
    `- Web screenshot OK/errors: **${webOk} / ${webErrors}**`,
    `- Android parity states captured: **${androidManifest.length}**`,
    `- Android explicit production screens: **${explicitNativeScreens.length}**`,
    `- Route mapping gaps: **${missingCoverage.length}**`,
    `- Route matrix matched ratio: **${(matchedRatio * 100).toFixed(1)}%** (${matched}/${totalMatrix || uniqueWebRoutes.length})`,
    "",
    "## Scorecard (0-10)",
    `- Overall parity: **${weightedOverall} / 10**`,
    `- Route coverage: **${routeCoverageScore.toFixed(1)} / 10**`,
    `- Visual parity: **${visualFidelityScore.toFixed(1)} / 10**`,
    `- UX/flow parity: **${uxFidelityScore.toFixed(1)} / 10**`,
    `- UI behavior parity: **${uiBehaviorParityScore.toFixed(1)} / 10**`,
    "",
];

if (perfectUiParity) {
    report.push("## Lacking Areas");
    report.push("- No guest-route UI/UX parity gaps detected against the latest web reference pack.");
    report.push("");
    report.push("## Maintenance Plan");
    report.push("1. Keep route matrix as a release gate (`Missing = 0`, `Matched = 100%`).");
    report.push("2. Re-capture guest/auth/admin web baselines for every release candidate.");
    report.push("3. Preserve screenshot-pack validation in CI to catch visual regressions.");
    report.push("4. Add route-level interaction tests for high-traffic screens.");
    report.push("");
} else {
    report.push("## Lacking Areas");
    report.push("- Some routes are still represented by generic parity previews instead of complete Android route behavior.");
    report.push("- Authenticated and role-based route states need dedicated web capture baselines.");
    report.push("- Route-level dynamic states (loading/empty/error/success/action outcomes) are not yet fully regression-tested.");
    report.push("");
    report.push("## Improvement Plan");
    report.push("1. Convert remaining partial routes into explicit Android-friendly route behavior.");
    report.push("2. Capture web references in guest/auth/admin modes using storage states and seeded data.");
    report.push("3. Add route-state screenshot checks in CI for Android parity pages and production screens.");
    report.push("4. Add route-level behavior tests for commerce, social, profile, KYC, and payment.");
    report.push("5. Keep route matrix as a release gate with zero missing routes.");
    report.push("");
}

if (missingCoverage.length > 0) {
    report.push("## Missing Route Coverage");
    for (const route of missingCoverage) {
        report.push(`- ${route}`);
    }
    report.push("");
}

await fs.mkdir(docsRoot, { recursive: true });
const outPath = path.join(docsRoot, "parity-review-report.md");
await fs.writeFile(outPath, report.join("\n"));

// eslint-disable-next-line no-console
console.log(`Parity report generated: ${outPath}`);

