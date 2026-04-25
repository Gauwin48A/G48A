import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const stripped = token.slice(2);
        const eqIdx = stripped.indexOf("=");
        if (eqIdx !== -1) {
            // --key=value style
            args[stripped.slice(0, eqIdx)] = stripped.slice(eqIdx + 1);
        } else {
            const next = argv[i + 1];
            if (!next || next.startsWith("--")) {
                args[stripped] = true;
            } else {
                args[stripped] = next;
                i += 1;
            }
        }
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
const mode = String(args.mode || "guest").toLowerCase();
const baseUrl = String(args.baseUrl || "http://localhost:8081").replace(/\/+$/, "");
const waitMs = Number.parseInt(String(args.waitMs || "1000"), 10);
const outLabel = args.outLabel ? String(args.outLabel) : "";
const storageStateArg = args.storageState ? path.resolve(String(args.storageState)) : "";
const storageStateFromEnv = process.env.MHUB_STORAGE_STATE ? path.resolve(process.env.MHUB_STORAGE_STATE) : "";
const storageStatePath = storageStateArg || storageStateFromEnv;

const appPath = path.resolve("src/App.jsx");
const appSource = await fs.readFile(appPath, "utf8");

const routeRegex = /<Route\s+path="([^"]+)"/g;
const routes = [];
let match;
while ((match = routeRegex.exec(appSource)) !== null) {
    const current = match[1];
    if (!current || current === "*") continue;
    routes.push(current);
}

const uniqueRoutes = [...new Set(routes)];
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const suffix = outLabel ? `-${outLabel}` : "";
const outDir = path.resolve("..", "android-native", "test-screenshots", `web-reference-${mode}${suffix}-${stamp}`);
await fs.mkdir(outDir, { recursive: true });

const contextOptions = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "en-US",
};

if (mode === "auth" && storageStatePath) {
    contextOptions.storageState = storageStatePath;
}

if (mode === "auth" && !storageStatePath) {
    // eslint-disable-next-line no-console
    console.warn("[WARN] mode=auth requested but no --storageState / MHUB_STORAGE_STATE provided.");
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(contextOptions);
const page = await context.newPage();
const results = [];

const gotoStrategies = [
    { waitUntil: "networkidle", timeout: 30000 },
    { waitUntil: "load", timeout: 30000 },
    { waitUntil: "domcontentloaded", timeout: 30000 },
];

async function gotoWithFallback(targetPage, targetUrl) {
    let lastError = null;
    for (const strategy of gotoStrategies) {
        try {
            await targetPage.goto(targetUrl, strategy);
            return { ok: true, strategy: strategy.waitUntil };
        } catch (error) {
            lastError = error;
        }
    }
    return { ok: false, strategy: "failed", error: lastError };
}

function sanitizeRoute(route) {
    return route
        .replace(/:postId|:userId|:token|:code|:slug|:id/g, "demo")
        .replace(/\*/g, "")
        .replace(/\/+/g, "/") || "/";
}

function fileSlug(route) {
    return route
        .replace(/^\//, "")
        .replace(/[:/?&=]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "") || "root";
}

for (let i = 0; i < uniqueRoutes.length; i += 1) {
    const original = uniqueRoutes[i];
    const resolved = sanitizeRoute(original);
    const normalizedPath = resolved.startsWith("/") ? resolved : `/${resolved}`;
    const url = `${baseUrl}${normalizedPath}`;
    const fileName = `${String(i + 1).padStart(2, "0")}_${fileSlug(original)}.png`;
    const target = path.join(outDir, fileName);

    try {
        const navigation = await gotoWithFallback(page, url);
        if (!navigation.ok) {
            throw navigation.error || new Error(`Failed to navigate to ${url}`);
        }
        await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 1000);
        await page.screenshot({ path: target, fullPage: true });

        const imageData = await fs.readFile(target);
        const hash = crypto.createHash("sha256").update(imageData).digest("hex");

        results.push({
            route: original,
            resolved,
            url,
            file: fileName,
            hash,
            navigationStrategy: navigation.strategy,
            status: "ok",
        });
        // eslint-disable-next-line no-console
        console.log(`OK ${original} [${navigation.strategy}] -> ${fileName}`);
    } catch (error) {
        results.push({
            route: original,
            resolved,
            url,
            file: fileName,
            status: "error",
            error: String(error?.message || error),
        });
        // eslint-disable-next-line no-console
        console.error(`ERR ${original}: ${String(error?.message || error)}`);
    }
}

await browser.close();

const hashGroups = new Map();
for (const entry of results) {
    if (entry.status !== "ok" || !entry.hash) continue;
    if (!hashGroups.has(entry.hash)) hashGroups.set(entry.hash, []);
    hashGroups.get(entry.hash).push(entry.route);
}

const duplicateGroups = [...hashGroups.entries()]
    .filter(([, routesInGroup]) => routesInGroup.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([hash, routesInGroup]) => ({
        hash,
        routeCount: routesInGroup.length,
        routes: routesInGroup,
    }));

const likelyAuthGatedRoutes = duplicateGroups.length > 0 ? duplicateGroups[0].routes : [];
const okCount = results.filter((r) => r.status === "ok").length;
const errorCount = results.length - okCount;

const summary = {
    mode,
    baseUrl,
    totalRoutes: uniqueRoutes.length,
    okCount,
    errorCount,
    duplicateGroupCount: duplicateGroups.length,
    largestDuplicateGroupSize: duplicateGroups[0]?.routeCount ?? 0,
    likelyAuthGatedRoutes,
    storageStateUsed: mode === "auth" ? (storageStatePath || null) : null,
};

await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(results, null, 2));
await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outDir, "duplicate-groups.json"), JSON.stringify(duplicateGroups, null, 2));
await fs.writeFile(
    path.join(outDir, "manifest.txt"),
    results.map((r) => `${r.status.toUpperCase()} ${r.route} -> ${r.file}`).join("\n"),
);

// eslint-disable-next-line no-console
console.log(`Reference capture complete: ${outDir}`);
// eslint-disable-next-line no-console
console.log(`Summary: routes=${summary.totalRoutes}, ok=${summary.okCount}, errors=${summary.errorCount}, dupGroups=${summary.duplicateGroupCount}`);
