const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const enKeys = Object.keys(en).sort();

const reportFile = 'verification_report.txt';
fs.writeFileSync(reportFile, '=== Translation Readiness Report ===\n\n');
fs.appendFileSync(reportFile, `Base Language (EN): ${enKeys.length} keys\n`);

languages.filter(l => l !== 'en').forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = Object.keys(content);

    // Find missing keys
    const missing = enKeys.filter(k => !keys.includes(k));

    // Find potential English placeholders
    const suspicious = keys.filter(k => {
        // Ignore if key is not in EN (custom key?)
        if (!en[k]) return false;
        // Ignore short strings and numbers
        if (en[k].length < 3 || /^\d+$/.test(en[k])) return false;
        // Ignore if identical
        return content[k] === en[k];
    });

    // Calculate true translated percentage (total - matches English)
    const translatedCount = enKeys.length - missing.length - suspicious.length;
    const translationPercent = Math.round((translatedCount / enKeys.length) * 100);

    fs.appendFileSync(reportFile, `\n[${lang.toUpperCase()}] Translated: ${translationPercent}%\n`);
    fs.appendFileSync(reportFile, `Total Keys: ${keys.length}\n`);
    fs.appendFileSync(reportFile, `Untranslated (English): ${suspicious.length} keys\n`);

    if (missing.length > 0) {
        fs.appendFileSync(reportFile, `Missing Keys (${missing.length}): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}\n`);
    } else {
        fs.appendFileSync(reportFile, `Missing Keys: 0 (Key synced)\n`);
    }

    if (suspicious.length > 0) {
        const examples = suspicious.slice(0, 5).map(k => `   ${k}: "${content[k]}"`).join('\n');
        fs.appendFileSync(reportFile, `   Examples of Untranslated:\n${examples}\n`);
    }
});

console.log('Report generated: verification_report.txt');
