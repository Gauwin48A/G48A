const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const localesDir = path.join(repoRoot, "client", "src", "locales");
const languages = ["en", "hi", "te", "ta", "kn", "mr", "bn"];

const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
const enKeys = Object.keys(en).sort();

const reportFile = path.join(repoRoot, "verification_report.txt");
const reportLines = [];
const log = (line = "") => {
  reportLines.push(line);
  if (line) {
    console.log(line);
  } else {
    console.log("");
  }
};

log("=== Translation Readiness Report ===");
log("");
log(`Base Language (EN): ${enKeys.length} keys`);

languages
  .filter((l) => l !== "en")
  .forEach((lang) => {
    const filePath = path.join(localesDir, `${lang}.json`);
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const keys = Object.keys(content);

    const missing = enKeys.filter((k) => !keys.includes(k));
    const suspicious = keys.filter((k) => {
      if (!en[k]) return false;
      if (en[k].length < 3 || /^\d+$/.test(en[k])) return false;
      return content[k] === en[k];
    });

    const translatedCount = enKeys.length - missing.length - suspicious.length;
    const translationPercent = Math.round(
      (translatedCount / enKeys.length) * 100,
    );
    const coveragePercent = Math.round(
      ((enKeys.length - missing.length) / enKeys.length) * 100,
    );

    log("");
    log(`[${lang.toUpperCase()}] Translated: ${translationPercent}%`);
    log(`Coverage (keys present): ${coveragePercent}%`);
    log(`Total Keys: ${keys.length}`);
    log(`Untranslated (English): ${suspicious.length} keys`);

    if (missing.length > 0) {
      log(
        `Missing Keys (${missing.length}): ${missing.slice(0, 5).join(", ")}${
          missing.length > 5 ? "..." : ""
        }`,
      );
    } else {
      log("Missing Keys: 0 (Key synced)");
    }

    if (suspicious.length > 0) {
      const examples = suspicious
        .slice(0, 5)
        .map((k) => `   ${k}: "${content[k]}"`)
        .join("\n");
      reportLines.push("   Examples of Untranslated:");
      reportLines.push(examples);
      console.log("   Examples of Untranslated:");
      console.log(examples);
    }
  });

fs.writeFileSync(reportFile, `${reportLines.join("\n")}\n`);
console.log(`\nReport generated: ${reportFile}`);
