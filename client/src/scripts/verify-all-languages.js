const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const enKeys = Object.keys(en).sort();

console.log('=== Translation Readiness Report ===\n');
console.log(`Base Language (EN): ${enKeys.length} keys`);

languages.filter(l => l !== 'en').forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = Object.keys(content);

    // Find missing keys
    const missing = enKeys.filter(k => !keys.includes(k));

    // Find potential English placeholders (value is same as English value, longer than 3 chars to avoid 'No', 'Ok', etc false positives)
    const suspicious = keys.filter(k => {
        // Ignore if key is not in EN (custom key?)
        if (!en[k]) return false;
        // Ignore short strings
        if (en[k].length < 3) return false;
        // Ignore if identical
        return content[k] === en[k];
    });

    // Calculate coverage
    const coverage = Math.round(((enKeys.length - missing.length) / enKeys.length) * 100);

    console.log(`\n[${lang.toUpperCase()}] Coverage: ${coverage}%`);
    console.log(`Total Keys: ${keys.length}`);

    if (missing.length > 0) {
        console.log(`Missing Keys (${missing.length}): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    } else {
        console.log(`Missing Keys: 0 (Perfect Match)`);
    }

    if (suspicious.length > 0) {
        if (suspicious.length > 20) {
            console.log(`Suspicious (Potential English) Values: ${suspicious.length} keys (e.g. ${suspicious.slice(0, 3).join(', ')})`);
            // Check a few examples
            const examples = suspicious.slice(0, 3).map(k => `${k}: "${content[k]}"`).join('\n   ');
            console.log(`   Examples:\n   ${examples}`);
        } else {
            console.log(`Suspicious (Potential English) Values: ${suspicious.join(', ')}`);
        }
    } else {
        console.log(`Suspicious Values: 0`);
    }
});
