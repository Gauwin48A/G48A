import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const appPath = path.join(repoRoot, "client", "src", "App.jsx");
const catalogPath = path.join(
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
);

const appSource = await fs.readFile(appPath, "utf8");
const catalogSource = await fs.readFile(catalogPath, "utf8");

const appRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((r) => r && r !== "*");
const uniqueAppRoutes = [...new Set(appRoutes)];

const canonical = [...catalogSource.matchAll(/WebRouteReference\("[^"]+",\s*"[^"]+",\s*"([^"]+)"/g)].map((m) => m[1]);
const aliases = [...catalogSource.matchAll(/aliases\s*=\s*listOf\(([^)]*)\)/g)]
  .flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));

const covered = new Set([...canonical, ...aliases]);
const missing = uniqueAppRoutes.filter((route) => !covered.has(route));

console.log(`App routes: ${uniqueAppRoutes.length}`);
console.log(`Catalog-covered paths: ${covered.size}`);
console.log(`Missing routes: ${missing.length}`);

if (missing.length > 0) {
  console.log("Missing:");
  for (const route of missing) {
    console.log(`- ${route}`);
  }
  process.exitCode = 1;
}

