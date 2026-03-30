const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Very last remaining translations
const lastKeys = {
    "name_placeholder": { kn: "ಹೆಸರು", mr: "नाव", bn: "নাম" },
    "pan_placeholder": { kn: "PAN ಸಂಖ್ಯೆ", mr: "PAN क्रमांक", bn: "PAN নম্বর" },
    "password_placeholder": { kn: "ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ", mr: "पासवर्ड तयार करा", bn: "পাসওয়ার্ড তৈরি করুন" },
    "password_strength": { kn: "ಪಾಸ್‌ವರ್ಡ್ ಶಕ್ತಿ", mr: "पासवर्ड शक्ती", bn: "পাসওয়ার্ডের শক্তি" },
    "post_id": { kn: "ಪೋಸ್ಟ್ ಐಡಿ", mr: "पोस्ट आयडी", bn: "পোস্ট আইডি" },
    "profile_subtitle": { kn: "ನಿಮ್ಮ ಖಾತೆ ವಿವರಗಳನ್ನು ನಿರ್ವಹಿಸಿ", mr: "तुमच्या खात्याचे तपशील व्यवस्थापित करा", bn: "আপনার অ্যাকাউন্ট বিবরণ পরিচালনা করুন" },
    "referral_placeholder": { kn: "ರೆಫರಲ್ ಕೋಡ್ (ಐಚ್ಛಿಕ)", mr: "रेफरल कोड (पर्यायी)", bn: "রেফারেল কোড (ঐচ্ছিক)" },
    "saved_searches": { kn: "ಉಳಿಸಿದ ಹುಡುಕಾಟಗಳು", mr: "जतन केलेले शोध", bn: "সংরক্ষিত অনুসন্ধান" },
    "seller_id": { kn: "ಮಾರಾಟಗಾರ ಐಡಿ", mr: "विक्रेता आयडी", bn: "বিক্রেতা আইডি" },
    "session_expired": { kn: "ಸೆಷನ್ ಮುಗಿದಿದೆ", mr: "सत्र संपले", bn: "সেশন শেষ" },
    "share_link": { kn: "ಲಿಂಕ್ ಹಂಚಿಕೊಳ್ಳಿ", mr: "लिंक शेअर करा", bn: "লিংক শেয়ার করুন" },
    "show_less": { kn: "ಕಡಿಮೆ ತೋರಿಸಿ", mr: "कमी दाखवा", bn: "কম দেখান" },
    "show_more": { kn: "ಇನ್ನಷ್ಟು ತೋರಿಸಿ", mr: "अधिक दाखवा", bn: "আরও দেখান" },
    "skip": { kn: "ಬಿಟ್ಟುಬಿಡಿ", mr: "वगळा", bn: "এড়িয়ে যান" },
    "special_offer": { kn: "ವಿಶೇಷ ಆಫರ್", mr: "विशेष ऑफर", bn: "বিশেষ অফার" },
    "user_id": { kn: "ಬಳಕೆದಾರ ಐಡಿ", mr: "वापरकर्ता आयडी", bn: "ইউজার আইডি" },
    "view_profile": { kn: "ಪ್ರೊಫೈಲ್ ವೀಕ್ಷಿಸಿ", mr: "प्रोफाइल पहा", bn: "প্রোফাইল দেখুন" },
    "warranty": { kn: "ವಾರಂಟಿ", mr: "वॉरंटी", bn: "ওয়ারেন্টি" },
    "year": { kn: "ವರ್ಷ", mr: "वर्ष", bn: "বছর" }
};

['kn', 'mr', 'bn'].forEach(lang => {
    const srcPath = path.join(localesDir, `${lang}.json`);
    const pubPath = path.join(publicDir, `${lang}.json`);

    let content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    let updated = 0;

    Object.keys(lastKeys).forEach(key => {
        if (lastKeys[key][lang]) {
            content[key] = lastKeys[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys updated`);
});

console.log('\n✅ 100% Complete!');
