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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const args = parseArgs(process.argv.slice(2));

const matrixPath = args.matrix
    ? path.resolve(String(args.matrix))
    : path.join(repoRoot, "android-native", "docs", "parity-route-matrix.md");
const thresholdsPath = args.thresholds
    ? path.resolve(String(args.thresholds))
    : path.join(repoRoot, "android-native", "docs", "parity-thresholds.json");

const matrix = await fs.readFile(matrixPath, "utf8");
const thresholds = JSON.parse(await fs.readFile(thresholdsPath, "utf8"));

const matched = Number((matrix.match(/- Matched: \*\*(\d+)\*\*/)?.[1] || "0"));
const partial = Number((matrix.match(/- Partial: \*\*(\d+)\*\*/)?.[1] || "0"));
const missing = Number((matrix.match(/- Missing: \*\*(\d+)\*\*/)?.[1] || "0"));
const total = matched + partial + missing;
const matchedRatio = total > 0 ? matched / total : 0;

const minMatchedRatio = Number(thresholds.minMatchedRatio ?? 0);
const previousReleaseMatchedRatio = Number(thresholds.previousReleaseMatchedRatio ?? 0);
const requireImprovement = Boolean(thresholds.requireImprovement);

const failures = [];
if (missing > 0) failures.push(`Missing routes must be 0 (found ${missing}).`);
if (matchedRatio < minMatchedRatio) {
    failures.push(
        `Matched ratio ${matchedRatio.toFixed(3)} is below minimum ${minMatchedRatio.toFixed(3)}.`,
    );
}
if (requireImprovement && matchedRatio <= previousReleaseMatchedRatio) {
    failures.push(
        `Matched ratio ${matchedRatio.toFixed(3)} must exceed previous release ${previousReleaseMatchedRatio.toFixed(3)}.`,
    );
}

const summary = {
    matrixPath,
    thresholdsPath,
    total,
    matched,
    partial,
    missing,
    matchedRatio: Number(matchedRatio.toFixed(4)),
    minMatchedRatio,
    previousReleaseMatchedRatio,
    requireImprovement,
    pass: failures.length === 0,
    failures,
};

// eslint-disable-next-line no-console
console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
    process.exit(1);
}
