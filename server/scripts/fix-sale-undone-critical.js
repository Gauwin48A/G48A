const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// CRITICAL FIX: Proper contextual translations, NOT transliterations
// User specifically requested: Sale Undone = "అమ్మకం జరగలేదు" (ammakam jaragaledhu)
const translations = {
    // Main title - SINGLE COMBINED KEY with PROPER translation
    "sale_undone_title": {
        en: "Sale Undone",
        hi: "बिक्री नहीं हुई",  // "bikri nahi hui" - sale didn't happen
        te: "అమ్మకం జరగలేదు",    // "ammakam jaragaledhu" - sale didn't happen (USER REQUESTED)
        ta: "விற்பனை நடக்கவில்லை",  // "virpanai nadakkavillai" - sale didn't happen
        kn: "ಮಾರಾಟ ಆಗಲಿಲ್ಲ",       // "maraata aagalilla" - sale didn't happen
        mr: "विक्री झाली नाही",   // "vikri zhali nahi" - sale didn't happen
        bn: "বিক্রি হয়নি"         // "bikri hoyni" - sale didn't happen
    },

    // Keep separate keys for edge cases but with PROPER translations
    "sale": {
        en: "Sale",
        hi: "बिक्री",
        te: "అమ్మకం",
        ta: "விற்பனை",
        kn: "ಮಾರಾಟ",
        mr: "विक्री",
        bn: "বিক্রি"
    },
    "undone": {
        en: "Undone",
        hi: "नहीं हुई",      // "nahi hui" - didn't happen
        te: "జరగలేదు",        // "jaragaledhu" - didn't happen (NOT "అనడన")
        ta: "நடக்கவில்லை",
        kn: "ಆಗಲಿಲ್ಲ",
        mr: "झाली नाही",
        bn: "হয়নি"
    },

    // Other SaleUndone page strings needing translation
    "back_to_my_home": {
        en: "Back to My Home",
        hi: "मेरे होम पर वापस",
        te: "నా హోమ్‌కు తిరిగి",
        ta: "என் முகப்புக்குத் திரும்பு",
        kn: "ನನ್ನ ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
        mr: "माझ्या होमवर परत",
        bn: "আমার হোমে ফিরে যান"
    },
    "reactivate_sold_posts": {
        en: "Reactivate posts that didn't sell - give them another chance!",
        hi: "जो नहीं बिकी उन पोस्ट को फिर से सक्रिय करें - उन्हें एक और मौका दें!",
        te: "అమ్ముడుపోని పోస్ట్‌లను తిరిగి సక్రియం చేయండి - వాటికి మరో అవకాశం ఇవ్వండి!",
        ta: "விற்கப்படாத இடுகைகளை மீண்டும் செயல்படுத்துங்கள் - மற்றொரு வாய்ப்பு கொடுங்கள்!",
        kn: "ಮಾರಾಟವಾಗದ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಮತ್ತೆ ಸಕ್ರಿಯಗೊಳಿಸಿ - ಮತ್ತೊಂದು ಅವಕಾಶ ನೀಡಿ!",
        mr: "न विकलेल्या पोस्ट पुन्हा सक्रिय करा - त्यांना आणखी एक संधी द्या!",
        bn: "যেগুলো বিক্রি হয়নি সেগুলো পুনরায় সক্রিয় করুন - আরেকটি সুযোগ দিন!"
    },
    "instant_reactivation": {
        en: "Instant Reactivation",
        hi: "तुरंत पुनः सक्रिय",
        te: "తక్షణ పునఃసక్రియం",
        ta: "உடனடி மறுசெயல்படுத்தல்",
        kn: "ತತ್‌ಕ್ಷಣ ಮರುಸಕ್ರಿಯಗೊಳಿಸುವಿಕೆ",
        mr: "त्वरित पुन्हा सक्रियीकरण",
        bn: "তাৎক্ষণিক পুনরায় সক্রিয়করণ"
    },
    "no_penalties": {
        en: "No Penalties",
        hi: "कोई जुर्माना नहीं",
        te: "జరిమానాలు లేవు",
        ta: "அபராதம் இல்லை",
        kn: "ದಂಡಗಳಿಲ್ಲ",
        mr: "दंड नाही",
        bn: "কোনো জরিমানা নেই"
    },
    "keep_original_details": {
        en: "Keep Original Details",
        hi: "मूल विवरण रखें",
        te: "అసలు వివరాలు ఉంచండి",
        ta: "அசல் விவரங்களை வைத்திருங்கள்",
        kn: "ಮೂಲ ವಿವರಗಳನ್ನು ಇರಿಸಿ",
        mr: "मूळ तपशील ठेवा",
        bn: "মূল বিবরণ রাখুন"
    },
    "post_reactivated": {
        en: "Post Reactivated!",
        hi: "पोस्ट पुनः सक्रिय हुई!",
        te: "పోస్ట్ తిరిగి సక్రియం అయింది!",
        ta: "இடுகை மீண்டும் செயல்படுத்தப்பட்டது!",
        kn: "ಪೋಸ್ಟ್ ಮರುಸಕ್ರಿಯಗೊಂಡಿದೆ!",
        mr: "पोस्ट पुन्हा सक्रिय झाली!",
        bn: "পোস্ট পুনরায় সক্রিয় হয়েছে!"
    },
    "post_visible_again": {
        en: "Your post is now active and visible to potential buyers again.",
        hi: "आपकी पोस्ट अब सक्रिय है और संभावित खरीदारों को फिर से दिखाई दे रही है।",
        te: "మీ పోస్ట్ ఇప్పుడు యాక్టివ్‌గా ఉంది మరియు సంభావ్య కొనుగోలుదారులకు మళ్లీ కనిపిస్తుంది.",
        ta: "உங்கள் இடுகை இப்போது செயலில் உள்ளது மற்றும் சாத்தியமான வாங்குபவர்களுக்கு மீண்டும் தெரியும்.",
        kn: "ನಿಮ್ಮ ಪೋಸ್ಟ್ ಈಗ ಸಕ್ರಿಯವಾಗಿದೆ ಮತ್ತು ಸಂಭಾವ್ಯ ಖರೀದಿದಾರರಿಗೆ ಮತ್ತೆ ಗೋಚರಿಸುತ್ತದೆ.",
        mr: "तुमची पोस्ट आता सक्रिय आहे आणि संभाव्य खरेदीदारांना पुन्हा दिसते.",
        bn: "আপনার পোস্ট এখন সক্রিয় এবং সম্ভাব্য ক্রেতাদের কাছে আবার দৃশ্যমান।"
    },
    "reactivate_another": {
        en: "Reactivate Another",
        hi: "एक और पुनः सक्रिय करें",
        te: "మరొకటి తిరిగి సక్రియం చేయండి",
        ta: "மற்றொன்றை மீண்டும் செயல்படுத்து",
        kn: "ಮತ್ತೊಂದನ್ನು ಮರುಸಕ್ರಿಯಗೊಳಿಸಿ",
        mr: "आणखी एक पुन्हा सक्रिय करा",
        bn: "আরেকটি পুনরায় সক্রিয় করুন"
    },
    "go_to_my_home": {
        en: "Go to My Home",
        hi: "मेरे होम पर जाएं",
        te: "నా హోమ్‌కు వెళ్ళండి",
        ta: "என் முகப்புக்குச் செல்",
        kn: "ನನ್ನ ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ",
        mr: "माझ्या होमवर जा",
        bn: "আমার হোমে যান"
    },
    "post_status": {
        en: "Post Status",
        hi: "पोस्ट की स्थिति",
        te: "పోస్ట్ స్థితి",
        ta: "இடுகை நிலை",
        kn: "ಪೋಸ್ಟ್ ಸ್ಥಿತಿ",
        mr: "पोस्ट स्थिती",
        bn: "পোস্ট স্থিতি"
    },
    "to_buyers": {
        en: "To Buyers",
        hi: "खरीदारों को",
        te: "కొనుగోలుదారులకు",
        ta: "வாங்குபவர்களுக்கு",
        kn: "ಖರೀದಿದಾರರಿಗೆ",
        mr: "खरेदीदारांना",
        bn: "ক্রেতাদের কাছে"
    },
    "visible": {
        en: "Visible",
        hi: "दिखाई देता है",
        te: "కనిపిస్తుంది",
        ta: "தெரியும்",
        kn: "ಗೋಚರಿಸುತ್ತದೆ",
        mr: "दृश्यमान",
        bn: "দৃশ্যমান"
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

    console.log(`${lang.toUpperCase()}: ${updated} keys updated (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ CRITICAL FIX: Sale Undone translations corrected!');
console.log('\nKey fixes:');
console.log('  undone (te): జరగలేదు (jaragaledhu) - NOT అనడన');
console.log('  sale_undone_title (te): అమ్మకం జరగలేదు');
