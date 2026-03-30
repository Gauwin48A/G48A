const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Additional missing keys
const additionalTranslations = {
    // UI Selection
    "select_all": { en: "Select All", hi: "सभी चुनें", te: "అన్నీ ఎంచుకోండి", ta: "அனைத்தையும் தேர்ந்தெடு", kn: "ಎಲ್ಲಾ ಆಯ್ಕೆಮಾಡಿ", mr: "सर्व निवडा", bn: "সব নির্বাচন করুন" },
    "deselect_all": { en: "Deselect All", hi: "सभी हटाएं", te: "అన్నీ తీసివేయండి", ta: "அனைத்தையும் நீக்கு", kn: "ಎಲ್ಲಾ ಆಯ್ಕೆ ರದ್ದುಮಾಡಿ", mr: "सर्व निवड काढा", bn: "সব নির্বাচন বাতিল করুন" },
    "of": { en: "of", hi: "का", te: "యొక్క", ta: "இல்", kn: "ಒಟ್ಟು", mr: "पैकी", bn: "এর মধ্যে" },
    "selected": { en: "selected", hi: "चयनित", te: "ఎంపిక చేయబడింది", ta: "தேர்ந்தெடுக்கப்பட்டது", kn: "ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ", mr: "निवडलेले", bn: "নির্বাচিত" },
    "start_selling": { en: "Start selling by creating your first listing!", hi: "अपनी पहली लिस्टिंग बनाकर बिक्री शुरू करें!", te: "మీ మొదటి లిస్టింగ్ సృష్టించి అమ్మకం ప్రారంభించండి!", ta: "உங்கள் முதல் பட்டியலை உருவாக்கி விற்பனையைத் தொடங்குங்கள்!", kn: "ನಿಮ್ಮ ಮೊದಲ ಪಟ್ಟಿಯನ್ನು ರಚಿಸಿ ಮಾರಾಟ ಪ್ರಾರಂಭಿಸಿ!", mr: "तुमची पहिली लिस्टिंग तयार करून विक्री सुरू करा!", bn: "আপনার প্রথম তালিকা তৈরি করে বিক্রি শুরু করুন!" },
    "create_new_listing": { en: "Create New Listing", hi: "नई लिस्टिंग बनाएं", te: "కొత్త లిస్టింగ్ సృష్టించండి", ta: "புதிய பட்டியலை உருவாக்கு", kn: "ಹೊಸ ಪಟ್ಟಿ ರಚಿಸಿ", mr: "नवीन लिस्टिंग तयार करा", bn: "নতুন তালিকা তৈরি করুন" },

    // Rewards Page Specific
    "daily_challenges": { en: "Daily Challenges", hi: "दैनिक चुनौतियां", te: "రోజువారీ ఛాలెంజ్‌లు", ta: "தினசரி சவால்கள்", kn: "ದೈನಿಕ ಸವಾಲುಗಳು", mr: "दैनिक आव्हाने", bn: "দৈনিক চ্যালেঞ্জ" },
    "your_referral_code": { en: "Your Referral Code", hi: "आपका रेफरल कोड", te: "మీ రెఫరల్ కోడ్", ta: "உங்கள் பரிந்துரை குறியீடு", kn: "ನಿಮ್ಮ ರೆಫರಲ್ ಕೋಡ್", mr: "तुमचा रेफरल कोड", bn: "আপনার রেফারেল কোড" },
    "daily_reward_code": { en: "Daily Reward Code", hi: "दैनिक इनाम कोड", te: "రోజువారీ రివార్డ్ కోడ్", ta: "தினசரி வெகுமதி குறியீடு", kn: "ದೈನಿಕ ರಿವಾರ್ಡ್ ಕೋಡ್", mr: "दैनिक बक्षीस कोड", bn: "দৈনিক পুরস্কার কোড" },
    "share_and_earn": { en: "Share and earn rewards", hi: "शेयर करें और इनाम कमाएं", te: "షేర్ చేసి రివార్డ్లు సంపాదించండి", ta: "பகிர்ந்து வெகுமதிகளைப் பெறுங்கள்", kn: "ಹಂಚಿಕೊಳ್ಳಿ ಮತ್ತು ರಿವಾರ್ಡ್ಗಳನ್ನು ಗಳಿಸಿ", mr: "शेअर करा आणि बक्षिसे मिळवा", bn: "শেয়ার করুন এবং পুরস্কার অর্জন করুন" },
    "copy_and_share": { en: "Copy & Share", hi: "कॉपी और शेयर करें", te: "కాపీ చేసి షేర్ చేయండి", ta: "நகலெடுத்து பகிரவும்", kn: "ಕಾಪಿ ಮತ್ತು ಹಂಚಿಕೊಳ್ಳಿ", mr: "कॉपी आणि शेअर करा", bn: "কপি এবং শেয়ার করুন" },
    "claim_daily_bonus": { en: "Claim to get bonus", hi: "बोनस पाने के लिए दावा करें", te: "బోనస్ పొందడానికి క్లెయిమ్ చేయండి", ta: "போனஸ் பெற கோருங்கள்", kn: "ಬೋನಸ್ ಪಡೆಯಲು ಕ್ಲೈಮ್ ಮಾಡಿ", mr: "बोनस मिळवण्यासाठी दावा करा", bn: "বোনাস পেতে দাবি করুন" },
    "overview": { en: "Overview", hi: "अवलोकन", te: "అవలోకనం", ta: "மேலோட்டம்", kn: "ಅವಲೋಕನ", mr: "विहंगावलोकन", bn: "সংক্ষিপ্ত বিবরণ" },
    "referrals": { en: "Referrals", hi: "रेफरल", te: "రెఫరల్స్", ta: "பரிந்துரைகள்", kn: "ರೆಫರಲ್ಸ್", mr: "रेफरल्स", bn: "রেফারেল" },
    "milestones": { en: "Milestones", hi: "माइलस्टोन", te: "మైలురాళ్ళు", ta: "மைல்கற்கள்", kn: "ಮೈಲಿಗಲ್ಲುಗಳು", mr: "टप्पे", bn: "মাইলস্টোন" },
    "total_rewards": { en: "Total Rewards", hi: "कुल इनाम", te: "మొత్తం రివార్డ్లు", ta: "மொத்த வெகுமதிகள்", kn: "ಒಟ್ಟು ರಿವಾರ್ಡ್ಗಳು", mr: "एकूण बक्षिसे", bn: "মোট পুরস্কার" },
    "total_referrals": { en: "Total Referrals", hi: "कुल रेफरल", te: "మొత్తం రెఫరల్స్", ta: "மொத்த பரிந்துரைகள்", kn: "ಒಟ್ಟು ರೆಫರಲ್ಗಳು", mr: "एकूण रेफरल", bn: "মোট রেফারেল" },
    "bonus_coins": { en: "Bonus Coins", hi: "बोनस सिक्के", te: "బోనస్ నాణేలు", ta: "போனஸ் நாணயங்கள்", kn: "ಬೋನಸ್ ನಾಣ್ಯಗಳು", mr: "बोनस नाणी", bn: "বোনাস কয়েন" },
    "active_offers": { en: "Active Offers", hi: "सक्रिय ऑफर", te: "యాక్టివ్ ఆఫర్లు", ta: "செயலில் உள்ள சலுகைகள்", kn: "ಸಕ್ರಿಯ ಆಫರ್‌ಗಳು", mr: "सक्रिय ऑफर", bn: "সক্রিয় অফার" },

    // Pagination
    "page": { en: "Page", hi: "पृष्ठ", te: "పేజీ", ta: "பக்கம்", kn: "ಪುಟ", mr: "पृष्ठ", bn: "পৃষ্ঠা" },

    // Previous/Next already added but make sure
    "previous": { en: "Previous", hi: "पिछला", te: "మునుపటి", ta: "முந்தைய", kn: "ಹಿಂದಿನ", mr: "मागील", bn: "পূর্ববর্তী" },
    "next": { en: "Next", hi: "अगला", te: "తదుపరి", ta: "அடுத்த", kn: "ಮುಂದಿನ", mr: "पुढील", bn: "পরবর্তী" },

    // Common Actions
    "view_all": { en: "View All", hi: "सभी देखें", te: "అన్నీ చూడండి", ta: "அனைத்தையும் காண்க", kn: "ಎಲ್ಲಾ ವೀಕ್ಷಿಸಿ", mr: "सर्व पहा", bn: "সব দেখুন" },
    "learn_more": { en: "Learn More", hi: "और जानें", te: "మరింత తెలుసుకోండి", ta: "மேலும் அறிக", kn: "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ", mr: "अधिक जाणून घ्या", bn: "আরও জানুন" },
    "get_started": { en: "Get Started", hi: "शुरू करें", te: "ప్రారంభించండి", ta: "தொடங்குங்கள்", kn: "ಪ್ರಾರಂಭಿಸಿ", mr: "सुरू करा", bn: "শুরু করুন" },
    "explore": { en: "Explore", hi: "खोजें", te: "అన్వేషించండి", ta: "ஆராயுங்கள்", kn: "ಅನ್ವೇಷಿಸಿ", mr: "एक्सप्लोर करा", bn: "অন্বেষণ করুন" },
    "browse": { en: "Browse", hi: "ब्राउज़ करें", te: "బ్రౌజ్ చేయండి", ta: "உலாவுக", kn: "ಬ್ರೌಸ್ ಮಾಡಿ", mr: "ब्राउझ करा", bn: "ব্রাউজ করুন" },
    "refresh": { en: "Refresh", hi: "रिफ्रेश करें", te: "రిఫ్రెష్ చేయండి", ta: "புதுப்பிக்கவும்", kn: "ರಿಫ್ರೆಶ್ ಮಾಡಿ", mr: "रिफ्रेश करा", bn: "রিফ্রেশ করুন" }
};

// Update all locale files
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

languages.forEach(lang => {
    const srcPath = path.join(localesDir, `${lang}.json`);
    const pubPath = path.join(publicDir, `${lang}.json`);

    let content = {};
    try {
        content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    } catch (e) {
        console.log(`Creating new ${lang}.json`);
    }

    let updated = 0;

    Object.keys(additionalTranslations).forEach(key => {
        if (additionalTranslations[key][lang]) {
            content[key] = additionalTranslations[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys added/updated`);
});

console.log('\n✅ Additional translations complete!');
