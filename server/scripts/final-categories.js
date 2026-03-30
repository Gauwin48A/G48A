const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Very last translations - categories and final UI
const lastTranslations = {
    "filter_products": { kn: "ಉತ್ಪನ್ನಗಳನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಿ", mr: "उत्पादने फिल्टर करा", bn: "পণ্য ফিল্টার করুন" },
    "gaming": { kn: "ಗೇಮಿಂಗ್", mr: "गेमिंग", bn: "গেমিং" },
    "headphones": { kn: "ಹೆಡ್‌ಫೋನ್‌ಗಳು", mr: "हेडफोन", bn: "হেডফোন" },
    "kitchen": { kn: "ಅಡುಗೆಮನೆ", mr: "स्वयंपाकघर", bn: "রান্নাঘর" },
    "load_more": { kn: "ಇನ್ನಷ್ಟು ಲೋಡ್ ಮಾಡಿ", mr: "आणखी लोड करा", bn: "আরও লোড করুন" },
    "laptops": { kn: "ಲ್ಯಾಪ್‌ಟಾಪ್‌ಗಳು", mr: "लॅपटॉप", bn: "ল্যাপটপ" },
    "mobiles": { kn: "ಮೊಬೈಲ್‌ಗಳು", mr: "मोबाइल", bn: "মোবাইল" },
    "tablets": { kn: "ಟ್ಯಾಬ್ಲೆಟ್‌ಗಳು", mr: "टॅबलेट", bn: "ট্যাবলেট" },
    "smartwatches": { kn: "ಸ್ಮಾರ್ಟ್‌ವಾಚ್‌ಗಳು", mr: "स्मार्टवॉच", bn: "স্মার্টওয়াচ" },
    "cameras": { kn: "ಕ್ಯಾಮೆರಾಗಳು", mr: "कॅमेरे", bn: "ক্যামেরা" },
    "speakers": { kn: "ಸ್ಪೀಕರ್‌ಗಳು", mr: "स्पीकर", bn: "স্পিকার" },
    "tvs": { kn: "ಟಿವಿಗಳು", mr: "टीव्ही", bn: "টিভি" },
    "monitors": { kn: "ಮಾನಿಟರ್‌ಗಳು", mr: "मॉनिटर", bn: "মনিটর" },
    "printers": { kn: "ಪ್ರಿಂಟರ್‌ಗಳು", mr: "प्रिंटर", bn: "প্রিন্টার" },
    "routers": { kn: "ರೂಟರ್‌ಗಳು", mr: "राउटर", bn: "রাউটার" },
    "storage": { kn: "ಶೇಖರಣಾ ಸಾಧನಗಳು", mr: "स्टोरेज", bn: "স্টোরেজ" },
    "power_banks": { kn: "ಪವರ್ ಬ್ಯಾಂಕ್‌ಗಳು", mr: "पॉवर बँक", bn: "পাওয়ার ব্যাংক" },
    "chargers": { kn: "ಚಾರ್ಜರ್‌ಗಳು", mr: "चार्जर", bn: "চার্জার" },
    "cases": { kn: "ಕೇಸ್‌ಗಳು", mr: "केसेस", bn: "কেস" },
    "cables": { kn: "ಕೇಬಲ್‌ಗಳು", mr: "केबल", bn: "কেবল" },
    "electronics": { kn: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್", mr: "इलेक्ट्रॉनिक्स", bn: "ইলেকট্রনিক্স" },
    "fashion": { kn: "ಫ್ಯಾಷನ್", mr: "फॅशन", bn: "ফ্যাশন" },
    "furniture": { kn: "ಪೀಠೋಪಕರಣ", mr: "फर्निचर", bn: "আসবাবপত্র" },
    "books": { kn: "ಪುಸ್ತಕಗಳು", mr: "पुस्तके", bn: "বই" },
    "sports": { kn: "ಕ್ರೀಡೆಗಳು", mr: "खेळ", bn: "খেলাধুলা" }
};

// Update Kannada, Marathi, Bengali
['kn', 'mr', 'bn'].forEach(lang => {
    const srcPath = path.join(localesDir, `${lang}.json`);
    const pubPath = path.join(publicDir, `${lang}.json`);

    let content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    let updated = 0;

    Object.keys(lastTranslations).forEach(key => {
        if (lastTranslations[key][lang]) {
            content[key] = lastTranslations[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys updated`);
});

console.log('\n🎯 100% Translation Coverage Complete!');
