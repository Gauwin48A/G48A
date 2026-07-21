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

    const stats = await Promise.all(
        dirs.map(async (name) => ({
            name,
            stat: await fs.stat(path.join(baseDir, name)),
        })),
    );

    stats.sort((a, b) => {
        const delta = b.stat.mtimeMs - a.stat.mtimeMs;
        return delta !== 0 ? delta : b.name.localeCompare(a.name);
    });
    return path.join(baseDir, stats[0].name);
}

function parseCatalog(source) {
    const rows = [...source.matchAll(
        /WebRouteReference\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*aliases\s*=\s*listOf\(([^)]*)\))?/g,
    )].map((m) => ({
        key: m[1],
        title: m[2],
        canonicalPath: m[3],
        aliases: m[4]
            ? [...m[4].matchAll(/"([^"]+)"/g)].map((x) => x[1])
            : [],
    }));

    const byPath = new Map();
    const byKey = new Map();
    for (const row of rows) {
        byKey.set(row.key, row);
        byPath.set(row.canonicalPath, row.key);
        for (const alias of row.aliases) {
            byPath.set(alias, row.key);
        }
    }
    return { byPath, byKey };
}

const args = parseArgs(process.argv.slice(2));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const screenshotsRoot = path.join(repoRoot, "android-native", "test-screenshots");
const docsRoot = path.join(repoRoot, "android-native", "docs");

const webPack = args.webPack
    ? path.resolve(String(args.webPack))
    : await latestDir(screenshotsRoot, "web-reference-auth-");
const androidPack = args.androidPack
    ? path.resolve(String(args.androidPack))
    : await latestDir(screenshotsRoot, "route-walkthrough-web-parity-auth-");

if (!webPack || !androidPack) {
    throw new Error("Unable to locate web/android screenshot packs. Pass --webPack and --androidPack.");
}

const webManifest = JSON.parse(await fs.readFile(path.join(webPack, "manifest.json"), "utf8"));
const androidManifest = JSON.parse(await fs.readFile(path.join(androidPack, "manifest.json"), "utf8"));
const appSource = await fs.readFile(path.join(repoRoot, "client", "src", "App.jsx"), "utf8");
const catalogSource = await fs.readFile(
    path.join(
        repoRoot,
        "android-native",
        "app",
        "src",
        "main",
        "java",
        "com",
        "mhub",
        "app",
        "ui",
        "parity",
        "WebRouteCatalog.kt",
    ),
    "utf8",
);

const webRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((route) => route && route !== "*");
const uniqueWebRoutes = [...new Set(webRoutes)];

const { byPath } = parseCatalog(catalogSource);
const androidByKey = new Map(androidManifest.map((entry) => [entry.key, entry]));

const nativeCoverageKeys = new Set([
    "login",
    "category_hub",
    "all_posts",
    "for_you",
    "feed",
    "profile",
    "rewards",
    "notifications",
    "wishlist",
    "post_detail",
    "search",
    "subcategories",
    "add_post",
    "my_home",
    "chat",
    "kyc",
]);

const nuancedPartialKeys = new Set([
    "security",
    "verification",
    "post_welcome",
]);

const rows = [];
for (let idx = 0; idx < uniqueWebRoutes.length; idx += 1) {
    const route = uniqueWebRoutes[idx];
    const key = byPath.get(route) || "-";
    const webEntry = webManifest.find((entry) => entry.route === route);
    const androidEntry = key !== "-" ? androidByKey.get(key) : null;

    let status = "Not Same (Parity Placeholder)";
    let functionality = 2;
    let features = 2;
    let uiux = 2;
    let notes = "Currently represented via parity preview/detail surface, not a production-native equivalent screen.";

    if (key === "-") {
        status = "Missing";
        functionality = 1;
        features = 1;
        uiux = 1;
        notes = "No Android parity catalog mapping for this route.";
    } else if (nativeCoverageKeys.has(key)) {
        status = "Partial Match";
        functionality = 6;
        features = 6;
        uiux = 5;
        notes = "Native Android screen exists, but structure/components/navigation differ from web baseline.";
    } else if (nuancedPartialKeys.has(key)) {
        status = "Partial Match";
        functionality = 5;
        features = 4;
        uiux = 4;
        notes = "Closest Android flow exists but does not reproduce full web route behavior or layout.";
    }

    if (key === "rewards") {
        const androidRoute = String(androidEntry?.route || "");
        if (androidRoute.startsWith("parity/page/")) {
            status = "Far Different";
            functionality = 2;
            features = 2;
            uiux = 2;
            notes = "Android rewards route is still parity-preview/auth-gate style, while web rewards is a full signed-in dashboard.";
        }
    }

    rows.push({
        route,
        key,
        status,
        functionality,
        features,
        uiux,
        notes,
        webScreenshot: webEntry?.file || "",
    });
}

