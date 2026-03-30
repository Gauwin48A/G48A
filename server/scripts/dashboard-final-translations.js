const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Final comprehensive Dashboard and remaining translations
const translations = {
    // Dashboard specific
    "top_sellers_month": { en: "Top Sellers This Month", hi: "इस महीने के शीर्ष विक्रेता", te: "ఈ నెల టాప్ సెల్లర్లు", ta: "இந்த மாதத்தின் சிறந்த விற்பனையாளர்கள்", kn: "ಈ ತಿಂಗಳ ಟಾಪ್ ಮಾರಾಟಗಾರರು", mr: "या महिन्यातील टॉप विक्रेते", bn: "এই মাসের শীর্ষ বিক্রেতা" },
    "recent_activity": { en: "Recent Activity", hi: "हाल की गतिविधि", te: "ఇటీవలి కార్యకలాపం", ta: "சமீபத்திய செயல்பாடு", kn: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ", mr: "अलीकडील क्रियाकलाप", bn: "সাম্প্রতিক কার্যকলাপ" },
    "sales": { en: "sales", hi: "बिक्री", te: "అమ్మకాలు", ta: "விற்பனை", kn: "ಮಾರಾಟ", mr: "विक्री", bn: "বিক্রয়" },
    "coins": { en: "coins", hi: "सिक्के", te: "నాణేలు", ta: "நாணயங்கள்", kn: "ನಾಣ್ಯಗಳು", mr: "नाणी", bn: "কয়েন" },
    "you": { en: "You", hi: "आप", te: "మీరు", ta: "நீங்கள்", kn: "ನೀವು", mr: "तुम्ही", bn: "আপনি" },
    "no_top_sellers": { en: "No top sellers yet", hi: "अभी तक कोई शीर्ष विक्रेता नहीं", te: "ఇంకా టాప్ సెల్లర్లు లేరు", ta: "இன்னும் சிறந்த விற்பனையாளர்கள் இல்லை", kn: "ಇನ್ನೂ ಟಾಪ್ ಮಾರಾಟಗಾರರು ಇಲ್ಲ", mr: "अद्याप टॉप विक्रेते नाहीत", bn: "এখনও শীর্ষ বিক্রেতা নেই" },

    // Trend badges (ensure they exist)
    "trend_active": { en: "+Active", hi: "+सक्रिय", te: "+యాక్టివ్", ta: "+செயலில்", kn: "+ಸಕ್ರಿಯ", mr: "+सक्रिय", bn: "+সক্রিয়" },
    "trend_sold": { en: "+Sold", hi: "+बिका", te: "+విక్రయించబడింది", ta: "+விற்கப்பட்டது", kn: "+ಮಾರಾಟ", mr: "+विकले", bn: "+বিক্রি" },
    "trend_views": { en: "+Views", hi: "+व्यूज", te: "+వ్యూలు", ta: "+பார்வைகள்", kn: "+ವೀಕ್ಷಣೆ", mr: "+व्ह्यूज", bn: "+ভিউ" },
    "trend_coins": { en: "+Coins", hi: "+सिक्के", te: "+నాణేలు", ta: "+நாணயங்கள்", kn: "+ನಾಣ್ಯಗಳು", mr: "+नाणी", bn: "+কয়েন" },

    // Stats labels (ensure correct keys)
    "active_listings": { en: "Active Listings", hi: "सक्रिय लिस्टिंग", te: "యాక్టివ్ లిస్టింగ్‌లు", ta: "செயலில் உள்ள பட்டியல்கள்", kn: "ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳು", mr: "सक्रिय लिस्टिंग", bn: "সক্রিয় তালিকা" },
    "total_sales": { en: "Total Sales", hi: "कुल बिक्री", te: "మొత్తం అమ్మకాలు", ta: "மொத்த விற்பனை", kn: "ಒಟ್ಟು ಮಾರಾಟ", mr: "एकूण विक्री", bn: "মোট বিক্রয়" },
    "total_views": { en: "Total Views", hi: "कुल दृश्य", te: "మొత్తం వ్యూలు", ta: "மொத்த பார்வைகள்", kn: "ಒಟ್ಟು ವೀಕ್ಷಣೆಗಳು", mr: "एकूण व्ह्यूज", bn: "মোট ভিউ" },
    "coins_earned": { en: "Coins Earned", hi: "अर्जित सिक्के", te: "సంపాదించిన నాణేలు", ta: "சம்பாதித்த நாணயங்கள்", kn: "ಗಳಿಸಿದ ನಾಣ್ಯಗಳು", mr: "मिळवलेले नाणी", bn: "অর্জিত কয়েন" },

    // Login section
    "welcome_back": { en: "Welcome back", hi: "वापसी पर स्वागत है", te: "తిరిగి స్వాగతం", ta: "மீண்டும் வருக", kn: "ಮತ್ತೆ ಸ್ವಾಗತ", mr: "पुन्हा स्वागत आहे", bn: "স্বাগতম" },
    "total_coins": { en: "Total Coins", hi: "कुल सिक्के", te: "మొత్తం నాణేలు", ta: "மொத்த நாணயங்கள்", kn: "ಒಟ್ಟು ನಾಣ್ಯಗಳು", mr: "एकूण नाणी", bn: "মোট কয়েন" },
    "code": { en: "Code", hi: "कोड", te: "కోడ్", ta: "குறியீடு", kn: "ಕೋಡ್", mr: "कोड", bn: "কোড" },
    "your_dashboard": { en: "Your Dashboard", hi: "आपका डैशबोर्ड", te: "మీ డ్యాష్‌బోర్డ్", ta: "உங்கள் டாஷ்போர்டு", kn: "ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", mr: "तुमचा डॅशबोर्ड", bn: "আপনার ড্যাশবোর্ড" },
    "dashboard_login_msg": { en: "Login to see your personalized dashboard", hi: "अपना व्यक्तिगत डैशबोर्ड देखने के लिए लॉगिन करें", te: "మీ వ్యక్తిగతీకరించిన డ్యాష్‌బోర్డ్ చూడటానికి లాగిన్ చేయండి", ta: "உங்கள் தனிப்பயனாக்கப்பட்ட டாஷ்போர்டு பார்க்க உள்நுழையவும்", kn: "ನಿಮ್ಮ ವೈಯಕ್ತೀಕರಿಸಿದ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ನೋಡಲು ಲಾಗಿನ್ ಮಾಡಿ", mr: "तुमचा वैयक्तिक डॅशबोर्ड पाहण्यासाठी लॉगिन करा", bn: "আপনার ব্যক্তিগত ড্যাশবোর্ড দেখতে লগইন করুন" },
    "login_to_continue": { en: "Login to Continue", hi: "जारी रखने के लिए लॉगिन करें", te: "కొనసాగించడానికి లాగిన్ చేయండి", ta: "தொடர உள்நுழையவும்", kn: "ಮುಂದುವರಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ", mr: "सुरू ठेवण्यासाठी लॉगिन करा", bn: "চালিয়ে যেতে লগইন করুন" },
    "create_account": { en: "Create Account", hi: "खाता बनाएं", te: "ఖాతా సృష్టించండి", ta: "கணக்கை உருவாக்கு", kn: "ಖಾತೆ ರಚಿಸಿ", mr: "खाते तयार करा", bn: "অ্যাকাউন্ট তৈরি করুন" },
    "loading": { en: "Loading...", hi: "लोड हो रहा है...", te: "లోడ్ అవుతోంది...", ta: "ஏற்றுகிறது...", kn: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...", mr: "लोड होत आहे...", bn: "লোড হচ্ছে..." },
    "retry": { en: "Retry", hi: "पुनः प्रयास करें", te: "మళ్ళీ ప్రయత్నించండి", ta: "மீண்டும் முயற்சிக்கவும்", kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", mr: "पुन्हा प्रयत्न करा", bn: "আবার চেষ্টা করুন" }
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

    console.log(`${lang.toUpperCase()}.json: ${updated} keys added/updated (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ Dashboard comprehensive translations added!');
