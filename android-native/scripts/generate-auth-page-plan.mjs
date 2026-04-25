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

function routeToSlug(routePath) {
    if (routePath === "/") return "root";
    return routePath
        .replace(/^\/+/, "")
        .replace(/\/+/g, "_")
        .replace(/:[^/]+/g, "demo")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
}

function normalizeFileBase(fileName) {
    return fileName
        .replace(/\.(png|jpg|jpeg)$/i, "")
        .replace(/^\d+_/, "")
        .toLowerCase();
}

function parseCatalog(catalogSource) {
    const pattern = /WebRouteReference\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*aliases\s*=\s*listOf\(([^)]*)\))?,\s*group\s*=\s*WebRouteGroup\.([A-Z_]+)/g;
    const byPath = new Map();
    const byKey = new Map();

    for (const match of catalogSource.matchAll(pattern)) {
        const key = match[1];
        const title = match[2];
        const canonicalPath = match[3];
        const aliases = match[4]
            ? [...match[4].matchAll(/"([^"]+)"/g)].map((item) => item[1])
            : [];
        const group = match[5];
        const paths = [canonicalPath, ...aliases];
        const row = { key, title, canonicalPath, aliases, paths, group };

        byKey.set(key, row);
        for (const p of paths) byPath.set(p, row);
    }

    return { byPath, byKey };
}

function inferPriority(routePath, key, group) {
    const p0Routes = new Set([
        "/login",
        "/signup",
        "/category-hub",
        "/all-posts",
        "/post/:id",
        "/add-post",
        "/search",
        "/profile",
        "/rewards",
        "/notifications",
        "/wishlist",
        "/cart",
    ]);
    const p0Keys = new Set([
        "login",
        "signup",
        "category_hub",
        "all_posts",
        "post_detail",
        "add_post",
        "search",
        "profile",
        "rewards",
        "notifications",
        "wishlist",
        "cart",
    ]);

    if (p0Routes.has(routePath) || p0Keys.has(key)) return "P0";
    if (group === "LEGAL" || group === "CHANNELS") return "P2";
    return "P1";
}

function phaseFor(priority, statusLabel) {
    const hasCaptureBlocker = statusLabel === "Missing Android capture" || statusLabel === "Android blank/loading capture";
    if (priority === "P0") return hasCaptureBlocker ? "Phase 0 -> Phase 1" : "Phase 1";
    if (priority === "P1") return hasCaptureBlocker ? "Phase 0 -> Phase 2" : "Phase 2";
    return hasCaptureBlocker ? "Phase 0 -> Phase 3" : "Phase 3";
}

function scoreRow(webSize, androidSize) {
    if (androidSize <= 0) {
        return {
            status: "Missing Android capture",
            functionality: 1,
            features: 1,
            uiux: 1,
            note: "No Android screenshot for this signed-in route in the latest run.",
        };
    }
    if (androidSize < 25000) {
        return {
            status: "Android blank/loading capture",
            functionality: 2,
            features: 2,
            uiux: 2,
            note: `Android screenshot is ${(androidSize / 1024).toFixed(0)}KB (blank/loading or early paint).`,
        };
    }
    if (androidSize < 60000) {
        return {
            status: "Android low-content capture",
            functionality: 4,
            features: 4,
            uiux: 3,
            note: `Android screenshot is ${(androidSize / 1024).toFixed(0)}KB and likely not fully rendered.`,
        };
    }

    const ratio = webSize > 0 ? Math.min(webSize, androidSize) / Math.max(webSize, androidSize) : 0.6;
    if (ratio >= 0.75) {
        return {
            status: "Captured (higher parity confidence)",
            functionality: 8,
            features: 8,
            uiux: 7,
            note: "Both web and Android screens are fully captured; manual visual pass still required.",
        };
    }
    if (ratio >= 0.55) {
        return {
            status: "Captured (medium parity confidence)",
            functionality: 7,
            features: 7,
            uiux: 6,
            note: "Both screens loaded but size/layout delta suggests responsive or state differences.",
        };
    }
    return {
        status: "Captured (layout/state divergence)",
        functionality: 6,
        features: 6,
        uiux: 5,
        note: "Both screens loaded but visual/structure difference is significant.",
    };
}

