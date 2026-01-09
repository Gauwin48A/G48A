const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    // App.jsx LocationBanner keys
    location_required: {
        en: "Location Required",
        hi: "स्थान आवश्यक",
        te: "స్థానం అవసరం",
        ta: "இருப்பிடம் தேவை",
        kn: "ಸ್ಥಳ ಅಗತ್ಯವಿದೆ",
        mr: "स्थान आवश्यक",
        bn: "অবস্থান প্রয়োজন"
    },
    requesting_location: {
        en: "Requesting location...",
        hi: "स्थान का अनुरोध किया जा रहा है...",
        te: "స్థానాన్ని అభ్యర్థిస్తోంది...",
        ta: "இருப்பிடத்தைக் கோருகிறது...",
        kn: "ಸ್ಥಳವನ್ನು ವಿನಂತಿಸಲಾಗುತ್ತಿದೆ...",
        mr: "स्थान विनंती करत आहे...",
        bn: "অবস্থান অনুরোধ করা হচ্ছে..."
    },
    grant_permission: {
        en: "Enable location for better experience",
        hi: "बेहतर अनुभव के लिए स्थान सक्षम करें",
        te: "మంచి అనుభవం కోసం స్థానాన్ని ప్రారంభించండి",
        ta: "சிறந்த அனுபவத்திற்கு இருப்பிடத்தை இயக்கவும்",
        kn: "ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ ಸ್ಥಳವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
        mr: "चांगल्या अनुभवासाठी स्थान सक्षम करा",
        bn: "উন্নত অভিজ্ঞতার জন্য অবস্থান সক্ষম করুন"
    },
    allow_location: {
        en: "Enable",
        hi: "सक्षम करें",
        te: "ప్రారంభించు",
        ta: "இயக்கு",
        kn: "ಸಕ್ರಿಯಗೊಳಿಸಿ",
        mr: "सक्षम करा",
        bn: "সক্ষম করুন"
    },
    later: {
        en: "Later",
        hi: "बाद में",
        te: "తర్వాత",
        ta: "பிறகு",
        kn: "ನಂತರ",
        mr: "नंतर",
        bn: "পরে"
    },
    initializing_app: {
        en: "Initializing App",
        hi: "ऐप प्रारंभ हो रहा है",
        te: "యాప్ ప్రారంభించబడుతోంది",
        ta: "செயலி தொடங்கப்படுகிறது",
        kn: "ಅಪ್ಲಿಕೇಶನ್ ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ",
        mr: "अॅप प्रारंभ करत आहे",
        bn: "অ্যাপ শুরু হচ্ছে"
    },
    detecting_location: {
        en: "Detecting your location...",
        hi: "आपके स्थान का पता लगाया जा रहा है...",
        te: "మీ స్థానాన్ని గుర్తిస్తోంది...",
        ta: "உங்கள் இருப்பிடத்தைக் கண்டறிகிறது...",
        kn: "ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಪತ್ತೆಹಚ್ಚಲಾಗುತ್ತಿದೆ...",
        mr: "आपले स्थान शोधत आहे...",
        bn: "আপনার অবস্থান শনাক্ত করা হচ্ছে..."
    },
    skip_for_now: {
        en: "Skip for now",
        hi: "अभी के लिए छोड़ें",
        te: "ప్రస్తుతానికి దాటవేయి",
        ta: "இப்போதைக்குத் தவிர்",
        kn: "ಈಗ ಬಿಟ್ಟುಬಿಡಿ",
        mr: "आत्तासाठी वगळा",
        bn: "এখনকার জন্য এড়িয়ে যান"
    },
    can_skip_hint: {
        en: "(You can skip this)",
        hi: "(आप इसे छोड़ सकते हैं)",
        te: "(మీరు దీన్ని దాటవేయవచ్చు)",
        ta: "(நீங்கள் இதைத் தவிர்க்கலாம்)",
        kn: "(ನೀವು ಇದನ್ನು ಬಿಟ್ಟುಬಿಡಬಹುದು)",
        mr: "(तुम्ही हे वगळू शकता)",
        bn: "(আপনি এটি এড়িয়ে যেতে পারেন)"
    }
};

languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    let translations = {};
    try {
        if (fs.existsSync(filePath)) {
            translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        Object.keys(newKeys).forEach(key => {
            if (!translations[key]) {
                translations[key] = newKeys[key][lang] || newKeys[key]['en'];
            }
        });

        fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
        console.log(`Updated ${lang}.json`);
    } catch (e) {
        console.error(`Error updating ${lang}:`, e);
    }
});
