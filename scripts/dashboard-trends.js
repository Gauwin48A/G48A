const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Dashboard trend translations + more missing translations
const translations = {
    // Dashboard trend badges
    "trend_active": { en: "+Active", hi: "+सक्रिय", te: "+యాక్టివ్", ta: "+செயலில்", kn: "+ಸಕ್ರಿಯ", mr: "+सक्रिय", bn: "+সক্রিয়" },
    "trend_sold": { en: "+Sold", hi: "+बिका", te: "+విక్రయించబడింది", ta: "+விற்கப்பட்டது", kn: "+ಮಾರಾಟ", mr: "+विकले", bn: "+বিক্রি" },
    "trend_views": { en: "+Views", hi: "+व्यूज", te: "+వ్యూలు", ta: "+பார்வைகள்", kn: "+ವೀಕ್ಷಣೆ", mr: "+व्ह्यूज", bn: "+ভিউ" },
    "trend_coins": { en: "+Coins", hi: "+सिक्के", te: "+నాణేలు", ta: "+நாணயங்கள்", kn: "+ನಾಣ್ಯಗಳು", mr: "+नाणी", bn: "+কয়েন" },

    // Dashboard labels
    "welcome_back": { en: "Welcome back", hi: "वापसी पर स्वागत है", te: "తిరిగి స్వాగతం", ta: "மீண்டும் வருக", kn: "ಮತ್ತೆ ಸ್ವಾಗತ", mr: "पुन्हा स्वागत आहे", bn: "স্বাগতম" },
    "total_coins": { en: "Total Coins", hi: "कुल सिक्के", te: "మొత్తం నాణేలు", ta: "மொத்த நாணயங்கள்", kn: "ಒಟ್ಟು ನಾಣ್ಯಗಳು", mr: "एकूण नाणी", bn: "মোট কয়েন" },
    "code": { en: "Code", hi: "कोड", te: "కోడ్", ta: "குறியீடு", kn: "ಕೋಡ್", mr: "कोड", bn: "কোড" },
    "recent_activity": { en: "Recent Activity", hi: "हाल की गतिविधि", te: "ఇటీవలి కార్యకలాపాలు", ta: "சமீபத்திய செயல்பாடு", kn: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ", mr: "अलीकडील क्रियाकलाप", bn: "সাম্প্রতিক কার্যকলাপ" },
    "your_dashboard": { en: "Your Dashboard", hi: "आपका डैशबोर्ड", te: "మీ డ్యాష్‌బోర్డ్", ta: "உங்கள் டாஷ்போர்டு", kn: "ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", mr: "तुमचा डॅशबोर्ड", bn: "আপনার ড্যাশবোর্ড" },
    "dashboard_login_msg": { en: "Login to see your personalized dashboard with stats and insights", hi: "अपने व्यक्तिगत डैशबोर्ड को आंकड़ों और अंतर्दृष्टि के साथ देखने के लिए लॉगिन करें", te: "గణాంకాలు మరియు అంతర్దృష్టులతో మీ వ్యక్తిగతీకరించిన డ్యాష్‌బోర్డ్‌ను చూడటానికి లాగిన్ చేయండి", ta: "புள்ளிவிவரங்கள் மற்றும் நுண்ணறிவுகளுடன் உங்கள் தனிப்பயனாக்கப்பட்ட டாஷ்போர்டைப் பார்க்க உள்நுழையவும்", kn: "ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ಒಳನೋಟಗಳೊಂದಿಗೆ ನಿಮ್ಮ ವೈಯಕ್ತೀಕರಿಸಿದ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ನೋಡಲು ಲಾಗಿನ್ ಮಾಡಿ", mr: "आकडेवारी आणि अंतर्दृष्टीसह तुमचे वैयक्तिकृत डॅशबोर्ड पाहण्यासाठी लॉगिन करा", bn: "পরিসংখ্যান এবং অন্তর্দৃষ্টি সহ আপনার ব্যক্তিগতকৃত ড্যাশবোর্ড দেখতে লগইন করুন" },
    "retry": { en: "Retry", hi: "पुनः प्रयास करें", te: "మళ్ళీ ప్రయత్నించండి", ta: "மீண்டும் முயற்சிக்கவும்", kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", mr: "पुन्हा प्रयत्न करा", bn: "আবার চেষ্টা করুন" },
    "top_sellers_this_month": { en: "Top Sellers This Month", hi: "इस महीने के टॉप विक्रेता", te: "ఈ నెల టాప్ సెల్లర్లు", ta: "இந்த மாதத்தின் சிறந்த விற்பனையாளர்கள்", kn: "� ತಿಂಗಳ ಟಾಪ್ ಮಾರಾಟಗಾರರು", mr: "या महिन्यातील टॉप विक्रेते", bn: "এই মাসের শীর্ষ বিক্রেতা" },
    "sales": { en: "sales", hi: "बिक्री", te: "విక్రయాలు", ta: "விற்பனை", kn: "ಮಾರಾಟ", mr: "विक्री", bn: "বিক্রয়" },

    // Profile rank translations
    "new_seller": { en: "New Seller", hi: "नया विक्रेता", te: "కొత్త విక్రేత", ta: "புதிய விற்பனையாளர்", kn: "ಹೊಸ ಮಾರಾಟಗಾರ", mr: "नवीन विक्रेता", bn: "নতুন বিক্রেতা" },
    "silver_seller": { en: "Silver Seller", hi: "सिल्वर विक्रेता", te: "సిల్వర్ విక్రేత", ta: "வெள்ளி விற்பனையாளர்", kn: "ಸಿಲ್ವರ್ ಮಾರಾಟಗಾರ", mr: "सिल्व्हर विक्रेता", bn: "সিলভার বিক্রেতা" },
    "gold_seller": { en: "Gold Seller", hi: "गोल्ड विक्रेता", te: "గోల్డ్ విక్రేత", ta: "தங்க விற்பனையாளர்", kn: "ಗೋಲ್ಡ್ ಮಾರಾಟಗಾರ", mr: "गोल्ड विक्रेता", bn: "গোল্ড বিক্রেতা" },

    // Login/auth
    "login_to_continue": { en: "Login to Continue", hi: "जारी रखने के लिए लॉगिन करें", te: "కొనసాగించడానికి లాగిన్ చేయండి", ta: "தொடர உள்நுழையவும்", kn: "ಮುಂದುವರಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ", mr: "सुरू ठेवण्यासाठी लॉगिन करा", bn: "চালিয়ে যেতে লগইন করুন" },
    "create_account": { en: "Create Account", hi: "खाता बनाएं", te: "ఖాతా సృష్టించండి", ta: "கணக்கை உருவாக்கு", kn: "ಖಾತೆ ತಯಾರಿಸಿ", mr: "खाते तयार करा", bn: "অ্যাকাউন্ট তৈরি করুন" },

    // Saledone placeholders
    "eg_50000": { en: "e.g., 50000", hi: "उदा., 50000", te: "ఉదా., 50000", ta: "எ.கா., 50000", kn: "ಉದಾ., 50000", mr: "उदा., 50000", bn: "যেমন, 50000" },

    // Subject
    "subject": { en: "Subject", hi: "विषय", te: "విషయం", ta: "பொருள்", kn: "ವಿಷಯ", mr: "विषय", bn: "বিষয়" }
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
            if (!content[key] || content[key] !== translations[key][lang]) {
                content[key] = translations[key][lang];
                updated++;
            }
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys updated (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ Dashboard trend translations added!');
