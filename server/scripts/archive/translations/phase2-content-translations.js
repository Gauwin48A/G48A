const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m"
};

const localesDir = path.join(__dirname, '../client/src/locales');
const publicLocalesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    all_posts: {
        en: "All Posts",
        hi: "सभी पोस्ट",
        te: "అన్ని పోస్ట్లు",
        ta: "அனைத்து பதிவுகள்",
        kn: "ಎಲ್ಲಾ ಪೋಸ್ಟ್‌ಗಳು",
        mr: "सर्व पोस्ट",
        bn: "সমস্ত পোস্ট"
    },
    view: {
        en: "View",
        hi: "देखें",
        te: "చూడండి",
        ta: "பார்வை",
        kn: "ವೀಕ್ಷಿಸಿ",
        mr: "पहा",
        bn: "দেখুন"
    },
    no_content: {
        en: "No content",
        hi: "कोई सामग्री नहीं",
        te: "కంటెంట్ లేదు",
        ta: "உள்ளடக்கம் இல்லை",
        kn: "ಯಾವುದೇ ವಿಷಯವಿಲ್ಲ",
        mr: "कोणतीही सामग्री नाही",
        bn: "কোন বিষয়বস্তু নেই"
    },
    select_all_tooltip: {
        en: "Select all active posts for bulk actions",
        hi: "थोक कार्यों के लिए सभी सक्रिय पोस्ट चुनें",
        te: "భారీ చర్యల కోసం అన్ని క్రియాశీల పోస్ట్‌లను ఎంచుకోండి",
        ta: "மொத்த நடவடிக்கைகளுக்கு அனைத்து செயலில் உள்ள பதிவுகளையும் தேர்ந்தெடுக்கவும்",
        kn: "ಬೃಹತ್ ಕ್ರಮಗಳಿಗಾಗಿ ಎಲ್ಲಾ ಸಕ್ರಿಯ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        mr: "मोठ्या कृतींसाठी सर्व सक्रिय पोस्ट निवडा",
        bn: "বাল্ক পদক্ষেপের জন্য সমস্ত সক্রিয় পোস্ট নির্বাচন করুন"
    },
    copy_post_id_tooltip: {
        en: "Copy Post ID (use this in SaleDone)",
        hi: "पोस्ट आईडी कॉपी करें (सेलडन में इसका उपयोग करें)",
        te: "పోస్ట్ IDని కాపీ చేయండి (దీనిని సేల్ డన్‌లో ఉపయోగించండి)",
        ta: "பதிவு ID ஐ நகலெடுக்கவும் (விற்பனை முடிந்ததில் இதைப் பயன்படுத்தவும்)",
        kn: "ಪೋಸ್ಟ್ ID ನಕಲಿಸಿ (ಮಾರಾಟ ಪೂರ್ಣಗೊಂಡಲ್ಲಿ ಇದನ್ನು ಬಳಸಿ)",
        mr: "पोस्ट आयडी कॉपी करा (सैलडनमध्ये वापरा)",
        bn: "পোস্ট আইডি কপি করুন (সেলডান-এ এটি ব্যবহার করুন)"
    },
    delete_post_title: {
        en: "Delete Post?",
        hi: "पोस्ट हटाएं?",
        te: "పోస్ట్‌ను తొలగించాలా?",
        ta: "பதிவை ழிக்கவா?",
        kn: "ಪೋಸ್ಟ್ ಅಳಿಸುವುದೇ?",
        mr: "पोस्ट हटवायची?",
        bn: "পোস্ট মুছবেন?"
    },
    delete_post_desc: {
        en: "This action cannot be undone. This will permanently delete your post.",
        hi: "यह कार्रवाई पूर्ववत नहीं की जा सकती। यह आपकी पोस्ट को स्थायी रूप से हटा देगा।",
        te: "ఈ చర్య రద్దు చేయబడదు. ఇది మీ పోస్ట్‌ను శాశ్వతంగా తొలగిస్తుంది.",
        ta: "இந்த நடவடிக்கையை செயல்தவிர்க்க முடியாது. இது உங்கள் பதிவை நிரந்தரமாக அழிக்கும்.",
        kn: "ಈ ಕ್ರಿಯೆಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗುವುದಿಲ್ಲ. ಇದು ನಿಮ್ಮ ಪೋಸ್ಟ್ ಅನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುತ್ತದೆ.",
        mr: "ही कृती पूर्ववत केली जाऊ शकत नाही. हे तुमची पोस्ट कायमची हटवेल.",
        bn: "এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি আপনার পোস্ট স্থায়ীভাবে মুছে ফেলবে।"
    },
    move_sale_undone_title: {
        en: "Move to Sale Undone?",
        hi: "बिक्री रद्द में ले जाएं?",
        te: "అమ్మకం రద్దుకు తరలించాలా?",
        ta: "விற்பனை ரத்து செய்வதற்கு மாற்றவா?",
        kn: "ಮಾರಾಟ ರದ್ದುಗೊಳಿಸಿದಕ್ಕೆ ಸರಿಸುವುದೇ?",
        mr: "विक्री रद्द कडे हलवायचे?",
        bn: "বিক্রয় বাতিল-এ সরাবেন?"
    },
    move_sale_undone_desc: {
        en: "This will move the selected posts to Sale Undone status.",
        hi: "यह चयनित पोस्ट को बिक्री रद्द स्थिति में ले जाएगा।",
        te: "ఇది ఎంచుకున్న పోస్ట్‌లను అమ్మకం రద్దు స్థితికి తరలిస్తుంది.",
        ta: "இது தேர்ந்தெடுக்கப்பட்ட பதிவுகளை விற்பனை ரத்து நிலைக்கு மாற்றும்.",
        kn: "ಇದು ಆಯ್ಕೆಮಾಡಿದ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಮಾರಾಟ ರದ್ದುಗೊಳಿಸಿದ ಸ್ಥಿತಿಗೆ ಸರಿಸುತ್ತದೆ.",
        mr: "हे निवडलेल्या पोस्ट विक्री रद्द स्थितीत हलवेल.",
        bn: "এটি নির্বাচিত পোস্টগুলিকে বিক্রয় বাতিল অবস্থানে সরাবে।"
    },
    edit_post: {
        en: "Edit Post",
        hi: "पोस्ट संपादित करें",
        te: "పోస్ట్‌ను సవరించండి",
        ta: "பதிவைத் திருத்து",
        kn: "ಪೋಸ್ಟ್ ಸಂಪಾದಿಸಿ",
        mr: "पोस्ट संपादित करा",
        bn: "পোস্ট সম্পাদনা করুন"
    },
    share_post: {
        en: "Share Post",
        hi: "पोस्ट साझा करें",
        te: "పోస్ట్‌ను షేర్ చేయండి",
        ta: "பதிவைப் பகிரவும்",
        kn: "ಪೋಸ್ಟ್ ಹಂಚಿಕೊಳ್ಳಿ",
        mr: "पोस्ट शेअर करा",
        bn: "পোস্ট শেয়ার করুন"
    },
    cancel: {
        en: "Cancel",
        hi: "रद्द करें",
        te: "రద్దు చేయండి",
        ta: "ரத்துசெய்",
        kn: "ರದ್ದುಮಾಡಿ",
        mr: "रद्द करा",
        bn: "বাতিল করুন"
    },
    delete: {
        en: "Delete",
        hi: "हटाएं",
        te: "తొలగించు",
        ta: "அழி",
        kn: "ಅಳಿಸಿ",
        mr: "हटवा",
        bn: "মুছুন"
    }
};