function findAndroidFile(routePath, routeInfo, androidByBase) {
    const candidates = new Set();
    const addCandidatesForPath = (p) => {
        candidates.add(routeToSlug(p));
        candidates.add(routeToSlug(p.replace(/\/:[^/]+/g, "")));
        candidates.add(routeToSlug(p.replace(/:[^/]+/g, "id")));
    };

    addCandidatesForPath(routePath);
    if (routeInfo?.canonicalPath) addCandidatesForPath(routeInfo.canonicalPath);
    for (const alias of routeInfo?.aliases || []) addCandidatesForPath(alias);

    if (routePath === "/") candidates.add("category-hub");
    if (routePath === "/home") candidates.add("category-hub");
    if (routePath === "/t&c") candidates.add("terms");

    for (const candidate of candidates) {
        if (androidByBase.has(candidate)) return androidByBase.get(candidate);
    }

    const loose = [...candidates]
        .filter((item) => item.length >= 3)
        .map((item) => item.slice(0, 14));
    for (const [base, file] of androidByBase.entries()) {
        if (loose.some((item) => base.includes(item))) return file;
    }
    return "";
}

async function main() {
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
        : await latestDir(screenshotsRoot, "android-auth-");

    if (!webPack || !androidPack) {
        throw new Error("Could not resolve web/android signed-in packs.");
    }

    const webManifestPath = path.join(webPack, "manifest.json");
    const webManifest = JSON.parse(await fs.readFile(webManifestPath, "utf8"));
    const webRows = webManifest.filter((row) => row && row.route);

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
    const { byPath } = parseCatalog(catalogSource);

    const androidFiles = (await fs.readdir(androidPack))
        .filter((name) => /\.(png|jpg|jpeg)$/i.test(name));
    const androidByBase = new Map();
    for (const file of androidFiles) {
        const base = normalizeFileBase(file);
        if (!androidByBase.has(base)) androidByBase.set(base, file);
    }

    const rows = [];
    for (const web of webRows) {
        const routePath = web.route;
        const routeInfo = byPath.get(routePath) || {
            key: "-",
            title: routePath,
            canonicalPath: routePath,
            aliases: [],
            group: "UNKNOWN",
        };
        const androidFile = findAndroidFile(routePath, routeInfo, androidByBase);

        const webFile = web.file || "";
        const webSize = webFile
            ? await fs.stat(path.join(webPack, webFile)).then((s) => s.size).catch(() => 0)
            : 0;
        const androidSize = androidFile
            ? await fs.stat(path.join(androidPack, androidFile)).then((s) => s.size).catch(() => 0)
            : 0;

        const score = scoreRow(webSize, androidSize);
        const priority = inferPriority(routePath, routeInfo.key, routeInfo.group);
        const phase = phaseFor(priority, score.status);

        rows.push({
            route: routePath,
            title: routeInfo.title,
            key: routeInfo.key,
            group: routeInfo.group,
            priority,
            phase,
            functionality: score.functionality,
            features: score.features,
            uiux: score.uiux,
            overall: Number(((score.functionality + score.features + score.uiux) / 3).toFixed(1)),
            status: score.status,
            note: score.note,
            webFile,
            androidFile: androidFile || "",
            webSize,
            androidSize,
        });
    }

    const total = rows.length;
    const missing = rows.filter((r) => r.status === "Missing Android capture").length;
    const blank = rows.filter((r) => r.status === "Android blank/loading capture").length;
    const low = rows.filter((r) => r.status === "Android low-content capture").length;
    const captured = total - missing - blank - low;
    const avgFn = (rows.reduce((sum, r) => sum + r.functionality, 0) / total).toFixed(1);
    const avgFeat = (rows.reduce((sum, r) => sum + r.features, 0) / total).toFixed(1);
    const avgUi = (rows.reduce((sum, r) => sum + r.uiux, 0) / total).toFixed(1);
    const avgOverall = ((Number(avgFn) + Number(avgFeat) + Number(avgUi)) / 3).toFixed(1);

    await fs.mkdir(docsRoot, { recursive: true });

    const csvLines = [
        "route,title,android_key,group,priority,phase,status,functionality,features,uiux,overall,web_file,android_file,web_kb,android_kb,note",
    ];
    for (const row of rows) {
        const esc = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;
        csvLines.push([
            esc(row.route),
            esc(row.title),
            esc(row.key),
            esc(row.group),
            esc(row.priority),
            esc(row.phase),
            esc(row.status),
            row.functionality,
            row.features,
            row.uiux,
            row.overall,
            esc(row.webFile),
            esc(row.androidFile),
            (row.webSize / 1024).toFixed(0),
            (row.androidSize / 1024).toFixed(0),
            esc(row.note),
        ].join(","));
    }
    await fs.writeFile(path.join(docsRoot, "page-parity-ratings.csv"), csvLines.join("\n"));

    const mdLines = [
        "# Signed-In Web vs Android Page Ratings",
        "",
        `Generated: ${new Date().toISOString()}`,
        "",
        `Web pack: \`${webPack}\``,
        `Android pack: \`${androidPack}\``,
        "",
        "## Summary",
        `- Total routes compared: **${total}**`,
        `- Missing Android captures: **${missing}**`,
        `- Blank/loading Android captures: **${blank}**`,
        `- Low-content Android captures: **${low}**`,
        `- Captured with content: **${captured}**`,
        `- Functionality avg: **${avgFn}/10**`,
        `- Features avg: **${avgFeat}/10**`,
        `- UI/UX avg: **${avgUi}/10**`,
        `- Overall avg: **${avgOverall}/10**`,
        "",
        "## Route Matrix",
        "| Route | Key | Group | Priority | Phase | Status | Func | Feat | UI/UX | Web | Android |",
        "|---|---|---|---|---|---|---:|---:|---:|---|---|",
    ];

    for (const row of rows) {
        mdLines.push(
            `| \`${row.route}\` | \`${row.key}\` | ${row.group} | ${row.priority} | ${row.phase} | ${row.status} | ${row.functionality}/10 | ${row.features}/10 | ${row.uiux}/10 | ${row.webFile || "-"} | ${row.androidFile || "-"} |`,
        );
    }

    await fs.writeFile(path.join(docsRoot, "page-parity-ratings.md"), mdLines.join("\n"));

    const rewards = rows.find((row) => row.route === "/rewards");
    const profile = rows.find((row) => row.route === "/profile");

    const planLines = [
        "# Web-to-Android Replica Implementation Plan",
        "",
        `Date: ${new Date().toISOString().slice(0, 10)}`,
        `Scope: Signed-in parity for \`http://localhost:8081/category-hub\` across all routes.`,
        "",
        "## Mandatory Conditions",
        "- Login in both web and Android before any route comparison.",
        "- Every Android page must replicate web behavior/features/visual hierarchy; only Android screen-size alignment differences are allowed.",
        "- Use per-page scoring on Functionality, Features, and UI/UX.",
        "",
        "## Current Baseline (Signed-In Run)",
        `- Routes compared: **${total}**`,
        `- Missing Android captures: **${missing}**`,
        `- Blank/loading Android captures: **${blank}**`,
        `- Low-content Android captures: **${low}**`,
        `- Functionality avg: **${avgFn}/10**`,
        `- Features avg: **${avgFeat}/10**`,
        `- UI/UX avg: **${avgUi}/10**`,
        `- Overall avg: **${avgOverall}/10**`,
        "",
        "## Phase Plan",
        "1. Phase 0 - Capture Stability Gate",
        "   - Keep emulator online for full run (current run disconnected after early routes).",
        "   - Regenerate full Android signed-in capture until all P0 pages are present and non-blank.",
        "2. Phase 1 - P0 Replica Pages",
        "   - Login, signup, category hub, all posts, search, add post, profile, rewards, notifications, wishlist, cart, post detail.",
        "   - UI color/gradient parity for Profile and Rewards must match web theme exactly, with only mobile alignment changes.",
        "3. Phase 2 - P1 Core Feature Pages",
        "   - Remaining discovery/account/commerce/social core routes.",
        "4. Phase 3 - P2 Long-tail and Legal/Channels",
        "   - Legal routes, channels/centre routes, remaining low-traffic routes.",
        "5. Phase 4 - Final Signed-In Re-Capture + Closure",
        "   - Re-run signed-in web+Android capture and require per-page >= 8/10 on all three axes.",
        "",
        "## Focus Pages (Requested)",
        `- Rewards: web=\`${rewards?.webFile || "-"}\`, android=\`${rewards?.androidFile || "-"}\`, scores=${rewards?.functionality ?? "-"} / ${rewards?.features ?? "-"} / ${rewards?.uiux ?? "-"}, status=${rewards?.status || "-"}`,
        `- Profile: web=\`${profile?.webFile || "-"}\`, android=\`${profile?.androidFile || "-"}\`, scores=${profile?.functionality ?? "-"} / ${profile?.features ?? "-"} / ${profile?.uiux ?? "-"}, status=${profile?.status || "-"}`,
        "",
        "## Detailed Per-Page Matrix",
        "- See `android-native/docs/page-parity-ratings.md`",
        "- See `android-native/docs/page-parity-ratings.csv`",
    ];
    await fs.writeFile(path.join(docsRoot, "implementation-plan-web-android-parity-2026-04-25.md"), planLines.join("\n"));

    // eslint-disable-next-line no-console
    console.log(`Generated: ${path.join(docsRoot, "page-parity-ratings.md")}`);
    // eslint-disable-next-line no-console
    console.log(`Generated: ${path.join(docsRoot, "page-parity-ratings.csv")}`);
    // eslint-disable-next-line no-console
    console.log(`Generated: ${path.join(docsRoot, "implementation-plan-web-android-parity-2026-04-25.md")}`);
    // eslint-disable-next-line no-console
    console.log(`Summary -> overall ${avgOverall}/10 | missing=${missing}, blank=${blank}, low-content=${low}, captured=${captured}`);
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
});

