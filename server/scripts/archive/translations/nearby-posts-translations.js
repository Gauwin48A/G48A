const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

/*
 * NEARBY POSTS & REMAINING PAGE TRANSLATIONS
 */

const translations = {
    // NearbyPosts page
    "nearby_posts": {
        en: "Nearby Posts",
        hi: "आस-पास के पोस्ट",
        te: "సమీపంలోని పోస్ట్‌లు",
        ta: "அருகிலுள்ள இடுகைகள்",
        kn: "ಹತ್ತಿರದ ಪೋಸ್ಟ್‌ಗಳು",
        mr: "जवळचे पोस्ट",
        bn: "কাছের পোস্ট"
    },
    "find_items_close": {
        en: "Find items close to you",
        hi: "अपने पास आइटम खोजें",
        te: "మీకు సమీపంలో వస్తువులను కనుగొనండి",
        ta: "உங்களுக்கு அருகில் பொருட்களைக் கண்டறியுங்கள்",
        kn: "ನಿಮ್ಮ ಹತ್ತಿರ ವಸ್ತುಗಳನ್ನು ಹುಡುಕಿ",
        mr: "तुमच्या जवळ वस्तू शोधा",
        bn: "আপনার কাছের আইটেম খুঁজুন"
    },
    "search_radius": {
        en: "Search Radius",
        hi: "खोज त्रिज्या",
        te: "శోధన వ్యాసార్థం",
        ta: "தேடல் ஆரம்",
        kn: "ಹುಡುಕಾಟ ತ್ರಿಜ್ಯ",
        mr: "शोध त्रिज्या",
        bn: "অনুসন্ধান ব্যাসার্ধ"
    },
    "location_access_required": {
        en: "Location Access Required",
        hi: "स्थान एक्सेस आवश्यक",
        te: "లొకేషన్ యాక్సెస్ అవసరం",
        ta: "இட அணுகல் தேவை",
        kn: "ಸ್ಥಳ ಪ್ರವೇಶ ಅಗತ್ಯ",
        mr: "स्थान प्रवेश आवश्यक",
        bn: "অবস্থান অ্যাক্সেস প্রয়োজন"
    },
    "need_location_nearby": {
        en: "We need your location to show nearby items",
        hi: "आस-पास के आइटम दिखाने के लिए हमें आपका स्थान चाहिए",
        te: "సమీపంలోని వస్తువులను చూపించడానికి మీ లొకేషన్ అవసరం",
        ta: "அருகிலுள்ள பொருட்களைக் காட்ட உங்கள் இருப்பிடம் தேவை",
        kn: "ಹತ್ತಿರದ ವಸ್ತುಗಳನ್ನು ತೋರಿಸಲು ನಿಮ್ಮ ಸ್ಥಳ ಅಗತ್ಯ",
        mr: "जवळचे आयटम दाखवण्यासाठी तुमचे स्थान आवश्यक आहे",
        bn: "কাছের আইটেম দেখাতে আপনার অবস্থান প্রয়োজন"
    },
    "enable_location": {
        en: "Enable Location",
        hi: "स्थान सक्षम करें",
        te: "లొకేషన్ ఎనేబుల్ చేయండి",
        ta: "இருப்பிடத்தை இயக்கு",
        kn: "ಸ್ಥಳವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
        mr: "स्थान सक्षम करा",
        bn: "অবস্থান সক্ষম করুন"
    },
    "finding_items_near": {
        en: "Finding items near you...",
        hi: "आपके पास आइटम खोजा जा रहा है...",
        te: "మీ సమీపంలో వస్తువులను కనుగొంటోంది...",
        ta: "உங்களுக்கு அருகில் பொருட்களைக் கண்டறிகிறது...",
        kn: "ನಿಮ್ಮ ಹತ್ತಿರ ವಸ್ತುಗಳನ್ನು ಹುಡುಕುತ್ತಿದೆ...",
        mr: "तुमच्या जवळ आयटम शोधत आहे...",
        bn: "আপনার কাছে আইটেম খুঁজছি..."
    },
    "no_posts_within_radius": {
        en: "No posts found within",
        hi: "के भीतर कोई पोस्ट नहीं मिला",
        te: "లో పోస్ట్‌లు కనుగొనబడలేదు",
        ta: "க்குள் இடுகைகள் கிடைக்கவில்லை",
        kn: "ಒಳಗೆ ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ",
        mr: "आत कोणतेही पोस्ट सापडले नाहीत",
        bn: "এর মধ্যে কোনো পোস্ট পাওয়া যায়নি"
    },
    "try_increasing_radius": {
        en: "Try increasing the search radius",
        hi: "खोज त्रिज्या बढ़ाने का प्रयास करें",
        te: "శోధన వ్యాసార్థాన్ని పెంచడానికి ప్రయత్నించండి",
        ta: "தேடல் ஆரத்தை அதிகரிக்க முயற்சிக்கவும்",
        kn: "ಹುಡುಕಾಟ ತ್ರಿಜ್ಯವನ್ನು ಹೆಚ್ಚಿಸಲು ಪ್ರಯತ್ನಿಸಿ",
        mr: "शोध त्रिज्या वाढवण्याचा प्रयत्न करा",
        bn: "অনুসন্ধান ব্যাসার্ধ বাড়ানোর চেষ্টা করুন"
    },
    "search_within_km": {
        en: "Search within 50 km",
        hi: "50 किमी के भीतर खोजें",
        te: "50 కి.మీ లోపు శోధించండి",
        ta: "50 கி.மீ க்குள் தேடு",
        kn: "50 ಕಿ.ಮೀ ಒಳಗೆ ಹುಡುಕಿ",
        mr: "50 किमी आत शोधा",
        bn: "50 কিমি এর মধ্যে খুঁজুন"
    },
    "no_image": {
        en: "No Image",
        hi: "कोई छवि नहीं",
        te: "చిత్రం లేదు",
        ta: "படம் இல்லை",
        kn: "ಚಿತ್ರವಿಲ್ಲ",
        mr: "प्रतिमा नाही",
        bn: "ছবি নেই"
    },
    "verified": {
        en: "Verified",
        hi: "सत्यापित",
        te: "ధృవీకరించబడింది",
        ta: "சரிபார்க்கப்பட்டது",
        kn: "ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
        mr: "सत्यापित",
        bn: "যাচাইকৃত"
    },
    "seller_label": {
        en: "Seller",
        hi: "विक्रेता",
        te: "విక్రేత",
        ta: "விற்பனையாளர்",
        kn: "ಮಾರಾಟಗಾರ",
        mr: "विक्रेता",
        bn: "বিক্রেতা"
    },
    "unknown_location": {
        en: "Unknown",
        hi: "अज्ञात",
        te: "తెలియదు",
        ta: "தெரியாது",
        kn: "ಅಪರಿಚಿತ",
        mr: "अज्ञात",
        bn: "অজানা"
    },
    "geolocation_not_supported": {
        en: "Geolocation is not supported by your browser",
        hi: "आपका ब्राउज़र जियोलोकेशन का समर्थन नहीं करता",
        te: "మీ బ్రౌజర్ జియోలొకేషన్‌ను సపోర్ట్ చేయదు",
        ta: "உங்கள் உலாவி புவியிடத்தை ஆதரிக்கவில்லை",
        kn: "ನಿಮ್ಮ ಬ್ರೌಸರ್ ಜಿಯೋಲೊಕೇಶನ್ ಅನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ",
        mr: "तुमचा ब्राउझर जियोलोकेशनला समर्थन देत नाही",
        bn: "আপনার ব্রাউজার জিওলোকেশন সমর্থন করে না"
    },
    "enable_location_access": {
        en: "Please enable location access to see nearby posts",
        hi: "आस-पास के पोस्ट देखने के लिए कृपया स्थान एक्सेस सक्षम करें",
        te: "సమీపంలోని పోస్ట్‌లను చూడటానికి దయచేసి లొకేషన్ యాక్సెస్ ఎనేబుల్ చేయండి",
        ta: "அருகிலுள்ள இடுகைகளைக் காண இட அணுகலை இயக்கவும்",
        kn: "ಹತ್ತಿರದ ಪೋಸ್ಟ್‌ಗಳನ್ನು ನೋಡಲು ಸ್ಥಳ ಪ್ರವೇಶವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
        mr: "जवळचे पोस्ट पाहण्यासाठी कृपया स्थान प्रवेश सक्षम करा",
        bn: "কাছের পোস্ট দেখতে অবস্থান অ্যাক্সেস সক্ষম করুন"
    },
    "failed_load_nearby": {
        en: "Failed to load nearby posts. Please try again.",
        hi: "आस-पास के पोस्ट लोड करने में विफल। कृपया पुनः प्रयास करें।",
        te: "సమీపంలోని పోస్ట్‌లను లోడ్ చేయడంలో విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.",
        ta: "அருகிலுள்ள இடுகைகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        kn: "ಹತ್ತಿರದ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        mr: "जवळचे पोस्ट लोड करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.",
        bn: "কাছের পোস্ট লোড করতে ব্যর্থ। আবার চেষ্টা করুন।"
    },

    // Common labels found across pages
    "posts_heading": {
        en: "Posts",
        hi: "पोस्ट",
        te: "పోస్ట్‌లు",
        ta: "இடுகைகள்",
        kn: "ಪೋಸ್ಟ್‌ಗಳು",
        mr: "पोस्ट",
        bn: "পোস্ট"
    },
    "all_posts": {
        en: "All Posts",
        hi: "सभी पोस्ट",
        te: "అన్ని పోస్ట్‌లు",
        ta: "அனைத்து இடுகைகள்",
        kn: "ಎಲ್ಲಾ ಪೋಸ್ಟ್‌ಗಳು",
        mr: "सर्व पोस्ट",
        bn: "সব পোস্ট"
    },
    "owner": {
        en: "Owner",
        hi: "मालिक",
        te: "యజమాని",
        ta: "உரிமையாளர்",
        kn: "ಮಾಲೀಕ",
        mr: "मालक",
        bn: "মালিক"
    },
    "followers": {
        en: "Followers",
        hi: "फॉलोअर्स",
        te: "ఫాలోవర్లు",
        ta: "பின்தொடர்பவர்கள்",
        kn: "ಅನುಯಾಯಿಗಳು",
        mr: "फॉलोअर्स",
        bn: "ফলোয়ার"
    },
    "text": {
        en: "Text",
        hi: "टेक्स्ट",
        te: "టెక్స్ట్",
        ta: "உரை",
        kn: "ಪಠ್ಯ",
        mr: "मजकूर",
        bn: "টেক্সট"
    },
    "image": {
        en: "Image",
        hi: "छवि",
        te: "చిత్రం",
        ta: "படம்",
        kn: "ಚಿತ್ರ",
        mr: "प्रतिमा",
        bn: "ছবি"
    },
    "video": {
        en: "Video",
        hi: "वीडियो",
        te: "వీడియో",
        ta: "வீடியோ",
        kn: "ವೀಡಿಯೊ",
        mr: "व्हिडिओ",
        bn: "ভিডিও"
    },
    "post_button": {
        en: "Post",
        hi: "पोस्ट करें",
        te: "పోస్ట్ చేయండి",
        ta: "பதிவிடு",
        kn: "ಪೋಸ್ಟ್ ಮಾಡಿ",
        mr: "पोस्ट करा",
        bn: "পোস্ট করুন"
    },
    "view_button": {
        en: "View",
        hi: "देखें",
        te: "చూడండి",
        ta: "பார்க்க",
        kn: "ನೋಡಿ",
        mr: "पहा",
        bn: "দেখুন"
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

console.log('\n✅ NEARBY POSTS & REMAINING TRANSLATIONS COMPLETE!');
