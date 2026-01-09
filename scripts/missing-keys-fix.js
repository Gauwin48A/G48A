const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Missing keys found during JSX updates
const translations = {
    "file_a": { en: "File a", hi: "दर्ज करें", te: "దాఖలు చేయండి", ta: "தாக்கல் செய்", kn: "ಸಲ್ಲಿಸಿ", mr: "दाखल करा", bn: "দায়ের করুন" },
    "complaints_login_desc": { en: "Need to report an issue? Please login to file a complaint.", hi: "कोई समस्या रिपोर्ट करनी है? कृपया शिकायत दर्ज करने के लिए लॉगिन करें।", te: "సమస్యను నివేదించాలా? దయచేసి ఫిర్యాదు దాఖలు చేయడానికి లాగిన్ చేయండి.", ta: "ஒரு சிக்கலைப் புகாரளிக்க வேண்டுமா? புகார் அளிக்க உள்நுழையவும்.", kn: "ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಬೇಕೇ? ದೂರು ಸಲ್ಲಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ.", mr: "समस्या नोंदवायची आहे? कृपया तक्रार नोंदवण्यासाठी लॉगिन करा.", bn: "সমস্যা রিপোর্ট করতে হবে? অভিযোগ দায়ের করতে লগইন করুন।" },
    "login_desc": { en: "Already have an account? Sign in here", hi: "पहले से खाता है? यहां साइन इन करें", te: "ఇప్పటికే ఖాతా ఉందా? ఇక్కడ సైన్ ఇన్ చేయండి", ta: "ஏற்கனவே கணக்கு உள்ளதா? இங்கே உள்நுழையவும்", kn: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ಇಲ್ಲಿ ಸೈನ್ ಇನ್ ಮಾಡಿ", mr: "आधीच खाते आहे? येथे साइन इन करा", bn: "ইতিমধ্যে একটি অ্যাকাউন্ট আছে? এখানে সাইন ইন করুন" },
    "signup_desc": { en: "New user? Join us in just a few steps", hi: "नए उपयोगकर्ता? बस कुछ ही चरणों में हमसे जुड़ें", te: "కొత్త యూజర్? కొన్ని స్టెప్స్‌లో మాతో చేరండి", ta: "புதிய பயனர்? சில படிகளில் எங்களுடன் இணையுங்கள்", kn: "ಹೊಸ ಬಳಕೆದಾರರೇ? ಕೆಲವು ಹಂತಗಳಲ್ಲಿ ನಮ್ಮೊಂದಿಗೆ ಸೇರಿ", mr: "नवीन वापरकर्ता? काही चरणांमध्ये आमच्याशी सामील व्हा", bn: "নতুন ব্যবহারকারী? কয়েকটি ধাপে আমাদের সাথে যোগ দিন" },
    "back_to_home": { en: "Back to Home", hi: "होम पर वापस", te: "హోమ్‌కు తిరిగి", ta: "முகப்புக்குத் திரும்பு", kn: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ", mr: "होम वर परत", bn: "হোমে ফিরে যান" },
    "price": { en: "Price", hi: "कीमत", te: "ధర", ta: "விலை", kn: "ಬೆಲೆ", mr: "किंमत", bn: "দাম" },
    "district": { en: "District", hi: "जिला", te: "జిల్లా", ta: "மாவட்டம்", kn: "ಜಿಲ್ಲೆ", mr: "जिल्हा", bn: "জেলা" },
    "state": { en: "State", hi: "राज्य", te: "రాష్ట్రం", ta: "மாநிலம்", kn: "ರಾಜ್ಯ", mr: "राज्य", bn: "রাজ্য" },
    "contact": { en: "Contact", hi: "संपर्क", te: "సంప్రదించండి", ta: "தொடர்பு", kn: "ಸಂಪರ್ಕ", mr: "संपर्क", bn: "যোগাযোগ" },
    "contact_number": { en: "Contact Number", hi: "संपर्क नंबर", te: "సంప్రదింపు నంబర్", ta: "தொடர்பு எண்", kn: "ಸಂಪರ್ಕ ಸಂಖ್ಯೆ", mr: "संपर्क क्रमांक", bn: "যোগাযোগ নম্বর" },
    "preview": { en: "Preview", hi: "पूर्वावलोकन", te: "ప్రివ్యూ", ta: "முன்னோட்டம்", kn: "ಮುನ್ನೋಟ", mr: "पूर्वावलोकन", bn: "প্রিভিউ" },
    "publish_post": { en: "Publish Post", hi: "पोस्ट प्रकाशित करें", te: "పోస్ట్ ప్రచురించండి", ta: "இடுகை வெளியிடு", kn: "ಪೋಸ್ಟ್ ಪ್ರಕಟಿಸಿ", mr: "पोस्ट प्रकाशित करा", bn: "পোস্ট প্রকাশ করুন" },
    "publishing": { en: "Publishing...", hi: "प्रकाशित हो रहा है...", te: "ప్రచురిస్తోంది...", ta: "வெளியிடுகிறது...", kn: "ಪ್ರಕಟಿಸಲಾಗುತ್ತಿದೆ...", mr: "प्रकाशित होत आहे...", bn: "প্রকাশ হচ্ছে..." },
    "upload_images": { en: "Upload Images", hi: "छवियां अपलोड करें", te: "చిత్రాలను అప్‌లోడ్ చేయండి", ta: "படங்களைப் பதிவேற்றவும்", kn: "ಚಿತ್ರಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ", mr: "प्रतिमा अपलोड करा", bn: "ছবি আপলোড করুন" },
    "edit_post": { en: "Edit Post", hi: "पोस्ट संपादित करें", te: "పోస్ట్ ఎడిట్ చేయండి", ta: "இடுகையைத் திருத்து", kn: "ಪೋಸ್ಟ್ ಎಡಿಟ್ ಮಾಡಿ", mr: "पोस्ट संपादित करा", bn: "পোস্ট সম্পাদনা করুন" },
    "preview_your_post": { en: "Preview Your Post", hi: "अपनी पोस्ट का पूर्वावलोकन करें", te: "మీ పోస్ట్‌ను ప్రివ్యూ చేయండి", ta: "உங்கள் இடுகையை முன்னோட்டமிடுங்கள்", kn: "ನಿಮ್ಮ ಪೋಸ್ಟ್ ಅನ್ನು ಪೂರ್ವವೀಕ್ಷಿಸಿ", mr: "तुमच्या पोस्टचे पूर्वावलोकन करा", bn: "আপনার পোস্ট প্রিভিউ করুন" },
    "review_before_publishing": { en: "Review your listing before publishing", hi: "प्रकाशित करने से पहले अपनी लिस्टिंग की समीक्षा करें", te: "ప్రచురించడానికి ముందు మీ లిస్టింగ్‌ను సమీక్షించండి", ta: "வெளியிடுவதற்கு முன் உங்கள் பட்டியலை மதிப்பாய்வு செய்யுங்கள்", kn: "ಪ್ರಕಟಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಪಟ್ಟಿಯನ್ನು ಪರಿಶೀಲಿಸಿ", mr: "प्रकाशित करण्यापूर्वी तुमची लिस्टिंग पुनरावलोकन करा", bn: "প্রকাশ করার আগে আপনার তালিকা পর্যালোচনা করুন" },
    "no_image": { en: "No Image", hi: "कोई छवि नहीं", te: "చిత్రం లేదు", ta: "படம் இல்லை", kn: "ಚಿತ್ರ ಇಲ್ಲ", mr: "प्रतिमा नाही", bn: "ছবি নেই" },
    "category": { en: "Category", hi: "श्रेणी", te: "వర్గం", ta: "வகை", kn: "ವರ್ಗ", mr: "श्रेणी", bn: "বিভাগ" }
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

    console.log(`${lang.toUpperCase()}.json: ${updated} new keys added`);
});

console.log('\n✅ Missing translation keys added!');
