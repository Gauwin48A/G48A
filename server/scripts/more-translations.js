const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// More missing keys from page updates
const moreTranslations = {
    // Auth related
    "earn_coins_unlock_rewards": { en: "Earn coins, unlock rewards, and grow your network!", hi: "सिक्के कमाएं, इनाम खोलें, और अपना नेटवर्क बढ़ाएं!", te: "నాణేలు సంపాదించండి, రివార్డ్లు అన్‌లాక్ చేయండి, మీ నెట్‌వర్క్ పెంచుకోండి!", ta: "நாணயங்களைச் சம்பாதியுங்கள், வெகுமதிகளைத் திறக்கவும், உங்கள் நெட்வொர்க்கை வளர்க்கவும்!", kn: "ನಾಣ್ಯಗಳನ್ನು ಗಳಿಸಿ, ರಿವಾರ್ಡ್ಗಳನ್ನು ಅನ್ಲಾಕ್ ಮಾಡಿ, ನಿಮ್ಮ ನೆಟ್ವರ್ಕ್ ಬೆಳೆಸಿ!", mr: "नाणी कमवा, बक्षिसे अनलॉक करा, आणि तुमचे नेटवर्क वाढवा!", bn: "কয়েন উপার্জন করুন, পুরস্কার আনলক করুন, এবং আপনার নেটওয়ার্ক বাড়ান!" },
    "login_to_continue": { en: "Login to Continue", hi: "जारी रखने के लिए लॉगिन करें", te: "కొనసాగించడానికి లాగిన్ అవ్వండి", ta: "தொடர உள்நுழையவும்", kn: "ಮುಂದುವರಿಸಲು ಲಾಗಿನ್ ಮಾಡಿ", mr: "सुरू ठेवण्यासाठी लॉगिन करा", bn: "চালিয়ে যেতে লগইন করুন" },
    "create_account": { en: "Create Account", hi: "खाता बनाएं", te: "ఖాతా సృష్టించండి", ta: "கணக்கை உருவாக்கு", kn: "ಖಾತೆ ರಚಿಸಿ", mr: "खाते तयार करा", bn: "অ্যাকাউন্ট তৈরি করুন" },

    // Referrals
    "your_referrals": { en: "Your Referrals", hi: "आपके रेफरल", te: "మీ రెఫరల్స్", ta: "உங்கள் பரிந்துரைகள்", kn: "ನಿಮ್ಮ ರೆಫರಲ್ಗಳು", mr: "तुमचे रेफरल्स", bn: "আপনার রেফারেলস" },
    "no_referrals_yet": { en: "No referrals yet. Share your code to start earning!", hi: "अभी कोई रेफरल नहीं। कमाई शुरू करने के लिए अपना कोड साझा करें!", te: "ఇంకా రెఫరల్స్ లేవు. సంపాదించడం ప్రారంభించడానికి మీ కోడ్ షేర్ చేయండి!", ta: "இன்னும் பரிந்துரைகள் இல்லை. சம்பாதிக்க உங்கள் குறியீட்டைப் பகிரவும்!", kn: "ಇನ್ನೂ ರೆಫರಲ್ಗಳಿಲ್ಲ. ಗಳಿಸಲು ನಿಮ್ಮ ಕೋಡ್ ಹಂಚಿಕೊಳ್ಳಿ!", mr: "अद्याप रेफरल नाहीत. कमाई सुरू करण्यासाठी तुमचा कोड शेअर करा!", bn: "এখনও কোনো রেফারেল নেই। উপার্জন শুরু করতে আপনার কোড শেয়ার করুন!" },
    "share_your_code": { en: "Share Your Code", hi: "अपना कोड साझा करें", te: "మీ కోడ్ షేర్ చేయండి", ta: "உங்கள் குறியீட்டைப் பகிரவும்", kn: "ನಿಮ್ಮ ಕೋಡ್ ಹಂಚಿಕೊಳ್ಳಿ", mr: "तुमचा कोड शेअर करा", bn: "আপনার কোড শেয়ার করুন" },

    // More common UI
    "no_posts": { en: "No posts to display", hi: "दिखाने के लिए कोई पोस्ट नहीं", te: "చూపించడానికి పోస్ట్‌లు లేవు", ta: "காட்ட இடுகைகள் இல்லை", kn: "ಪ್ರದರ್ಶಿಸಲು ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ", mr: "दाखवण्यासाठी पोस्ट नाहीत", bn: "দেখানোর জন্য কোনো পোস্ট নেই" },
    "image": { en: "Image", hi: "छवि", te: "చిత్రం", ta: "படம்", kn: "ಚಿತ್ರ", mr: "प्रतिमा", bn: "ছবি" },
    "view_details": { en: "View Details", hi: "विवरण देखें", te: "వివరాలు చూడండి", ta: "விவரங்களைக் காண்க", kn: "ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ", mr: "तपशील पहा", bn: "বিস্তারিত দেখুন" },
    "view_more": { en: "View More", hi: "और देखें", te: "మరింత చూడండి", ta: "மேலும் காண்க", kn: "ಇನ್ನಷ್ಟು ನೋಡಿ", mr: "अधिक पहा", bn: "আরও দেখুন" },
    "no_description": { en: "No description", hi: "कोई विवरण नहीं", te: "వివరణ లేదు", ta: "விளக்கம் இல்லை", kn: "ವಿವರಣೆ ಇಲ್ಲ", mr: "वर्णन नाही", bn: "কোনো বিবরণ নেই" },
    "like": { en: "Like", hi: "पसंद करें", te: "ఇష్టం", ta: "விரும்பு", kn: "ಇಷ್ಟ", mr: "आवडले", bn: "পছন্দ" },
    "share": { en: "Share", hi: "साझा करें", te: "షేర్ చేయండి", ta: "பகிரவும்", kn: "ಹಂಚಿಕೊಳ್ಳಿ", mr: "शेअर करा", bn: "শেয়ার করুন" },
    "interested": { en: "Interested", hi: "रुचि है", te: "ఆసక్తి", ta: "ஆர்வம்", kn: "ಆಸಕ್ತಿ", mr: "रस आहे", bn: "আগ্রহী" },

    // Location
    "location": { en: "Location", hi: "स्थान", te: "స్థానం", ta: "இடம்", kn: "ಸ್ಥಳ", mr: "स्थान", bn: "অবস্থান" },
    "allow_location_access": { en: "Allow Location Access", hi: "स्थान एक्सेस की अनुमति दें", te: "లొకేషన్ యాక్సెస్ అనుమతించండి", ta: "இருப்பிட அணுகலை அனுமதிக்கவும்", kn: "ಸ್ಥಳ ಪ್ರವೇಶ ಅನುಮತಿಸಿ", mr: "स्थान प्रवेश अनुमती द्या", bn: "অবস্থান অ্যাক্সেস অনুমতি দিন" },

    // Tab names already added
    "overview": { en: "Overview", hi: "अवलोकन", te: "అవలోకనం", ta: "மேலோட்டம்", kn: "ಅವಲೋಕನ", mr: "विहंगावलोकन", bn: "সংক্ষিপ্ত বিবরণ" },
    "referrals": { en: "Referrals", hi: "रेफरल", te: "రెఫరల్స్", ta: "பரிந்துரைகள்", kn: "ರೆಫರಲ್ಗಳು", mr: "रेफरल्स", bn: "রেফারেল" },
    "milestones": { en: "Milestones", hi: "माइलस्टोन", te: "మైలురాళ్ళు", ta: "மைல்கற்கள்", kn: "ಮೈಲಿಗಲ್ಲುಗಳು", mr: "टप्पे", bn: "মাইলস্টোন" },

    // Price/Product
    "price": { en: "Price", hi: "कीमत", te: "ధర", ta: "விலை", kn: "ಬೆಲೆ", mr: "किंमत", bn: "মূল্য" },
    "category": { en: "Category", hi: "श्रेणी", te: "వర్గం", ta: "வகை", kn: "ವರ್ಗ", mr: "श्रेणी", bn: "বিভাগ" },
    "condition": { en: "Condition", hi: "स्थिति", te: "పరిస్థితి", ta: "நிலை", kn: "ಸ್ಥಿತಿ", mr: "स्थिती", bn: "অবস্থা" },
    "new": { en: "New", hi: "नया", te: "కొత్త", ta: "புதியது", kn: "ಹೊಸ", mr: "नवीन", bn: "নতুন" },
    "used": { en: "Used", hi: "इस्तेमाल किया हुआ", te: "ఉపయోగించినది", ta: "பயன்படுத்தியது", kn: "ಬಳಸಿದ", mr: "वापरलेले", bn: "ব্যবহৃত" },
    "unknown": { en: "Unknown", hi: "अज्ञात", te: "తెలియదు", ta: "தெரியாத", kn: "ಅಪರಿಚಿತ", mr: "अज्ञात", bn: "অজানা" },
    "verified": { en: "Verified", hi: "सत्यापित", te: "ధృవీకరించబడింది", ta: "சரிபார்க்கப்பட்டது", kn: "ಪರಿಶೀಲಿಸಲಾಗಿದೆ", mr: "सत्यापित", bn: "যাচাইকৃত" },

    // All Posts / Feed
    "all_posts": { en: "All Posts", hi: "सभी पोस्ट", te: "అన్ని పోస్ట్‌లు", ta: "அனைத்து இடுகைகளும்", kn: "ಎಲ್ಲಾ ಪೋಸ್ಟ್‌ಗಳು", mr: "सर्व पोस्ट", bn: "সব পোস্ট" },
    "no_posts_available": { en: "No posts available", hi: "कोई पोस्ट उपलब्ध नहीं", te: "పోస్ట్‌లు అందుబాటులో లేవు", ta: "இடுகைகள் கிடைக்கவில்லை", kn: "ಪೋಸ್ಟ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲ", mr: "पोस्ट उपलब्ध नाहीत", bn: "কোনো পোস্ট নেই" },
    "great_deals": { en: "Great Deals", hi: "शानदार डील", te: "గొప్ప ఆఫర్లు", ta: "சிறந்த ஒப்பந்தங்கள்", kn: "ಅದ್ಭುತ ಡೀಲ್‌ಗಳು", mr: "उत्तम ऑफर", bn: "দুর্দান্ত ডিল" },
    "up_to_off": { en: "Up to 50% off on selected items", hi: "चुनिंदा आइटम पर 50% तक की छूट", te: "ఎంపిక చేసిన ఐటెమ్స్ పై 50% వరకు తగ్గింపు", ta: "தேர்ந்தெடுக்கப்பட்ட பொருட்களில் 50% வரை தள்ளுபடி", kn: "ಆಯ್ಕೆಮಾಡಿದ ಐಟಂಗಳಲ್ಲಿ 50% ವರೆಗೆ ರಿಯಾಯಿತಿ", mr: "निवडक आयटमवर 50% पर्यंत सूट", bn: "নির্বাচিত আইটেমে 50% পর্যন্ত ছাড়" },
    "shop_now": { en: "Shop Now", hi: "अभी खरीदें", te: "ఇప్పుడు షాప్ చేయండి", ta: "இப்போது வாங்கு", kn: "ಈಗ ಶಾಪ್ ಮಾಡಿ", mr: "आता खरेदी करा", bn: "এখনই কিনুন" },
    "sponsored_deals": { en: "Sponsored Deals", hi: "प्रायोजित डील", te: "స్పాన్సర్డ్ డీల్స్", ta: "ஸ்பான்சர் செய்யப்பட்ட ஒப்பந்தங்கள்", kn: "ಪ್ರಾಯೋಜಿತ ಡೀಲ್‌ಗಳು", mr: "प्रायोजित ऑफर", bn: "স্পন্সরড ডিল" },
    "no_sponsored_deals": { en: "No sponsored deals", hi: "कोई प्रायोजित डील नहीं", te: "స్పాన్సర్డ్ డీల్స్ లేవు", ta: "ஸ்பான்சர் செய்யப்பட்ட ஒப்பந்தங்கள் இல்லை", kn: "ಪ್ರಾಯೋಜಿತ ಡೀಲ್ಗಳಿಲ್ಲ", mr: "प्रायोजित ऑफर नाहीत", bn: "কোনো স্পন্সরড ডিল নেই" },
    "my_recommendations": { en: "My Recommendations", hi: "मेरी अनुशंसाएं", te: "నా సిఫార్సులు", ta: "என் பரிந்துரைகள்", kn: "ನನ್ನ ಶಿಫಾರಸುಗಳು", mr: "माझ्या शिफारसी", bn: "আমার সুপারিশ" },
    "personalized_posts": { en: "Personalized posts for you", hi: "आपके लिए व्यक्तिगत पोस्ट", te: "మీ కోసం వ్యక్తిగత పోస్ట్లు", ta: "உங்களுக்கான தனிப்பயனாக்கப்பட்ட இடுகைகள்", kn: "ನಿಮಗಾಗಿ ವೈಯಕ್ತಿಕ ಪೋಸ್ಟ್‌ಗಳು", mr: "तुमच्यासाठी वैयक्तिकृत पोस्ट", bn: "আপনার জন্য ব্যক্তিগতকৃত পোস্ট" },
    "my_home": { en: "My Home", hi: "मेरा घर", te: "నా హోమ్", ta: "என் வீடு", kn: "ನನ್ನ ಮನೆ", mr: "माझे होम", bn: "আমার হোম" },
    "activity_stats": { en: "Your activity and stats", hi: "आपकी गतिविधि और आंकड़े", te: "మీ యాక్టివిటీ మరియు స్టాట్స్", ta: "உங்கள் செயல்பாடு மற்றும் புள்ளிவிவரங்கள்", kn: "ನಿಮ್ಮ ಚಟುವಟಿಕೆ ಮತ್ತು ಅಂಕಿಅಂಶಗಳು", mr: "तुमची क्रियाकलाप आणि आकडेवारी", bn: "আপনার কার্যকলাপ এবং পরিসংখ্যান" }
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

    Object.keys(moreTranslations).forEach(key => {
        if (moreTranslations[key][lang]) {
            content[key] = moreTranslations[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys added/updated`);
});

console.log('\n✅ More translations complete!');
