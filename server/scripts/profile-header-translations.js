const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const publicLocalesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    btn_sale_done: {
        en: "Sale Done",
        hi: "बिक्री पूर्ण",
        te: "అమ్మకం పూర్తయింది",
        ta: "விற்பனை முடிந்தது",
        kn: "ಮಾರಾಟ ಮುಗಿದಿದೆ",
        mr: "विक्री पूर्ण",
        bn: "বিক্রয় সম্পন্ন"
    },
    btn_sale_undone: {
        en: "Sale Undone",
        hi: "बिक्री रद्द",
        te: "అమ్మకం రద్దు చేయబడింది",
        ta: "விற்பனை ரத்து",
        kn: "ಮಾರಾಟ ರದ್ದುವಾಯಿತು",
        mr: "विक्री रद्द",
        bn: "বিক্রয় বাতিল"
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
            // Sort keys
            const sortedTranslations = {};
            Object.keys(translations).sort().forEach(key => {
                sortedTranslations[key] = translations[key];
            });

            fs.writeFileSync(filePath, JSON.stringify(sortedTranslations, null, 2));
            console.log(`Updated ${lang}.json in ${baseDir}`);
        } else {
            console.log(`No changes needed for ${lang}.json in ${baseDir}`);
        }
    });
}

console.log('Starting profile header translation updates...');
updateLocales(localesDir);
updateLocales(publicLocalesDir);
console.log('Translation updates complete!');
