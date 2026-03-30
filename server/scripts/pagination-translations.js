const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

/*
 * PAGINATION & REMAINING UI TRANSLATIONS
 */

const translations = {
    // Pagination
    "previous": {
        en: "Previous",
        hi: "पिछला",
        te: "మునుపటి",
        ta: "முந்தைய",
        kn: "ಹಿಂದಿನ",
        mr: "मागील",
        bn: "আগের"
    },
    "next": {
        en: "Next",
        hi: "अगला",
        te: "తదుపరి",
        ta: "அடுத்து",
        kn: "ಮುಂದಿನ",
        mr: "पुढील",
        bn: "পরবর্তী"
    },
    "page": {
        en: "Page",
        hi: "पेज",
        te: "పేజీ",
        ta: "பக்கம்",
        kn: "ಪುಟ",
        mr: "पृष्ठ",
        bn: "পেজ"
    },
    "of": {
        en: "of",
        hi: "का",
        te: "లో",
        ta: "இல்",
        kn: "ರಲ್ಲಿ",
        mr: "पैकी",
        bn: "এর"
    },

    // Common labels still in English
    "first": {
        en: "First",
        hi: "पहला",
        te: "మొదటి",
        ta: "முதல்",
        kn: "ಮೊದಲ",
        mr: "पहिले",
        bn: "প্রথম"
    },
    "last": {
        en: "Last",
        hi: "अंतिम",
        te: "చివరి",
        ta: "கடைசி",
        kn: "ಕೊನೆಯ",
        mr: "शेवटचे",
        bn: "শেষ"
    },
    "showing": {
        en: "Showing",
        hi: "दिखा रहे हैं",
        te: "చూపిస్తోంది",
        ta: "காட்டுகிறது",
        kn: "ತೋರಿಸುತ್ತಿದೆ",
        mr: "दाखवत आहे",
        bn: "দেখাচ্ছে"
    },
    "results": {
        en: "results",
        hi: "परिणाम",
        te: "ఫలితాలు",
        ta: "முடிவுகள்",
        kn: "ಫಲಿತಾಂಶಗಳು",
        mr: "परिणाम",
        bn: "ফলাফল"
    },
    "per_page": {
        en: "per page",
        hi: "प्रति पृष्ठ",
        te: "పేజీకి",
        ta: "ஒரு பக்கத்திற்கு",
        kn: "ಪ್ರತಿ ಪುಟಕ್ಕೆ",
        mr: "प्रति पृष्ठ",
        bn: "প্রতি পেজে"
    },

    // Filter/Sort labels
    "sort_by": {
        en: "Sort by",
        hi: "क्रमबद्ध करें",
        te: "క్రమబద్ధీకరణ",
        ta: "வரிசைப்படுத்து",
        kn: "ಕ್ರಮಬದ್ಧಗೊಳಿಸಿ",
        mr: "क्रमवारी लावा",
        bn: "সাজান"
    },
    "filter": {
        en: "Filter",
        hi: "फ़िल्टर",
        te: "ఫిల్టర్",
        ta: "வடிகட்டு",
        kn: "ಫಿಲ್ಟರ್",
        mr: "फिल्टर",
        bn: "ফিল্টার"
    },
    "clear_all": {
        en: "Clear All",
        hi: "सब साफ़ करें",
        te: "అన్నీ క్లియర్ చేయండి",
        ta: "அனைத்தையும் அழி",
        kn: "ಎಲ್ಲಾ ತೆರವುಗೊಳಿಸಿ",
        mr: "सर्व साफ करा",
        bn: "সব পরিষ্কার করুন"
    },
    "apply": {
        en: "Apply",
        hi: "लागू करें",
        te: "వర్తింపజేయండి",
        ta: "பயன்படுத்து",
        kn: "ಅನ್ವಯಿಸಿ",
        mr: "लागू करा",
        bn: "প্রয়োগ করুন"
    },
    "reset": {
        en: "Reset",
        hi: "रीसेट करें",
        te: "రీసెట్ చేయండి",
        ta: "மீட்டமை",
        kn: "ಮರುಹೊಂದಿಸಿ",
        mr: "रीसेट करा",
        bn: "রিসেট করুন"
    },

    // Status messages
    "online": {
        en: "Online",
        hi: "ऑनलाइन",
        te: "ఆన్‌లైన్",
        ta: "ஆன்லைன்",
        kn: "ಆನ್‌ಲೈನ್",
        mr: "ऑनलाइन",
        bn: "অনলাইন"
    },
    "offline": {
        en: "Offline",
        hi: "ऑफ़लाइन",
        te: "ఆఫ్‌లైన్",
        ta: "ஆஃப்லைன்",
        kn: "ಆಫ್‌ಲೈನ್",
        mr: "ऑफलाइन",
        bn: "অফলাইন"
    },
    "refresh": {
        en: "Refresh",
        hi: "रिफ्रेश करें",
        te: "రిఫ్రెష్ చేయండి",
        ta: "புதுப்பி",
        kn: "ರಿಫ್ರೆಶ್ ಮಾಡಿ",
        mr: "रिफ्रेश करा",
        bn: "রিফ্রেশ করুন"
    },
    "retry": {
        en: "Retry",
        hi: "पुनः प्रयास करें",
        te: "మళ్ళీ ప్రయత్నించండి",
        ta: "மீண்டும் முயற்சி",
        kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
        mr: "पुन्हा प्रयत्न करा",
        bn: "আবার চেষ্টা করুন"
    },

    // Empty states
    "no_items": {
        en: "No items",
        hi: "कोई आइटम नहीं",
        te: "ఐటమ్‌లు లేవు",
        ta: "பொருட்கள் இல்லை",
        kn: "ಯಾವುದೇ ಐಟಂಗಳಿಲ್ಲ",
        mr: "कोणतेही आयटम नाहीत",
        bn: "কোনো আইটেম নেই"
    },
    "no_data": {
        en: "No data",
        hi: "कोई डेटा नहीं",
        te: "డేటా లేదు",
        ta: "தரவு இல்லை",
        kn: "ಯಾವುದೇ ಡೇಟಾ ಇಲ್ಲ",
        mr: "कोणताही डेटा नाही",
        bn: "কোনো ডেটা নেই"
    },
    "empty": {
        en: "Empty",
        hi: "खाली",
        te: "ఖాళీ",
        ta: "காலி",
        kn: "ಖಾಲಿ",
        mr: "रिकामे",
        bn: "খালি"
    }
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
        if (translations[key][lang]) {
            content[key] = translations[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}: ${updated} keys added (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ PAGINATION & OTHER UI TRANSLATIONS COMPLETE!');
