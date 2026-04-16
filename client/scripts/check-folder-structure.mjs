import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const requiredPaths = [
  "src/app",
  "src/features",
  "src/shared",
  "src/assets",
  "src/components",
  "src/context",
  "src/hooks",
  "src/lib",
  "src/pages",
  "src/services",
  "src/styles",
  "src/utils",
  "e2e/smoke",
  "e2e/comprehensive",
  "e2e/visual",
  "scripts/archive/tmp",
];

const forbiddenRootFiles = [
  "final-report.txt",
  "test-output-full.txt",
  "test-output.txt",
  "test-run-latest.txt",
  "test-run-output.txt",
  "test-run-report.txt",
  "eslint-full-report.json",
  "eslint-report.json",
  "i18n-missing-report.json",
];

const unexpectedTmpScripts = fs
  .readdirSync(path.join(rootDir, "scripts"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.startsWith("_tmp_"))
  .map((entry) => entry.name);

const missing = requiredPaths.filter(
  (relativePath) => !fs.existsSync(path.join(rootDir, relativePath)),
);

const misplacedRootFiles = forbiddenRootFiles.filter((fileName) =>
  fs.existsSync(path.join(rootDir, fileName)),
);

if (missing.length || unexpectedTmpScripts.length || misplacedRootFiles.length) {
  if (missing.length) {
    console.error("[structure] Missing required directories/files:");
    missing.forEach((item) => console.error(` - ${item}`));
  }
  if (misplacedRootFiles.length) {
    console.error("[structure] Move report artifacts out of client root:");
    misplacedRootFiles.forEach((item) => console.error(` - ${item}`));
  }
  if (unexpectedTmpScripts.length) {
    console.error("[structure] Move temporary scripts under scripts/archive/tmp:");
    unexpectedTmpScripts.forEach((item) => console.error(` - scripts/${item}`));
  }
  process.exit(1);
}

console.log("[structure] Client folder structure check passed.");
