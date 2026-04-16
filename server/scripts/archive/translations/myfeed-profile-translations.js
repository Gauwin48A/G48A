const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Additional missing translations
const translations = {
    // MyFeed Page
    "my_feed": { en: "My Feed", hi: "मेरी फ़ीड", te: "నా ఫీడ్", ta: "என் ஊட்டம்", kn: "ನನ್ನ ಫೀಡ್", mr: "माझी फीड", bn: "আমার ফিড" },
    "view_manage_posts": { en: "View and manage your posts", hi: "अपनी पोस्ट देखें और प्रबंधित करें", te: "మీ పోస్ట్‌లను చూడండి మరియు నిర్వహించండి", ta: "உங்கள் இடுகைகளைப் பார்த்து நிர்வகிக்கவும்", kn: "ನಿಮ್ಮ ಪೋಸ್ಟ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ", mr: "तुमच्या पोस्ट पहा आणि व्यवस्थापित करा", bn: "আপনার পোস্ট দেখুন এবং পরিচালনা করুন" },
    "posts": { en: "Posts", hi: "पोस्ट", te: "పోస్ట్‌లు", ta: "இடுகைகள்", kn: "ಪೋಸ್ಟ್‌ಗಳು", mr: "पोस्ट", bn: "পোস্ট" },
    "no_posts_yet": { en: "You haven't posted anything yet", hi: "आपने अभी तक कुछ भी पोस्ट नहीं किया है", te: "మీరు ఇంకా ఏమీ పోస్ట్ చేయలేదు", ta: "நீங்கள் இன்னும் எதையும் பதிவிடவில்லை", kn: "ನೀವು ಇನ್ನೂ ಏನನ್ನೂ ಪೋಸ್ಟ್ ಮಾಡಿಲ್ಲ", mr: "तुम्ही अद्याप काहीही पोस्ट केले नाही", bn: "আপনি এখনও কিছু পোস্ট করেননি" },
    "share_first": { en: "Share your first update with the community!", hi: "समुदाय के साथ अपना पहला अपडेट साझा करें!", te: "సమాజంతో మీ మొదటి అప్‌డేట్ షేర్ చేయండి!", ta: "சமூகத்துடன் உங்கள் முதல் புதுப்பிப்பைப் பகிரவும்!", kn: "ಸಮುದಾಯದೊಂದಿಗೆ ನಿಮ್ಮ ಮೊದಲ ಅಪ್‌ಡೇಟ್ ಹಂಚಿಕೊಳ್ಳಿ!", mr: "समुदायासह तुमचे पहिले अपडेट शेअर करा!", bn: "সম্প্রদায়ের সাথে আপনার প্রথম আপডেট শেয়ার করুন!" },
    "create_first": { en: "Create Your First Post", hi: "अपनी पहली पोस्ट बनाएं", te: "మీ మొదటి పోస్ట్ సృష్టించండి", ta: "உங்கள் முதல் இடுகையை உருவாக்கவும்", kn: "ನಿಮ್ಮ ಮೊದಲ ಪೋಸ್ಟ್ ರಚಿಸಿ", mr: "तुमची पहिली पोस्ट तयार करा", bn: "আপনার প্রথম পোস্ট তৈরি করুন" },
    "view_more": { en: "View more", hi: "और देखें", te: "మరిన్ని చూడండి", ta: "மேலும் பார்க்க", kn: "ಇನ್ನಷ್ಟು ನೋಡಿ", mr: "अधिक पहा", bn: "আরো দেখুন" },
    "view_less": { en: "View less", hi: "कम देखें", te: "తక్కువ చూడండి", ta: "குறைவாகப் பார்", kn: "ಕಡಿಮೆ ನೋಡಿ", mr: "कमी पहा", bn: "কম দেখুন" },
    "thats_all": { en: "That's all your posts", hi: "ये आपकी सभी पोस्ट हैं", te: "ఇవి మీ అన్ని పోస్ట్‌లు", ta: "இவை உங்கள் அனைத்து இடுகைகளும்", kn: "ಇವು ನಿಮ್ಮ ಎಲ್ಲಾ ಪೋಸ್ಟ್‌ಗಳು", mr: "या तुमच्या सर्व पोस्ट आहेत", bn: "এগুলো আপনার সব পোস্ট" },
    "delete": { en: "Delete", hi: "हटाएं", te: "తొలగించు", ta: "நீக்கு", kn: "ಅಳಿಸಿ", mr: "हटवा", bn: "মুছুন" },
    "delete_confirm": { en: "This action cannot be undone.", hi: "इस क्रिया को वापस नहीं किया जा सकता।", te: "ఈ చర్యను రద్దు చేయడం సాధ్యం కాదు.", ta: "இந்த செயலை மாற்ற முடியாது.", kn: "ಈ ಕ್ರಿಯೆಯನ್ನು ರದ್ದುಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.", mr: "ही क्रिया परत करता येत नाही.", bn: "এই ক্রিয়াটি পূর্বাবস্থায় ফেরানো যাবে না।" },

    // Dashboard badges that might be missing
    "new_seller": { en: "New Seller", hi: "नया विक्रेता", te: "కొత్త విక్రేత", ta: "புதிய விற்பனையாளர்", kn: "ಹೊಸ ಮಾರಾಟಗಾರ", mr: "नवीन विक्रेता", bn: "নতুন বিক্রেতা" },

    // Language
    "language": { en: "Language", hi: "भाषा", te: "భాష", ta: "மொழி", kn: "ಭಾಷೆ", mr: "भाषा", bn: "ভাষা" },
    "choose_language": { en: "Choose your preferred language", hi: "अपनी पसंदीदा भाषा चुनें", te: "మీ ఇష్టమైన భాషను ఎంచుకోండి", ta: "உங்களுக்கு விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்", kn: "ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ", mr: "तुमची पसंतीची भाषा निवडा", bn: "আপনার পছন্দের ভাষা নির্বাচন করুন" },

    // Danger zone
    "danger_zone": { en: "Danger Zone", hi: "खतरनाक क्षेत्र", te: "ప్రమాదకర జోన్", ta: "ஆபத்து மண்டலம்", kn: "ಅಪಾಯ ವಲಯ", mr: "धोक्याचे क्षेत्र", bn: "বিপজ্জনক জোন" },
    "delete_account_desc": { en: "Delete your account permanently", hi: "अपना खाता स्थायी रूप से हटाएं", te: "మీ ఖాతాను శాశ్వతంగా తొలగించండి", ta: "உங்கள் கணக்கை நிரந்தரமாக நீக்கவும்", kn: "ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಿ", mr: "तुमचे खाते कायमचे हटवा", bn: "আপনার অ্যাকাউন্ট স্থায়ীভাবে মুছুন" },
    "delete_account": { en: "Delete Account", hi: "खाता हटाएं", te: "ఖాతా తొలగించు", ta: "கணக்கை நீக்கு", kn: "ಖಾತೆ ಅಳಿಸಿ", mr: "खाते हटवा", bn: "অ্যাকাউন্ট মুছুন" }
};

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
    Object.keys(translations).forEach(key => {
        if (translations[key][lang] && !content[key]) {
            content[key] = translations[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} new keys added (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ MyFeed and Profile additional translations added!');
