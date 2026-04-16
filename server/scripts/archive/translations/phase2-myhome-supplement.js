const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    confirm: {
        en: "Confirm",
        hi: "पुष्टि करें",
        te: "నిర్ధారించండి",
        ta: "உறுதிப்படுத்தவும்",
        kn: "ಖಚಿತಪಡಿಸಿ",
        mr: "पुष्टी करा",
        bn: "নিশ্চিত করুন"
    },
    bulk_delete_title: {
        en: "Delete {{count}} Posts?",
        hi: "{{count}} पोस्ट हटाएं?",
        te: "{{count}} పోస్ట్‌లను తొలగించాలా?",
        ta: "{{count}} பதிவுகளை ழிக்கவா?",
        kn: "{{count}} ಪೋಸ್ಟ್‌ಗಳನ್ನು ಅಳಿಸುವುದೇ?",
        mr: "{{count}} पोस्ट हटवायची?",
        bn: "{{count}} টি পোস্ট মুছবেন?"
    },
    bulk_delete_desc: {
        en: "This action cannot be undone. All selected posts will be permanently deleted.",
        hi: "यह कार्रवाई पूर्ववत नहीं की जा सकती। सभी चयनित पोस्ट स्थायी रूप से हटा दिए जाएंगे।",
        te: "ఈ చర్య రద్దు చేయబడదు. ఎంచుకున్న అన్ని పోస్ట్‌లు శాశ్వతంగా తొలగించబడతాయి.",
        ta: "இந்த நடவடிக்கையை செயல்தவிர்க்க முடியாது. தேர்ந்தெடுக்கப்பட்ட அனைத்து பதிவுகளும் நிரந்தரமாக அழிக்கப்படும்.",
        kn: "ಈ ಕ್ರಿಯೆಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗುವುದಿಲ್ಲ. ಆಯ್ಕೆಮಾಡಿದ ಎಲ್ಲಾ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲಾಗುತ್ತದೆ.",
        mr: "ही कृती पूर्ववत केली जाऊ शकत नाही. सर्व निवडलेल्या पोस्ट कायमच्या हटवल्या जातील.",
        bn: "এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। সমস্ত নির্বাচিত পোস্ট স্থায়ীভাবে মুছে ফেলা হবে।"
    },
    delete_all: {
        en: "Delete All",
        hi: "सभी हटाएं",
        te: "అన్నీ తొలగించు",
        ta: "அனைத்தையும் அழி",
        kn: "ಎಲ್ಲವನ್ನೂ ಅಳಿಸಿ",
        mr: "सर्व हटवा",
        bn: "সব মুছুন"
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
