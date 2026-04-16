const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();

const requiredPaths = [
  "src/config",
  "src/controllers",
  "src/middleware",
  "src/routes",
  "src/services",
  "src/utils",
  "src/modules",
  "src/shared",
  "scripts/ops",
  "scripts/archive/translations",
  "scripts/archive/security",
  "tests",
];

const forbiddenRootFiles = [
  "run_migration.js",
  "run_sec_migration.js",
  "seed-profiles.js",
  "generate-sql.js",
  "generateHash.js",
];

const translationScriptPattern =
  /(translation|translations|missing-keys|setup_languages|sync-all-langs|sync-tamil|verify-all-languages|add-(hindi|kannada|marathi|bengali|telugu))/i;

const scriptDir = path.join(rootDir, "scripts");
const rootScripts = fs
  .readdirSync(scriptDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);

const misplacedTranslationFiles = rootScripts.filter((name) =>
  translationScriptPattern.test(name),
);

const missing = requiredPaths.filter(
  (relativePath) => !fs.existsSync(path.join(rootDir, relativePath)),
);

const misplacedRootFiles = forbiddenRootFiles.filter((fileName) =>
  fs.existsSync(path.join(rootDir, fileName)),
);

if (missing.length || misplacedTranslationFiles.length || misplacedRootFiles.length) {
  if (missing.length) {
    console.error("[structure] Missing required directories/files:");
    missing.forEach((item) => console.error(` - ${item}`));
  }
  if (misplacedRootFiles.length) {
    console.error("[structure] Move root scripts into scripts/ops or scripts/archive/security:");
    misplacedRootFiles.forEach((item) => console.error(` - ${item}`));
  }
  if (misplacedTranslationFiles.length) {
    console.error(
      "[structure] Move translation utilities from scripts/ to scripts/archive/translations/:",
    );
    misplacedTranslationFiles.forEach((item) =>
      console.error(` - scripts/${item}`),
    );
  }
  process.exit(1);
}

console.log("[structure] Server folder structure check passed.");
