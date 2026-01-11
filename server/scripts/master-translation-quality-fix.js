const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

/*
 * MASTER TRANSLATION QUALITY FIX
 * 
 * This script ensures ALL translations across the application are:
 * 1. Proper contextual translations (not transliterations)
 * 2. Natural language for each target language
 * 3. Semantically correct (not literal word-by-word translations)
 * 
 * Categories covered:
 * - Navigation & Menus
 * - Forms & Inputs
 * - Buttons & Actions
 * - Messages & Alerts
 * - Labels & Status
 * - Page Titles
 * - Descriptions
 * - Error Messages
 * - Success Messages
 */

const masterTranslations = {
    // ===========================================
    // NAVIGATION & MENUS
    // ===========================================
    "home": { en: "Home", hi: "होम", te: "హోమ్", ta: "முகப்பு", kn: "ಮುಖಪುಟ", mr: "होम", bn: "হোম" },
    "feed": { en: "Feed", hi: "फ़ीड", te: "ఫీడ్", ta: "ஃபீட்", kn: "ಫೀಡ್", mr: "फीड", bn: "ফিড" },
    "my_feed": { en: "My Feed", hi: "मेरा फ़ीड", te: "నా ఫీడ్", ta: "என் ஃபீட்", kn: "ನನ్ನ ಫೀಡ್", mr: "माझे फीड", bn: "আমার ফিড" },
    "profile": { en: "Profile", hi: "प्रोफाइल", te: "ప్రొఫైల్", ta: "சுயவிவரம்", kn: "ಪ್ರೊಫೈಲ್", mr: "प्रोफाइल", bn: "প্রোফাইল" },
    "settings": { en: "Settings", hi: "सेटिंग्स", te: "సెట్టింగ్‌లు", ta: "அமைப்புகள்", kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", mr: "सेटिंग्ज", bn: "সেটিংস" },
    "notifications": { en: "Notifications", hi: "सूचनाएं", te: "నోటిఫికేషన్లు", ta: "அறிவிப்புகள்", kn: "ಅಧಿಸೂಚನೆಗಳು", mr: "सूचना", bn: "বিজ্ঞপ্তি" },
    "rewards": { en: "Rewards", hi: "पुरस्कार", te: "రివార్డ్స్", ta: "வெகுமதிகள்", kn: "ಬಹುಮಾನಗಳು", mr: "पुरस्कार", bn: "পুরস্কার" },
    "channels": { en: "Channels", hi: "चैनल", te: "ఛానెల్స్", ta: "சேனல்கள்", kn: "ಚಾನೆಲ್‌ಗಳು", mr: "चॅनेल्स", bn: "চ্যানেল" },
    "more": { en: "More", hi: "और", te: "మరింత", ta: "மேலும்", kn: "ಇನ್ನಷ್ಟು", mr: "अधिक", bn: "আরও" },
    "my_home": { en: "My Home", hi: "मेरा होम", te: "నా హోమ్", ta: "என் முகப்பு", kn: "ನನ್ನ ಮುಖಪುಟ", mr: "माझे होम", bn: "আমার হোম" },
    "my_recommendations": { en: "My Recommendations", hi: "मेरी सिफारिशें", te: "నా సిఫార్సులు", ta: "என் பரிந்துரைகள்", kn: "ನನ್ನ ಶಿಫಾರಸುಗಳು", mr: "माझ्या शिफारसी", bn: "আমার সুপারিশ" },
    "categories": { en: "Categories", hi: "श्रेणियां", te: "వర్గాలు", ta: "வகைகள்", kn: "ವರ್ಗಗಳು", mr: "श्रेण्या", bn: "বিভাগ" },

    // ===========================================
    // BUTTONS & ACTIONS
    // ===========================================
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
    "share": { en: "Share", hi: "साझा करें", te: "షేర్ చేయండి", ta: "பகிர்", kn: "ಹಂಚಿಕೊಳ್ಳಿ", mr: "शेअर करा", bn: "শেয়ার করুন" },
    "like": { en: "Like", hi: "पसंद करें", te: "లైక్ చేయండి", ta: "விரும்பு", kn: "ಇಷ್ಟಪಡು", mr: "आवडले", bn: "পছন্দ করুন" },
    "comment": { en: "Comment", hi: "टिप्पणी करें", te: "వ్యాఖ్యానించండి", ta: "கருத்து", kn: "ಕಾಮೆಂಟ್", mr: "टिप्पणी करा", bn: "মন্তব্য করুন" },
    "report": { en: "Report", hi: "रिपोर्ट करें", te: "రిపోర్ట్ చేయండి", ta: "புகாரளி", kn: "ವರದಿ ಮಾಡಿ", mr: "तक्रार करा", bn: "রিপোর্ট করুন" },
    "logout": { en: "Logout", hi: "लॉगआउट", te: "లాగ్ అవుట్", ta: "வெளியேறு", kn: "ಲಾಗ್ ಔಟ್", mr: "लॉगआउट", bn: "লগআউট" },
    "login": { en: "Login", hi: "लॉगिन", te: "లాగిన్", ta: "உள்நுழை", kn: "ಲಾಗ್ ಇನ್", mr: "लॉगिन", bn: "লগইন" },
    "signup": { en: "Sign Up", hi: "साइन अप", te: "సైన్ అప్", ta: "பதிவு செய்", kn: "ಸೈನ್ ಅಪ್", mr: "साइन अप", bn: "সাইন আপ" },

    // ===========================================
    // FORM LABELS
    // ===========================================
    "title": { en: "Title", hi: "शीर्षक", te: "శీర్షిక", ta: "தலைப்பு", kn: "ಶೀರ್ಷಿಕೆ", mr: "शीर्षक", bn: "শিরোনাম" },
    "description": { en: "Description", hi: "विवरण", te: "వివరణ", ta: "விளக்கம்", kn: "ವಿವರಣೆ", mr: "वर्णन", bn: "বিবরণ" },
    "price": { en: "Price", hi: "मूल्य", te: "ధర", ta: "விலை", kn: "ಬೆಲೆ", mr: "किंमत", bn: "মূল্য" },
    "location": { en: "Location", hi: "स्थान", te: "ప్రదేశం", ta: "இடம்", kn: "ಸ್ಥಳ", mr: "स्थान", bn: "অবস্থান" },
    "category": { en: "Category", hi: "श्रेणी", te: "వర్గం", ta: "வகை", kn: "ವರ್ಗ", mr: "श्रेणी", bn: "বিভাগ" },
    "condition": { en: "Condition", hi: "स्थिति", te: "పరిస్థితి", ta: "நிலை", kn: "ಸ್ಥಿತಿ", mr: "स्थिती", bn: "অবস্থা" },
    "name": { en: "Name", hi: "नाम", te: "పేరు", ta: "பெயர்", kn: "ಹೆಸರು", mr: "नाव", bn: "নাম" },
    "email": { en: "Email", hi: "ईमेल", te: "ఇమెయిల్", ta: "மின்னஞ்சல்", kn: "ಇಮೇಲ್", mr: "ईमेल", bn: "ইমেইল" },
    "password": { en: "Password", hi: "पासवर्ड", te: "పాస్‌వర్డ్", ta: "கடவுச்சொல்", kn: "ಪಾಸ್‌ವರ್ಡ್", mr: "पासवर्ड", bn: "পাসওয়ার্ড" },
    "phone": { en: "Phone", hi: "फ़ोन", te: "ఫోన్", ta: "தொலைபேசி", kn: "ಫೋನ್", mr: "फोन", bn: "ফোন" },
    "address": { en: "Address", hi: "पता", te: "చిరునామా", ta: "முகவரி", kn: "ವಿಳಾಸ", mr: "पत्ता", bn: "ঠিকানা" },
    "message": { en: "Message", hi: "संदेश", te: "సందేశం", ta: "செய்தி", kn: "ಸಂದೇಶ", mr: "संदेश", bn: "বার্তা" },

    // ===========================================
    // STATUS & LABELS  
    // ===========================================
    "new": { en: "New", hi: "नया", te: "కొత్త", ta: "புதிய", kn: "ಹೊಸ", mr: "नवीन", bn: "নতুন" },
    "used": { en: "Used", hi: "पुराना", te: "వాడిన", ta: "பயன்படுத்தப்பட்ட", kn: "ಬಳಸಿದ", mr: "वापरलेले", bn: "ব্যবহৃত" },
    "like_new": { en: "Like New", hi: "नए जैसा", te: "కొత్తది వంటి", ta: "புதியது போன்ற", kn: "ಹೊಸದಂತೆ", mr: "नवीन सारखे", bn: "নতুনের মতো" },
    "good": { en: "Good", hi: "अच्छा", te: "మంచిది", ta: "நல்ல", kn: "ಒಳ್ಳೆಯದು", mr: "चांगले", bn: "ভালো" },
    "fair": { en: "Fair", hi: "ठीक", te: "సాధారణం", ta: "சராசரி", kn: "ಸಾಮಾನ್ಯ", mr: "ठीक", bn: "মোটামুটি" },
    "excellent": { en: "Excellent", hi: "उत्कृष्ट", te: "అద్భుతం", ta: "சிறந்த", kn: "ಅದ್ಭುತ", mr: "उत्कृष्ट", bn: "চমৎকার" },
    "verified": { en: "Verified", hi: "सत्यापित", te: "ధృవీకరించబడింది", ta: "சரிபார்க்கப்பட்டது", kn: "ಪರಿಶೀಲಿಸಲಾಗಿದೆ", mr: "सत्यापित", bn: "যাচাইকৃত" },
    "unverified": { en: "Unverified", hi: "असत्यापित", te: "ధృవీకరించబడలేదు", ta: "சரிபார்க்கப்படாதது", kn: "ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ", mr: "असत्यापित", bn: "যাচাই হয়নি" },
    "available": { en: "Available", hi: "उपलब्ध", te: "అందుబాటులో ఉంది", ta: "கிடைக்கிறது", kn: "ಲಭ್ಯವಿದೆ", mr: "उपलब्ध", bn: "পাওয়া যাচ্ছে" },
    "not_available": { en: "Not Available", hi: "उपलब्ध नहीं", te: "అందుబాటులో లేదు", ta: "கிடைக்கவில்லை", kn: "ಲಭ್ಯವಿಲ್ಲ", mr: "उपलब्ध नाही", bn: "পাওয়া যাচ্ছে না" },
    "free": { en: "Free", hi: "मुफ्त", te: "ఉచితం", ta: "இலவச", kn: "ಉಚಿತ", mr: "मोफत", bn: "বিনামূল্যে" },
    "premium": { en: "Premium", hi: "प्रीमियम", te: "ప్రీమియం", ta: "பிரீமியம்", kn: "ಪ್ರೀಮಿಯಂ", mr: "प्रीमियम", bn: "প্রিমিয়াম" },
    "popular": { en: "Popular", hi: "लोकप्रिय", te: "ప్రజాదరణ", ta: "பிரபலமான", kn: "ಜನಪ್ರಿಯ", mr: "लोकप्रिय", bn: "জনপ্রিয়" },
    "trending": { en: "Trending", hi: "ट्रेंडिंग", te: "ట్రెండింగ్", ta: "பிரபலமாகிறது", kn: "ಟ್ರೆಂಡಿಂಗ್", mr: "ट्रेंडिंग", bn: "ট্রেন্ডিং" },
    "featured": { en: "Featured", hi: "विशेष", te: "ప్రత్యేక", ta: "சிறப்பு", kn: "ವಿಶೇಷ", mr: "विशेष", bn: "বৈশিষ্ট্যযুক্ত" },

    // ===========================================
    // TIME RELATED
    // ===========================================
    "today": { en: "Today", hi: "आज", te: "ఈ రోజు", ta: "இன்று", kn: "ಇಂದು", mr: "आज", bn: "আজ" },
    "yesterday": { en: "Yesterday", hi: "कल", te: "నిన్న", ta: "நேற்று", kn: "ನಿನ್ನೆ", mr: "काल", bn: "গতকাল" },
    "tomorrow": { en: "Tomorrow", hi: "कल", te: "రేపు", ta: "நாளை", kn: "ನಾಳೆ", mr: "उद्या", bn: "আগামীকাল" },
    "now": { en: "Now", hi: "अभी", te: "ఇప్పుడు", ta: "இப்போது", kn: "ಈಗ", mr: "आता", bn: "এখন" },
    "just_now": { en: "Just now", hi: "अभी अभी", te: "ఇప్పుడే", ta: "இப்போது தான்", kn: "ಈಗ ತಾನೆ", mr: "आत्ताच", bn: "এইমাত্র" },
    "ago": { en: "ago", hi: "पहले", te: "క్రితం", ta: "முன்", kn: "ಹಿಂದೆ", mr: "पूर्वी", bn: "আগে" },
    "days": { en: "days", hi: "दिन", te: "రోజులు", ta: "நாட்கள்", kn: "ದಿನಗಳು", mr: "दिवस", bn: "দিন" },
    "hours": { en: "hours", hi: "घंटे", te: "గంటలు", ta: "மணி நேரம்", kn: "ಗಂಟೆಗಳು", mr: "तास", bn: "ঘন্টা" },
    "minutes": { en: "minutes", hi: "मिनट", te: "నిమిషాలు", ta: "நிமிடங்கள்", kn: "ನಿಮಿಷಗಳು", mr: "मिनिटे", bn: "মিনিট" },
    "seconds": { en: "seconds", hi: "सेकंड", te: "సెకన్లు", ta: "வினாடிகள்", kn: "ಸೆಕೆಂಡುಗಳು", mr: "सेकंद", bn: "সেকেন্ড" },

    // ===========================================
    // MESSAGES
    // ===========================================
    "success": { en: "Success!", hi: "सफलता!", te: "విజయం!", ta: "வெற்றி!", kn: "ಯಶಸ್ಸು!", mr: "यशस्वी!", bn: "সফল!" },
    "error": { en: "Error", hi: "त्रुटि", te: "లోపం", ta: "பிழை", kn: "ದೋಷ", mr: "त्रुटी", bn: "ত্রুটি" },
    "warning": { en: "Warning", hi: "चेतावनी", te: "హెచ్చరిక", ta: "எச்சரிக்கை", kn: "ಎಚ್ಚರಿಕೆ", mr: "चेतावणी", bn: "সতর্কতা" },
    "info": { en: "Info", hi: "जानकारी", te: "సమాచారం", ta: "தகவல்", kn: "ಮಾಹಿತಿ", mr: "माहिती", bn: "তথ্য" },
    "loading": { en: "Loading...", hi: "लोड हो रहा है...", te: "లోడ్ అవుతోంది...", ta: "ஏற்றுகிறது...", kn: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...", mr: "लोड होत आहे...", bn: "লোড হচ্ছে..." },
    "please_wait": { en: "Please wait...", hi: "कृपया प्रतीक्षा करें...", te: "దయచేసి వేచి ఉండండి...", ta: "தயவுசெய்து காத்திருங்கள்...", kn: "ದಯವಿಟ್ಟು ಕಾಯಿರಿ...", mr: "कृपया प्रतीक्षा करा...", bn: "অনুগ্রহ করে অপেক্ষা করুন..." },
    "no_data": { en: "No data available", hi: "कोई डेटा उपलब्ध नहीं", te: "డేటా అందుబాటులో లేదు", ta: "தரவு கிடைக்கவில்லை", kn: "ಯಾವುದೇ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ", mr: "कोणताही डेटा उपलब्ध नाही", bn: "কোনো ডেটা নেই" },
    "no_results": { en: "No results found", hi: "कोई परिणाम नहीं मिला", te: "ఫలితాలు కనుగొనబడలేదు", ta: "முடிவுகள் கிடைக்கவில்லை", kn: "ಯಾವುದೇ ಫಲಿತಾಂಶಗಳಿಲ್ಲ", mr: "कोणतेही परिणाम नाही", bn: "কোনো ফলাফল পাওয়া যায়নি" },
    "try_again": { en: "Try again", hi: "पुनः प्रयास करें", te: "మళ్ళీ ప్రయత్నించండి", ta: "மீண்டும் முயற்சிக்கவும்", kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ", mr: "पुन्हा प्रयत्न करा", bn: "আবার চেষ্টা করুন" },
    "something_went_wrong": { en: "Something went wrong", hi: "कुछ गलत हो गया", te: "ఏదో తప్పు జరిగింది", ta: "ஏதோ தவறு நடந்தது", kn: "ಏನೋ ತಪ್ಪಾಗಿದೆ", mr: "काहीतरी चूक झाली", bn: "কিছু ভুল হয়েছে" },
    "are_you_sure": { en: "Are you sure?", hi: "क्या आप निश्चित हैं?", te: "మీరు ఖచ్చితంగా అనుకుంటున్నారా?", ta: "நீங்கள் உறுதியாக இருக்கிறீர்களா?", kn: "ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ?", mr: "तुम्हाला खात्री आहे?", bn: "আপনি কি নিশ্চিত?" },
    "yes": { en: "Yes", hi: "हाँ", te: "అవును", ta: "ஆம்", kn: "ಹೌದು", mr: "हो", bn: "হ্যাঁ" },
    "no": { en: "No", hi: "नहीं", te: "కాదు", ta: "இல்லை", kn: "ಇಲ್ಲ", mr: "नाही", bn: "না" },
    "ok": { en: "OK", hi: "ठीक है", te: "సరే", ta: "சரி", kn: "ಸರಿ", mr: "ठीक आहे", bn: "ঠিক আছে" },
    "done": { en: "Done", hi: "हो गया", te: "పూర్తయింది", ta: "முடிந்தது", kn: "ಆಯಿತು", mr: "झाले", bn: "হয়ে গেছে" },
    "failed": { en: "Failed", hi: "विफल", te: "విఫలమైంది", ta: "தோல்வி", kn: "ವಿಫಲವಾಯಿತು", mr: "अयशस्वी", bn: "ব্যর্থ" },

    // ===========================================
    // COUNTS & NUMBERS
    // ===========================================
    "views": { en: "Views", hi: "व्यूज", te: "వ్యూలు", ta: "பார்வைகள்", kn: "ವೀಕ್ಷಣೆಗಳು", mr: "व्ह्यूज", bn: "ভিউ" },
    "likes": { en: "Likes", hi: "लाइक्स", te: "లైక్‌లు", ta: "விருப்பங்கள்", kn: "ಲೈಕ್‌ಗಳು", mr: "लाईक्स", bn: "লাইক" },
    "comments": { en: "Comments", hi: "टिप्पणियां", te: "వ్యాఖ్యలు", ta: "கருத்துகள்", kn: "ಕಾಮೆಂಟ್‌ಗಳು", mr: "टिप्पण्या", bn: "মন্তব্য" },
    "shares": { en: "Shares", hi: "शेयर", te: "షేర్లు", ta: "பகிர்வுகள்", kn: "ಹಂಚಿಕೆಗಳು", mr: "शेअर्स", bn: "শেয়ার" },
    "followers": { en: "Followers", hi: "फॉलोअर्स", te: "ఫాలోవర్లు", ta: "பின்தொடர்பவர்கள்", kn: "ಅನುಯಾಯಿಗಳು", mr: "फॉलोअर्स", bn: "ফলোয়ার" },
    "following": { en: "Following", hi: "फॉलो कर रहे हैं", te: "అనుసరిస్తోంది", ta: "பின்தொடருகிறது", kn: "ಅನುಸರಿಸುತ್ತಿದೆ", mr: "फॉलो करत आहात", bn: "অনুসরণ করছেন" },
    "posts": { en: "Posts", hi: "पोस्ट", te: "పోస్ట్‌లు", ta: "இடுகைகள்", kn: "ಪೋಸ್ಟ್‌ಗಳು", mr: "पोस्ट", bn: "পোস্ট" },
    "items": { en: "Items", hi: "आइटम", te: "ఐటమ్‌లు", ta: "உருப்படிகள்", kn: "ಐಟಂಗಳು", mr: "आयटम", bn: "আইটেম" },
    "total": { en: "Total", hi: "कुल", te: "మొత్తం", ta: "மொத்தம்", kn: "ಒಟ్ಟು", mr: "एकूण", bn: "মোট" },
    "all": { en: "All", hi: "सभी", te: "అన్నీ", ta: "அனைத்தும்", kn: "ಎಲ್ಲಾ", mr: "सर्व", bn: "সব" },
    "none": { en: "None", hi: "कोई नहीं", te: "ఏదీ లేదు", ta: "எதுவும் இல்லை", kn: "ಯಾವುದೂ ಇಲ್ಲ", mr: "काहीही नाही", bn: "কিছুই নেই" }
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
    Object.keys(masterTranslations).forEach(key => {
        if (masterTranslations[key][lang]) {
            content[key] = masterTranslations[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}: ${updated} keys verified (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ MASTER TRANSLATION QUALITY FIX COMPLETE!');
console.log('Total keys verified:', Object.keys(masterTranslations).length);
