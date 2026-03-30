const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Ultimate final keys
const ultimateFinal = {
    "showing": { kn: "ತೋರಿಸುತ್ತಿದೆ", mr: "दाखवत आहे", bn: "দেখাচ্ছে" },
    "smart_watches": { kn: "ಸ್ಮಾರ್ಟ್ ವಾಚ್‌ಗಳು", mr: "स्मार्टवॉच", bn: "স্মার্ট ওয়াচ" },
    "total_likes": { kn: "ಒಟ್ಟು ಇಷ್ಟಗಳು", mr: "एकूण आवडी", bn: "মোট পছন্দ" },
    "total_posts": { kn: "ಒಟ್ಟು ಪೋಸ್ಟ್‌ಗಳು", mr: "एकूण पोस्ट", bn: "মোট পোস্ট" },
    "total_views": { kn: "ಒಟ್ಟು ವೀಕ್ಷಣೆಗಳು", mr: "एकूण दृश्ये", bn: "মোট ভিউ" },
    "verified_user": { kn: "ಪರಿಶೀಲಿಸಿದ ಬಳಕೆದಾರ", mr: "सत्यापित वापरकर्ता", bn: "যাচাইকৃত ব্যবহারকারী" },
    "watch": { kn: "ವಾಚ್", mr: "घड्याळ", bn: "ঘড়ি" },
    "wishlist_subtitle": { kn: "ನಿಮ್ಮ ಉಳಿಸಿದ ವಸ್ತುಗಳು", mr: "तुमचे जतन केलेले आयटम", bn: "আপনার সংরক্ষিত আইটেম" }
};

['kn', 'mr', 'bn'].forEach(lang => {
    const srcPath = path.join(localesDir, `${lang}.json`);
    const pubPath = path.join(publicDir, `${lang}.json`);

    let content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    let updated = 0;

    Object.keys(ultimateFinal).forEach(key => {
        if (ultimateFinal[key][lang]) {
            content[key] = ultimateFinal[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys updated`);
});

console.log('\n🏆 TRANSLATION COMPLETE!');
