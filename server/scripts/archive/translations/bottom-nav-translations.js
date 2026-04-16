const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const publicLocalesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    for_you: {
        en: "For You",
        hi: "आपके लिए",
        te: "మీ కోసం",
        ta: "உங்களுக்காக",
        kn: "ನಿಮಗಾಗಿ",
        mr: "तुमच्यासाठी",
        bn: "আপনার জন্য"
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

console.log('Starting bottom nav translation updates...');
updateLocales(localesDir);
updateLocales(publicLocalesDir);
console.log('Translation updates complete!');
