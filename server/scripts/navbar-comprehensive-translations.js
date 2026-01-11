const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// COMPREHENSIVE translations for Navbar and all application placeholders/inputs
const translations = {
    // Navbar navigation links
    "home": { en: "Home", hi: "होम", te: "హోమ్", ta: "முகப்பு", kn: "ಮುಖಪುಟ", mr: "होम", bn: "হোম" },
    "feed": { en: "Feed", hi: "फ़ीड", te: "ఫీడ్", ta: "ஃபீட்", kn: "ಫೀಡ್", mr: "फीड", bn: "ফিড" },
    "my_feed": { en: "My Feed", hi: "मेरा फ़ीड", te: "నా ఫీడ్", ta: "என் ஃபீட்", kn: "ನನ್ನ ಫೀಡ್", mr: "माझे फीड", bn: "আমার ফিড" },
    "channels": { en: "Channels", hi: "चैनल", te: "ఛానెల్స్", ta: "சேனல்கள்", kn: "ಚಾನೆಲ್‌ಗಳು", mr: "चॅनेल्स", bn: "চ্যানেল" },
    "my_recommendations": { en: "My Recommendations", hi: "मेरी सिफारिशें", te: "నా సిఫార్సులు", ta: "என் பரிந்துரைகள்", kn: "ನನ್ನ ಶಿಫಾರಸುಗಳು", mr: "माझ्या शिफारसी", bn: "আমার সুপারিশ" },
    "my_home": { en: "My Home", hi: "मेरा होम", te: "నా హోమ్", ta: "என் முகப்பு", kn: "ನನ್ನ ಮುಖಪುಟ", mr: "माझे होम", bn: "আমার হোম" },
    "categories": { en: "Categories", hi: "श्रेणियां", te: "వర్గాలు", ta: "வகைகள்", kn: "ವರ್ಗಗಳು", mr: "श्रेण्या", bn: "বিভাগ" },
    "rewards": { en: "Rewards", hi: "पुरस्कार", te: "రివార్డ్స్", ta: "வெகுமதிகள்", kn: "ಬಹುಮಾನಗಳು", mr: "पुरस्कार", bn: "পুরস্কার" },
    "sell": { en: "Sell", hi: "बेचें", te: "అమ్మండి", ta: "விற்க", kn: "ಮಾರಾಟ", mr: "विका", bn: "বিক্রি" },

    // Search
    "search_placeholder": { en: "Search for products, brands and more", hi: "उत्पाद, ब्रांड और अधिक खोजें", te: "ఉత్పత్తులు, బ్రాండ్లు మరియు మరిన్నింటి కోసం శోధించండి", ta: "தயாரிப்புகள், பிராண்டுகள் மற்றும் பலவற்றைத் தேடுங்கள்", kn: "ಉತ್ಪನ್ನಗಳು, ಬ್ರ್ಯಾಂಡ್‌ಗಳು ಮತ್ತು ಹೆಚ್ಚಿನವುಗಳಿಗಾಗಿ ಹುಡುಕಿ", mr: "उत्पादने, ब्रँड्स आणि बरेच काही शोधा", bn: "পণ্য, ব্র্যান্ড এবং আরও অনেক কিছু অনুসন্ধান করুন" },
    "search": { en: "Search", hi: "खोजें", te: "శోధించు", ta: "தேடு", kn: "ಹುಡುಕು", mr: "शोधा", bn: "অনুসন্ধান" },

    // Categories dropdown
    "all": { en: "All", hi: "सभी", te: "అన్నీ", ta: "அனைத்தும்", kn: "ಎಲ್ಲಾ", mr: "सर्व", bn: "সব" },
    "electronics": { en: "Electronics", hi: "इलेक्ट्रॉनिक्स", te: "ఎలక్ట్రానిక్స్", ta: "எலக்ட்ரானிக்ஸ்", kn: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್", mr: "इलेक्ट्रॉनिक्स", bn: "ইলেকট্রনিক্স" },
    "fashion": { en: "Fashion", hi: "फैशन", te: "ఫ్యాషన్", ta: "ஃபேஷன்", kn: "ಫ್ಯಾಷನ್", mr: "फॅशन", bn: "ফ্যাশন" },
    "furniture": { en: "Furniture", hi: "फर्नीचर", te: "ఫర్నిచర్", ta: "தளவாடங்கள்", kn: "ಪೀಠೋಪಕರಣ", mr: "फर्निचर", bn: "আসবাবপত্র" },
    "mobiles": { en: "Mobiles", hi: "मोबाइल", te: "మొబైల్స్", ta: "மொபைல்கள்", kn: "ಮೊಬೈಲ್‌ಗಳು", mr: "मोबाईल्स", bn: "মোবাইল" },
    "vehicles": { en: "Vehicles", hi: "वाहन", te: "వాహనాలు", ta: "வாகனங்கள்", kn: "ವಾಹನಗಳು", mr: "वाहने", bn: "যানবাহন" },
    "books": { en: "Books", hi: "किताबें", te: "పుస్తకాలు", ta: "புத்தகங்கள்", kn: "ಪುಸ್ತಕಗಳು", mr: "पुस्तके", bn: "বই" },
    "sports": { en: "Sports", hi: "खेल", te: "క్రీడలు", ta: "விளையாட்டு", kn: "ಕ್ರೀಡೆಗಳು", mr: "खेळ", bn: "খেলাধুলা" },
    "home_appliances": { en: "Home Appliances", hi: "घरेलू उपकरण", te: "గృహ ఉపకరణాలు", ta: "வீட்டு உபகரணங்கள்", kn: "ಮನೆ ಉಪಕರಣಗಳು", mr: "घरगुती उपकरणे", bn: "গৃহস্থালী যন্ত্রপাতি" },
    "beauty": { en: "Beauty", hi: "सौंदर्य", te: "బ్యూటీ", ta: "அழகு", kn: "ಸೌಂದರ್ಯ", mr: "सौंदर्य", bn: "সৌন্দর্য" },
    "kids": { en: "Kids", hi: "बच्चे", te: "పిల్లలు", ta: "குழந்தைகள்", kn: "ಮಕ್ಕಳು", mr: "मुले", bn: "শিশু" },
    "more": { en: "More", hi: "और", te: "మరింత", ta: "மேலும்", kn: "ಇನ್ನಷ್ಟು", mr: "अधिक", bn: "আরও" },
    "category": { en: "Category", hi: "श्रेणी", te: "వర్గం", ta: "வகை", kn: "ವರ್ಗ", mr: "श्रेणी", bn: "বিভাগ" },

    // Sort options
    "sort_by": { en: "Sort By", hi: "इसके अनुसार क्रमबद्ध करें", te: "ఇలా క్రమబద్ధీకరించు", ta: "வரிசைப்படுத்து", kn: "ಇದರ ಪ್ರಕಾರ ವಿಂಗಡಿಸಿ", mr: "यानुसार क्रमवारी", bn: "এই অনুসারে সাজান" },
    "most_recent": { en: "Most Recent", hi: "सबसे हाल का", te: "అత్యంత ఇటీవలి", ta: "மிக சமீபத்திய", kn: "ಅತ್ಯಂತ ಇತ್ತೀಚಿನ", mr: "सर्वात अलीकडील", bn: "সাম্প্রতিক" },
    "least_views": { en: "Least Views", hi: "सबसे कम व्यूज", te: "తక్కువ వ్యూలు", ta: "குறைந்த பார்வைகள்", kn: "ಕಡಿಮೆ ವೀಕ್ಷಣೆಗಳು", mr: "सर्वात कमी व्ह्यूज", bn: "সবচেয়ে কম ভিউ" },
    "price_low_high": { en: "Price: Low to High", hi: "मूल्य: कम से अधिक", te: "ధర: తక్కువ నుండి ఎక్కువ", ta: "விலை: குறைவிலிருந்து அதிகம்", kn: "ಬೆಲೆ: ಕಡಿಮೆಯಿಂದ ಹೆಚ್ಚು", mr: "किंमत: कमी ते जास्त", bn: "মূল্য: কম থেকে বেশি" },
    "price_high_low": { en: "Price: High to Low", hi: "मूल्य: अधिक से कम", te: "ధర: ఎక్కువ నుండి తక్కువ", ta: "விலை: அதிகத்திலிருந்து குறைவு", kn: "ಬೆಲೆ: ಹೆಚ್ಚಿನಿಂದ ಕಡಿಮೆ", mr: "किंमत: जास्त ते कमी", bn: "মূল্য: বেশি থেকে কম" },

    // Input placeholders commonly used
    "enter_amount": { en: "Enter amount", hi: "राशि दर्ज करें", te: "మొత్తాన్ని నమోదు చేయండి", ta: "தொகையை உள்ளிடவும்", kn: "ಮೊತ್ತವನ್ನು ನಮೂದಿಸಿ", mr: "रक्कम प्रविष्ट करा", bn: "পরিমাণ লিখুন" },
    "enter_code": { en: "Enter code", hi: "कोड दर्ज करें", te: "కోడ్ నమోదు చేయండి", ta: "குறியீட்டை உள்ளிடவும்", kn: "ಕೋಡ್ ನಮೂದಿಸಿ", mr: "कोड प्रविष्ट करा", bn: "কোড লিখুন" },
    "enter_email": { en: "Enter email", hi: "ईमेल दर्ज करें", te: "ఇమెయిల్ నమోదు చేయండి", ta: "மின்னஞ்சலை உள்ளிடவும்", kn: "ಇಮೇಲ್ ನಮೂದಿಸಿ", mr: "ईमेल प्रविष्ट करा", bn: "ইমেইল লিখুন" },
    "enter_password": { en: "Enter password", hi: "पासवर्ड दर्ज करें", te: "పాస్‌వర్డ్ నమోదు చేయండి", ta: "கடவுச்சொல்லை உள்ளிடவும்", kn: "ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ", mr: "पासवर्ड प्रविष्ट करा", bn: "পাসওয়ার্ড লিখুন" },
    "enter_name": { en: "Enter name", hi: "नाम दर्ज करें", te: "పేరు నమోదు చేయండి", ta: "பெயரை உள்ளிடவும்", kn: "ಹೆಸರನ್ನು ನಮೂದಿಸಿ", mr: "नाव प्रविष्ट करा", bn: "নাম লিখুন" },
    "enter_phone": { en: "Enter phone number", hi: "फोन नंबर दर्ज करें", te: "ఫోన్ నంబర్ నమోదు చేయండి", ta: "தொலைபேசி எண்ணை உள்ளிடவும்", kn: "ಫೋನ್ ನಂಬರ್ ನಮೂದಿಸಿ", mr: "फोन नंबर प्रविष्ट करा", bn: "ফোন নম্বর লিখুন" },
    "enter_address": { en: "Enter address", hi: "पता दर्ज करें", te: "చిరునామా నమోదు చేయండి", ta: "முகவரியை உள்ளிடவும்", kn: "ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ", mr: "पत्ता प्रविष्ट करा", bn: "ঠিকানা লিখুন" },
    "type_message": { en: "Type a message...", hi: "संदेश टाइप करें...", te: "సందేశం టైప్ చేయండి...", ta: "செய்தியை தட்டச்சு செய்யவும்...", kn: "ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...", mr: "संदेश टाईप करा...", bn: "বার্তা টাইপ করুন..." },
    "select_category": { en: "Select Category", hi: "श्रेणी चुनें", te: "వర్గాన్ని ఎంచుకోండి", ta: "வகையைத் தேர்ந்தெடுக்கவும்", kn: "ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ", mr: "श्रेणी निवडा", bn: "বিভাগ নির্বাচন করুন" },
    "select_condition": { en: "Select Condition", hi: "स्थिति चुनें", te: "పరిస్థితిని ఎంచుకోండి", ta: "நிலையைத் தேர్ந்தெடுக்கவும்", kn: "ಸ್ಥಿತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ", mr: "स्थिती निवडा", bn: "অবস্থা নির্বাচন করুন" },
    "select_location": { en: "Select Location", hi: "स्थान चुनें", te: "ప్రదేశాన్ని ఎంచుకోండి", ta: "இடத்தைத் தேர்ந்தெடுக்கவும்", kn: "ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ", mr: "स्थान निवडा", bn: "অবস্থান নির্বাচন করুন" },

    // Common buttons
    "submit": { en: "Submit", hi: "जमा करें", te: "సమర్పించు", ta: "சமர்ப்பி", kn: "ಸಲ್ಲಿಸು", mr: "सबमिट करा", bn: "জমা দিন" },
    "cancel": { en: "Cancel", hi: "रद्द करें", te: "రద్దు చేయి", ta: "ரத்து செய்", kn: "ರದ್ದುಮಾಡು", mr: "रद्द करा", bn: "বাতিল" },
    "save": { en: "Save", hi: "सहेजें", te: "సేవ్ చేయి", ta: "சேமி", kn: "ಉಳಿಸು", mr: "जतन करा", bn: "সংরক্ষণ" },
    "delete": { en: "Delete", hi: "हटाएं", te: "తొలగించు", ta: "நீக்கு", kn: "ಅಳಿಸು", mr: "हटवा", bn: "মুছুন" },
    "edit": { en: "Edit", hi: "संपादित करें", te: "సవరించు", ta: "திருத்து", kn: "ಸಂಪಾದಿಸು", mr: "संपादित करा", bn: "সম্পাদনা" },
    "confirm": { en: "Confirm", hi: "पुष्टि करें", te: "నిర్ధారించు", ta: "உறுதிப்படுத்து", kn: "ದೃಢೀಕರಿಸು", mr: "पुष्टी करा", bn: "নিশ্চিত করুন" },
    "close": { en: "Close", hi: "बंद करें", te: "మూసివేయి", ta: "மூடு", kn: "ಮುಚ್ಚು", mr: "बंद करा", bn: "বন্ধ করুন" },
    "back": { en: "Back", hi: "वापस", te: "వెనుకకు", ta: "பின்செல்", kn: "ಹಿಂದೆ", mr: "मागे", bn: "পেছনে" },
    "next": { en: "Next", hi: "अगला", te: "తదుపరి", ta: "அடுத்து", kn: "ಮುಂದೆ", mr: "पुढे", bn: "পরবর্তী" },
    "continue": { en: "Continue", hi: "जारी रखें", te: "కొనసాగించు", ta: "தொடரவும்", kn: "ಮುಂದುವರಿಸು", mr: "सुरू ठेवा", bn: "চালিয়ে যান" },
    "view_all": { en: "View All", hi: "सभी देखें", te: "అన్నీ చూడండి", ta: "அனைத்தையும் காண்க", kn: "ಎಲ್ಲಾ ನೋಡಿ", mr: "सर्व पहा", bn: "সব দেখুন" },
    "load_more": { en: "Load More", hi: "और लोड करें", te: "మరింత లోడ్ చేయి", ta: "மேலும் ஏற்று", kn: "ಹೆಚ್ಚು ಲೋಡ್ ಮಾಡಿ", mr: "अधिक लोड करा", bn: "আরও লোড করুন" },

    // Form labels
    "title": { en: "Title", hi: "शीर्षक", te: "శీర్షిక", ta: "தலைப்பு", kn: "ಶೀರ್ಷಿಕೆ", mr: "शीर्षक", bn: "শিরোনাম" },
    "price": { en: "Price", hi: "मूल्य", te: "ధర", ta: "விலை", kn: "ಬೆಲೆ", mr: "किंमत", bn: "মূল্য" },
    "location": { en: "Location", hi: "स्थान", te: "స్థానం", ta: "இடம்", kn: "ಸ್ಥಳ", mr: "स्थान", bn: "অবস্থান" },
    "condition": { en: "Condition", hi: "स्थिति", te: "పరిస్థితి", ta: "நிலை", kn: "ಸ್ಥಿತಿ", mr: "स्थिती", bn: "অবস্থা" },
    "new": { en: "New", hi: "नया", te: "కొత్త", ta: "புதிய", kn: "ಹೊಸ", mr: "नवीन", bn: "নতুন" },
    "like_new": { en: "Like New", hi: "नए जैसा", te: "కొత్తది వంటి", ta: "புதியது போன்ற", kn: "ಹೊಸದಂತೆ", mr: "नवीन सारखे", bn: "নতুনের মতো" },
    "good": { en: "Good", hi: "अच्छा", te: "మంచిది", ta: "நல்ல", kn: "ಒಳ್ಳೆಯದು", mr: "चांगले", bn: "ভালো" },
    "fair": { en: "Fair", hi: "ठीक", te: "సాధారణం", ta: "சராசரி", kn: "ಸಾಮಾನ್ಯ", mr: "ठीक", bn: "মোটামুটি" },

    // Status messages
    "active": { en: "Active", hi: "सक्रिय", te: "యాక్టివ్", ta: "செயலில்", kn: "ಸಕ್ರಿಯ", mr: "सक्रिय", bn: "সক্রিয়" },
    "sold": { en: "Sold", hi: "बिका हुआ", te: "విక్రయించబడింది", ta: "விற்கப்பட்டது", kn: "ಮಾರಾಟವಾಗಿದೆ", mr: "विकले गेले", bn: "বিক্রি হয়েছে" },
    "pending": { en: "Pending", hi: "लंबित", te: "పెండింగ్", ta: "நிலுவையில்", kn: "ಬಾಕಿ", mr: "प्रलंबित", bn: "মুলতুবি" },

    // Profile menu
    "profile": { en: "Profile", hi: "प्रोफाइल", te: "ప్రొఫైల్", ta: "சுயவிவரம்", kn: "ಪ್ರೊಫೈಲ್", mr: "प्रोफाइल", bn: "প্রোফাইল" },
    "notifications": { en: "Notifications", hi: "सूचनाएं", te: "నోటిఫికేషన్లు", ta: "அறிவிப்புகள்", kn: "ಅಧಿಸೂಚನೆಗಳು", mr: "सूचना", bn: "বিজ্ঞপ্তি" },
    "cart": { en: "Cart", hi: "कार्ट", te: "కార్ట్", ta: "கூடை", kn: "ಕಾರ್ಟ್", mr: "कार्ट", bn: "কার্ট" },
    "menu": { en: "Menu", hi: "मेनू", te: "మెనూ", ta: "மெனு", kn: "ಮೆನು", mr: "मेनू", bn: "মেনু" },
    "logout": { en: "Logout", hi: "लॉगआउट", te: "లాగ్ అవుట్", ta: "வெளியேறு", kn: "ಲಾಗ್ ಔಟ್", mr: "लॉगआउट", bn: "লগআউট" },
    "settings": { en: "Settings", hi: "सेटिंग्स", te: "సెట్టింగ్‌లు", ta: "அமைப்புகள்", kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", mr: "सेटिंग्ज", bn: "সেটিংস" }
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

console.log('\n✅ Navbar + Application-wide translations added!');
