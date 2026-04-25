import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const appSource = await fs.readFile(path.join(repoRoot, "client", "src", "App.jsx"), "utf8");
const catalogSource = await fs.readFile(
    path.join(repoRoot, "android-native", "app", "src", "main", "java", "com", "mhub", "app", "ui", "parity", "WebRouteCatalog.kt"),
    "utf8",
);
const paritySpecSource = await fs.readFile(
    path.join(repoRoot, "android-native", "app", "src", "main", "java", "com", "mhub", "app", "ui", "parity", "WebParitySpec.kt"),
    "utf8",
);
const parityScreensSource = await fs.readFile(
    path.join(repoRoot, "android-native", "app", "src", "main", "java", "com", "mhub", "app", "ui", "parity", "WebParityScreens.kt"),
    "utf8",
);

const webRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((r) => r && r !== "*");
const uniqueWebRoutes = [...new Set(webRoutes)];

const catalogRows = [...catalogSource.matchAll(
    /WebRouteReference\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*aliases\s*=\s*listOf\(([^)]*)\))?,\s*group\s*=\s*WebRouteGroup\.([A-Z_]+)/g,
)]
    .map((m) => ({
        key: m[1],
        title: m[2],
        canonical: m[3],
        group: m[5],
        aliases: m[4]
            ? [...m[4].matchAll(/"([^"]+)"/g)].map((x) => x[1])
            : [],
    }));

const aliasMap = new Map();
for (const row of catalogRows) {
    aliasMap.set(row.canonical, row);
    for (const alias of row.aliases) {
        aliasMap.set(alias, row);
    }
}

const productionMatchedKeys = new Set([
    "login",
    "signup",
    "forgot_password",
    "reset_password",
    "category_hub",
    "all_posts",
    "search",
    "post_detail",
    "add_post",
    "post_welcome",
    "edit_post",
    "tiers",
    "payment",
    "buyer_view",
    "sale_done",
    "sale_undone",
    "offers",
    "my_feed",
    "post_add",
    "my_home",
    "activity",
    "dashboard",
    "wishlist",
    "notifications",
    "profile",
    "chat",
    "kyc",
    "verification",
    "channel_create",
    "centre_create",
]);

const parseQuotedCaseKeys = (source) => {
    const keys = new Set();
    const casePattern = /((?:"[^"]+"\s*,\s*)*"[^"]+")\s*->/g;
    for (const match of source.matchAll(casePattern)) {
        const group = match[1] || "";
        for (const keyMatch of group.matchAll(/"([^"]+)"/g)) {
            keys.add(keyMatch[1]);
        }
    }
    return keys;
};

const parseSpecOverrideKeys = (source) => {
    const keys = new Set();
    for (const match of source.matchAll(/"([^"]+)"\s+to\s+RouteUxSpec\(/g)) {
        keys.add(match[1]);
    }
    return keys;
};

const parityBehaviorKeys = parseQuotedCaseKeys(parityScreensSource);
const paritySpecOverrideKeys = parseSpecOverrideKeys(paritySpecSource);
const uiMatchedKeys = new Set([
    ...productionMatchedKeys,
    ...parityBehaviorKeys,
    ...paritySpecOverrideKeys,
]);

const rows = uniqueWebRoutes.map((routePath) => {
    const catalog = aliasMap.get(routePath);
    if (!catalog) {
        return {
            routePath,
            key: "-",
            group: "-",
            status: "Missing",
            notes: "No Android parity catalog mapping.",
        };
    }

    const isProductionNative = productionMatchedKeys.has(catalog.key);
    const isUiMatched = uiMatchedKeys.has(catalog.key);
    const status = isUiMatched ? "Matched" : "Partial";
    const notes = status === "Matched"
        ? isProductionNative
            ? "Has production-native screen path."
            : "Android-specific parity UI implemented for this route."
        : "Mapped in parity catalog; route-specific Android UI pending.";

    return {
        routePath,
        key: catalog.key,
        group: catalog.group,
        status,
        notes,
    };
});

const totals = {
    matched: rows.filter((r) => r.status === "Matched").length,
    partial: rows.filter((r) => r.status === "Partial").length,
    missing: rows.filter((r) => r.status === "Missing").length,
};

const lines = [
    "# Route Parity Matrix",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Total routes: **${rows.length}**`,
    `- Matched: **${totals.matched}**`,
    `- Partial: **${totals.partial}**`,
    `- Missing: **${totals.missing}**`,
    "",
    "| Web Route | Android Key | Group | Status | Notes |",
    "|---|---|---|---|---|",
];

for (const row of rows) {
    lines.push(`| \`${row.routePath}\` | \`${row.key}\` | ${row.group} | ${row.status} | ${row.notes} |`);
}

const outPath = path.join(repoRoot, "android-native", "docs", "parity-route-matrix.md");
await fs.writeFile(outPath, lines.join("\n"));
// eslint-disable-next-line no-console
console.log(`Route matrix generated: ${outPath}`);
