// Script to clean up duplicate keys in locale JSON files
// Keeps the last occurrence of each key (most recent translation)
const fs = require('fs');
const path = require('path');

const localesDir = 'c:/Users/laksh/GITHUB/AG/Mhub/client/src/locales';
const files = ['en.json', 'ta.json', 'te.json', 'hi.json', 'mr.json', 'kn.json', 'bn.json'];

files.forEach(file => {
    const filePath = path.join(localesDir, file);

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Parse JSON - this will keep the last value for any duplicate keys automatically
        const parsed = JSON.parse(content);

        // Write back with proper formatting
        const cleaned = JSON.stringify(parsed, null, 2);
        fs.writeFileSync(filePath, cleaned, 'utf8');

        console.log(`Cleaned: ${file} - ${Object.keys(parsed).length} keys`);
    } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
    }
});

console.log('Done! All locale files cleaned.');
