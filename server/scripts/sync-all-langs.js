const fs = require('fs');

const enPath = 'client/src/locales/en.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// All language files to sync
const langs = ['ta', 'te', 'hi', 'bn', 'kn', 'mr'];

langs.forEach(lang => {
    const langPath = `client/src/locales/${lang}.json`;
    try {
        const data = JSON.parse(fs.readFileSync(langPath, 'utf8'));
        let added = 0;

        Object.keys(en).forEach(key => {
            if (!data[key]) {
                data[key] = en[key]; // Use English as placeholder
                added++;
            }
        });

        // Sort and save
        const sorted = {};
        Object.keys(data).sort().forEach(k => sorted[k] = data[k]);
        fs.writeFileSync(langPath, JSON.stringify(sorted, null, 2));
        console.log(`${lang}.json: Added ${added} keys, Total: ${Object.keys(sorted).length}`);
    } catch (e) {
        console.log(`${lang}.json: Error - ${e.message}`);
    }
});