function updateLocales() {
    console.log(`${colors.blue}Starting Phase 2 Content translation updates...${colors.reset}`);

    languages.forEach(lang => {
        // Defines paths
        const srcPath = path.join(localesDir, `${lang}.json`);
        const publicPath = path.join(publicLocalesDir, `${lang}.json`);

        let translations = {};

        // Read existing translations
        if (fs.existsSync(srcPath)) {
            try {
                translations = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
            } catch (e) {
                console.error(`${colors.red}Error reading ${lang}.json from src:${colors.reset}`, e.message);
            }
        }

        // Add new keys
        let addedCount = 0;
        Object.keys(newKeys).forEach(key => {
            if (!translations[key]) {
                translations[key] = newKeys[key][lang] || newKeys[key]['en'];
                addedCount++;
            } else if (key === 'cancel' || key === 'delete' || key === 'view') {
                // Ensure these common keys are present and correct if they were missing or generic
                translations[key] = newKeys[key][lang] || newKeys[key]['en'];
            }
        });

        // Sort keys alphabetically
        const sortedTranslations = Object.keys(translations)
            .sort()
            .reduce((acc, key) => {
                acc[key] = translations[key];
                return acc;
            }, {});

        // Write back to files
        try {
            // Ensure directories exist
            if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });
            if (!fs.existsSync(publicLocalesDir)) fs.mkdirSync(publicLocalesDir, { recursive: true });

            const jsonContent = JSON.stringify(sortedTranslations, null, 2);
            fs.writeFileSync(srcPath, jsonContent);
            fs.writeFileSync(publicPath, jsonContent);
            console.log(`${colors.green}Updated ${lang}.json: Added ${addedCount} new keys.${colors.reset}`);
        } catch (e) {
            console.error(`${colors.red}Error writing ${lang}.json:${colors.reset}`, e.message);
        }
    });

    console.log(`${colors.blue}Phase 2 Content translation updates completed!${colors.reset}`);
}

updateLocales();
