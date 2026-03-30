const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const publicLocalesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    back_to_profile: {
        en: "Back to Profile",
        hi: "प्रोफ़ाइल पर वापस जाएं",
        te: "ప్రొఫైల్‌కు తిరిగి వెళ్లు",
        ta: "சுயவிவரத்திற்குத் திரும்புக",
        kn: "ಪ್ರೊಫೈಲ್‌ಗೆ ಹಿಂತಿರುಗಿ",
        mr: "प्रोफाईलवर परत जा",
        bn: "প্রোফাইলে ফিরে যান"
    }
};

function updateLocales(baseDir) {
    if (!fs.existsSync(baseDir)) {
        console.log(`Directory not found: ${baseDir}`);
        return;
    }

    languages.forEach(lang => {
        const filePath = path.join(baseDir, `${lang}.json`);
        let translations = {};

        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                translations = JSON.parse(fileContent);
            } catch (e) {
                console.error(`Error reading ${filePath}:`, e.message);
            }
        }

        let updated = false;
        Object.keys(newKeys).forEach(key => {
            if (!translations[key]) {
                translations[key] = newKeys[key][lang];
                updated = true;
            }
        });

        if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
            console.log(`Updated ${lang}.json in ${baseDir}`);
        } else {
            console.log(`No changes needed for ${lang}.json in ${baseDir}`);
        }
    });
}

console.log('Starting back_to_profile translation updates...');
updateLocales(localesDir);
updateLocales(publicLocalesDir);
console.log('Translation updates complete!');
