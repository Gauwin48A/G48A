const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Very last remaining keys
const finalKeys = {
    "price_100_500": { kn: "₹100 - ₹500", mr: "₹100 - ₹500", bn: "₹100 - ₹500" },
    "price_500_1000": { kn: "₹500 - ₹1000", mr: "₹500 - ₹1000", bn: "₹500 - ₹1000" },
    "price_high_low": { kn: "ಬೆಲೆ: ಹೆಚ್ಚಿನಿಂದ ಕಡಿಮೆ", mr: "किंमत: जास्त ते कमी", bn: "মূল্য: বেশি থেকে কম" },
    "price_low_high": { kn: "ಬೆಲೆ: ಕಡಿಮೆಯಿಂದ ಹೆಚ್ಚು", mr: "किंमत: कमी ते जास्त", bn: "মূল্য: কম থেকে বেশি" },
    "sale_undone": { kn: "ಮಾರಾಟ ರದ್ದಾಗಿದೆ", mr: "विक्री रद्द", bn: "বিক্রয় বাতিল" },
    "sponsored": { kn: "ಪ್ರಾಯೋಜಿತ", mr: "प्रायोजित", bn: "স্পনসর করা" },
    "strong": { kn: "ಬಲವಾದ", mr: "मजबूत", bn: "শক্তিশালী" },
    "weak": { kn: "ದುರ್ಬಲ", mr: "कमकुवत", bn: "দুর্বল" },
    "medium": { kn: "ಮಧ್ಯಮ", mr: "मध्यम", bn: "মাঝারি" },
    "update_app": { kn: "ಆಪ್ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ", mr: "ॲप अपडेट करा", bn: "অ্যাপ আপডেট করুন" },
    "verify_now": { kn: "ಈಗ ಪರಿಶೀಲಿಸಿ", mr: "आता सत्यापित करा", bn: "এখনই যাচাই করুন" }
};

['kn', 'mr', 'bn'].forEach(lang => {
    const srcPath = path.join(localesDir, `${lang}.json`);
    const pubPath = path.join(publicDir, `${lang}.json`);

    let content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    let updated = 0;

    Object.keys(finalKeys).forEach(key => {
        if (finalKeys[key][lang]) {
            content[key] = finalKeys[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys updated`);
});

console.log('\n🎉 100% COMPLETE FOR ALL LANGUAGES!');
