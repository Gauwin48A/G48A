/**
 * fill_missing_translations.js
 * Scans locale files and fills missing string entries with English fallback.
 * Uses the raw XML content from the base file (already properly escaped)
 * so no re-escaping is needed.
 * 
 * Usage: node tools/fill_missing_translations.js
 */
const fs = require("fs");
const path = require("path");

const RES_DIR = path.join(__dirname, "..", "app", "src", "main", "res");

function readRawStringEntries(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const entries = {};
  // Capture the raw XML between > and </string> including any escaping
  const regex = /<string\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    entries[match[1]] = {
      raw: match[2],
      full: match[0],
    };
  }
  return entries;
}

function getStringNames(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const names = new Set();
  const regex = /<string\s+name="([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    names.add(match[1]);
  }
  return names;
}

const baseFile = path.join(RES_DIR, "values", "strings.xml");
const baseEntries = readRawStringEntries(baseFile);
const baseNames = new Set(Object.keys(baseEntries));

console.log("Base (English): " + baseNames.size + " strings");

// Read base file raw content for copying
const baseRawContent = fs.readFileSync(baseFile, "utf-8");

const entries = fs.readdirSync(RES_DIR, { withFileTypes: true });
const localeDirs = entries
  .filter(function(e) { return e.isDirectory() && e.name.startsWith("values-"); })
  .map(function(e) { return e.name; });

var totalMissing = 0;
var coverageReport = [];

for (var i = 0; i < localeDirs.length; i++) {
  var dir = localeDirs[i];
  var locale = dir.replace("values-", "");
  var filePath = path.join(RES_DIR, dir, "strings.xml");

  if (!fs.existsSync(filePath)) {
    console.log("  " + locale + ": FILE NOT FOUND");
    continue;
  }

  var localeNames = getStringNames(filePath);
  var missingNames = [];
  baseNames.forEach(function(name) {
    if (!localeNames.has(name)) missingNames.push(name);
  });

  var pct = ((localeNames.size / baseNames.size) * 100).toFixed(1);

  coverageReport.push({ locale: locale, total: localeNames.size, missing: missingNames.length, pct: pct });

  if (missingNames.length > 0) {
    console.log("  " + locale + ": " + localeNames.size + "/" + baseNames.size + " (" + pct + "%) - " + missingNames.length + " missing");
    var content = fs.readFileSync(filePath, "utf-8");
    var closeTagPos = content.lastIndexOf("</resources>");
    if (closeTagPos === -1) {
      console.log("    SKIP: no </resources> tag");
      continue;
    }
    
    // Build insertion block - use raw XML from base file (already properly escaped)
    var insert = "\n    <!-- AUTO-FILLED English fallback — needs professional translation -->\n";
    for (var j = 0; j < missingNames.length; j++) {
      var key = missingNames[j];
      var entry = baseEntries[key];
      if (entry) {
        insert += "    <string name=\"" + key + "\">" + entry.raw + "</string>\n";
      } else {
        insert += "    <!-- <string name=\"" + key + "\"> MISSING IN BASE </string> -->\n";
      }
    }
    insert += "\n";
    
    var updated = content.slice(0, closeTagPos) + insert + content.slice(closeTagPos);
    fs.writeFileSync(filePath, updated, "utf-8");
    console.log("    -> Filled " + missingNames.length + " missing strings (raw XML from base)");
  } else {
    console.log("  " + locale + ": " + localeNames.size + "/" + baseNames.size + " (" + pct + "%) - COMPLETE");
  }
}

console.log("\n================================================");
console.log("Total missing strings filled: " + totalMissing);
console.log("================================================\n");

console.log("Coverage Report:");
console.log("====================================================================");
console.log("Locale".padEnd(15) + "Strings".padEnd(10) + "Missing".padEnd(10) + "Coverage");
console.log("--------------------------------------------------------------------");
console.log("en (base)".padEnd(15) + String(baseNames.size).padEnd(10) + "0".padEnd(10) + "100.0%");
for (var k = 0; k < coverageReport.length; k++) {
  var r = coverageReport[k];
  console.log(r.locale.padEnd(15) + String(r.total).padEnd(10) + String(r.missing).padEnd(10) + r.pct + "%");
}
console.log("--------------------------------------------------------------------");
console.log("\nNOTE: Filled strings are English fallbacks marked with AUTO-FILLED comment.");
console.log("Professional translation is needed for production use.");