const total = rows.length;
const partialCount = rows.filter((r) => r.status === "Partial Match").length;
const placeholderCount = rows.filter((r) => r.status === "Not Same (Parity Placeholder)").length;
const farDifferentCount = rows.filter((r) => r.status === "Far Different").length;
const missingCount = rows.filter((r) => r.status === "Missing").length;
const avgFn = rows.reduce((acc, r) => acc + r.functionality, 0) / total;
const avgFeat = rows.reduce((acc, r) => acc + r.features, 0) / total;
const avgUi = rows.reduce((acc, r) => acc + r.uiux, 0) / total;
const overall = (avgFn + avgFeat + avgUi) / 3;

const csvLines = [
    "route,android_key,strict_status,functionality_score,features_score,uiux_score,notes,web_screenshot",
];
for (const row of rows) {
    const esc = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;
    csvLines.push(
        [
            esc(row.route),
            esc(row.key),
            esc(row.status),
            row.functionality,
            row.features,
            row.uiux,
            esc(row.notes),
            esc(row.webScreenshot),
        ].join(","),
    );
}

const mdLines = [
    "# Strict Web-vs-Android Re-Comparison",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Web pack: \`${webPack}\``,
    `Android pack used for route walk: \`${androidPack}\``,
    "",
    "## Strict Summary",
    `- Total web routes checked: **${total}**`,
    `- Partial Match: **${partialCount}**`,
    `- Not Same (Parity Placeholder): **${placeholderCount}**`,
    `- Far Different: **${farDifferentCount}**`,
    `- Missing: **${missingCount}**`,
    `- Functionality avg: **${avgFn.toFixed(1)}/10**`,
    `- Features avg: **${avgFeat.toFixed(1)}/10**`,
    `- UI/UX avg: **${avgUi.toFixed(1)}/10**`,
    `- Overall strict parity: **${overall.toFixed(1)}/10**`,
    "",
    "## Key Confirmed Gaps",
    "- Bottom navbar structure differs from web IA/interaction in several routes.",
    "- Rewards still fails strict parity because Android capture remains auth-gated/parity-mode for the route walkthrough.",
    "- Many routes are parity placeholders, not production-native equivalents yet.",
    "",
    "## Route-by-Route (Strict)",
    "| Route | Android Key | Strict Status | Functionality | Features | UI/UX | Notes | Web Screenshot |",
    "|---|---|---|---:|---:|---:|---|---|",
];

for (const row of rows) {
    mdLines.push(
        `| \`${row.route}\` | \`${row.key}\` | ${row.status} | ${row.functionality}/10 | ${row.features}/10 | ${row.uiux}/10 | ${row.notes} | ${row.webScreenshot || "-"} |`,
    );
}

await fs.mkdir(docsRoot, { recursive: true });
const outCsv = path.join(docsRoot, "strict-parity-recompare.csv");
const outMd = path.join(docsRoot, "strict-parity-recompare.md");
await fs.writeFile(outCsv, csvLines.join("\n"));
await fs.writeFile(outMd, mdLines.join("\n"));

// eslint-disable-next-line no-console
console.log(`Strict parity CSV generated: ${outCsv}`);
// eslint-disable-next-line no-console
console.log(`Strict parity MD generated: ${outMd}`);

