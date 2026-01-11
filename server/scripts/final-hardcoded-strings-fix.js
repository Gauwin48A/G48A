const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

/*
 * FINAL CLEANUP - All remaining hardcoded English strings
 * These were found by searching through JSX files
 */

const translations = {
    // MyHome.jsx - Bulk selection tip
    "bulk_selection_tip": {
        en: "Use this to quickly manage multiple active listings at once",
        hi: "एक साथ कई सक्रिय लिस्टिंग को जल्दी से प्रबंधित करने के लिए इसका उपयोग करें",
        te: "ఒకేసారి బహుళ యాక్టివ్ లిస్టింగ్‌లను త్వరగా నిర్వహించడానికి దీన్ని ఉపయోగించండి",
        ta: "பல செயலில் உள்ள பட்டியல்களை விரைவாக நிர்வகிக்க இதைப் பயன்படுத்தவும்",
        kn: "ಹಲವು ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳನ್ನು ತ್ವರಿತವಾಗಿ ನಿರ್ವಹಿಸಲು ಇದನ್ನು ಬಳಸಿ",
        mr: "अनेक सक्रिय सूची एकाच वेळी त्वरीत व्यवस्थापित करण्यासाठी हे वापरा",
        bn: "একসাথে একাধিক সক্রিয় তালিকা দ্রুত পরিচালনা করতে এটি ব্যবহার করুন"
    },

    // No posts messages
    "no_posts": {
        en: "No posts yet",
        hi: "अभी तक कोई पोस्ट नहीं",
        te: "ఇంకా పోస్ట్‌లు లేవు",
        ta: "இன்னும் இடுகைகள் இல்லை",
        kn: "ಇನ್ನೂ ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ",
        mr: "अजून पोस्ट नाहीत",
        bn: "এখনো কোনো পোস্ট নেই"
    },
    "no_posts_first_share": {
        en: "No posts yet. Be the first to share!",
        hi: "अभी कोई पोस्ट नहीं। पहले शेयर करने वाले बनें!",
        te: "ఇంకా పోస్ట్‌లు లేవు. మొదట షేర్ చేయండి!",
        ta: "இன்னும் இடுகைகள் இல்லை. முதலில் பகிருங்கள்!",
        kn: "ಇನ್ನೂ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ. ಮೊದಲು ಹಂಚಿಕೊಳ್ಳಿ!",
        mr: "अजून पोस्ट नाहीत. प्रथम शेअर करा!",
        bn: "এখনো কোনো পোস্ট নেই। প্রথম শেয়ার করুন!"
    },
    "no_posts_available": {
        en: "No posts available right now",
        hi: "अभी कोई पोस्ट उपलब्ध नहीं",
        te: "ప్రస్తుతం పోస్ట్‌లు అందుబాటులో లేవు",
        ta: "இப்போது இடுகைகள் கிடைக்கவில்லை",
        kn: "ಇದೀಗ ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ",
        mr: "सध्या कोणतेही पोस्ट उपलब्ध नाहीत",
        bn: "এখন কোনো পোস্ট নেই"
    },
    "no_posts_within_km": {
        en: "No posts found within",
        hi: "के भीतर कोई पोस्ट नहीं मिला",
        te: "లో పోస్ట్‌లు కనుగొనబడలేదు",
        ta: "க்குள் இடுகைகள் கிடைக்கவில்லை",
        kn: "ಒಳಗೆ ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ",
        mr: "आत कोणतेही पोस्ट सापडले नाहीत",
        bn: "এর মধ্যে কোনো পোস্ট পাওয়া যায়নি"
    },

    // Start selling
    "start_selling": {
        en: "Start selling today!",
        hi: "आज ही बेचना शुरू करें!",
        te: "ఈ రోజే అమ్మకం ప్రారంభించండి!",
        ta: "இன்றே விற்க தொடங்குங்கள்!",
        kn: "ಇಂದೇ ಮಾರಾಟ ಪ್ರಾರಂಭಿಸಿ!",
        mr: "आजच विक्री सुरू करा!",
        bn: "আজই বিক্রি শুরু করুন!"
    },

    // Placeholder Image
    "placeholder_image": {
        en: "Placeholder Image",
        hi: "प्लेसहोल्डर छवि",
        te: "ప్లేస్‌హోల్డర్ చిత్రం",
        ta: "ஒதுக்கிட படம்",
        kn: "ಪ್ಲೇಸ್‌ಹೋಲ್ಡರ್ ಚಿತ್ರ",
        mr: "प्लेसहोल्डर प्रतिमा",
        bn: "প্লেসহোল্ডার ছবি"
    },
    "no_image_available": {
        en: "No image available",
        hi: "कोई छवि उपलब्ध नहीं",
        te: "చిత్రం అందుబాటులో లేదు",
        ta: "படம் கிடைக்கவில்லை",
        kn: "ಚಿತ್ರ ಲಭ್ಯವಿಲ್ಲ",
        mr: "प्रतिमा उपलब्ध नाही",
        bn: "ছবি নেই"
    },

    // Radius/Distance
    "km": {
        en: "km",
        hi: "किमी",
        te: "కి.మీ",
        ta: "கி.மீ",
        kn: "ಕಿ.ಮೀ",
        mr: "किमी",
        bn: "কিমি"
    },

    // Sale related - fixing the buttons showing in screenshot
    "sale_done": {
        en: "Sale Done",
        hi: "बिक्री हो गई",
        te: "అమ్మకం జరిగింది",
        ta: "விற்பனை நடந்தது",
        kn: "ಮಾರಾಟ ಆಯಿತು",
        mr: "विक्री झाली",
        bn: "বিক্রি হয়েছে"
    },
    "sale_undone": {
        en: "Sale Undone",
        hi: "बिक्री नहीं हुई",
        te: "అమ్మకం రద్దు చేయబడింది",
        ta: "விற்பனை ரத்து",
        kn: "ಮಾರಾಟ ರದ್ದು",
        mr: "विक्री रद्द",
        bn: "বিক্রি বাতিল"
    },

    // Filter/Sort
    "filter_by_location": {
        en: "Filter by location type...",
        hi: "स्थान प्रकार के अनुसार फ़िल्टर करें...",
        te: "ప్రదేశం రకం ద్వారా ఫిల్టర్ చేయండి...",
        ta: "இடம் வகையால் வடிகட்டு...",
        kn: "ಸ್ಥಳ ಪ್ರಕಾರದ ಮೂಲಕ ಫಿಲ್ಟರ್ ಮಾಡಿ...",
        mr: "स्थान प्रकारानुसार फिल्टर करा...",
        bn: "অবস্থান প্রকার দ্বারা ফিল্টার করুন..."
    },

    // Select items
    "select_items": {
        en: "Select Items",
        hi: "आइटम चुनें",
        te: "ఐటమ్‌లను ఎంచుకోండి",
        ta: "உருப்படிகளைத் தேர்ந்தெடுக்கவும்",
        kn: "ಐಟಂಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        mr: "आयटम निवडा",
        bn: "আইটেম নির্বাচন করুন"
    },
    "items_selected": {
        en: "items selected",
        hi: "आइटम चुने गए",
        te: "ఐటమ్‌లు ఎంచుకోబడ్డాయి",
        ta: "உருப்படிகள் தேர்ந்தெடுக்கப்பட்டன",
        kn: "ಐಟಂಗಳನ್ನು ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ",
        mr: "आयटम निवडले",
        bn: "আইটেম নির্বাচিত"
    },

    // Post related
    "post_id": {
        en: "Post ID",
        hi: "पोस्ट आईडी",
        te: "పోస్ట్ ఐడీ",
        ta: "இடுகை ஐடி",
        kn: "ಪೋಸ್ಟ್ ಐಡಿ",
        mr: "पोस्ट आयडी",
        bn: "পোস্ট আইডি"
    },
    "create_post": {
        en: "Create Post",
        hi: "पोस्ट बनाएं",
        te: "పోస్ట్ సృష్టించు",
        ta: "இடுகையை உருவாக்கு",
        kn: "ಪೋಸ್ಟ್ ರಚಿಸಿ",
        mr: "पोस्ट तयार करा",
        bn: "পোস্ট তৈরি করুন"
    },
    "add_post": {
        en: "Add Post",
        hi: "पोस्ट जोड़ें",
        te: "పోస్ట్ జోడించు",
        ta: "இடுகையைச் சேர்",
        kn: "ಪೋಸ್ಟ್ ಸೇರಿಸಿ",
        mr: "पोस्ट जोडा",
        bn: "পোস্ট যোগ করুন"
    },

    // Tab labels for MyHome
    "all_items": {
        en: "All",
        hi: "सभी",
        te: "అన్నీ",
        ta: "அனைத்தும்",
        kn: "ಎಲ್ಲಾ",
        mr: "सर्व",
        bn: "সব"
    },
    "active_items": {
        en: "Active",
        hi: "सक्रिय",
        te: "యాక్టివ్",
        ta: "செயலில்",
        kn: "ಸಕ್ರಿಯ",
        mr: "सक्रिय",
        bn: "সক্রিয়"
    },
    "sold_items": {
        en: "Sold",
        hi: "बिक गई",
        te: "అమ్ముడుపోయింది",
        ta: "விற்கப்பட்டது",
        kn: "ಮಾರಾಟವಾಗಿದೆ",
        mr: "विकले गेले",
        bn: "বিক্রি হয়েছে"
    },
    "found_items": {
        en: "Found",
        hi: "मिला",
        te: "కనుగొంది",
        ta: "கண்டறியப்பட்டது",
        kn: "ಕಂಡುಬಂದಿದೆ",
        mr: "सापडले",
        bn: "পাওয়া গেছে"
    },

    // Stats labels
    "total_posts": {
        en: "Total Posts",
        hi: "कुल पोस्ट",
        te: "మొత్తం పోస్ట్‌లు",
        ta: "மொத்த இடுகைகள்",
        kn: "ಒಟ್ಟು ಪೋಸ್ಟ್‌ಗಳು",
        mr: "एकूण पोस्ट",
        bn: "মোট পোস্ট"
    },
    "active_count": {
        en: "Active",
        hi: "सक्रिय",
        te: "యాక్టివ్",
        ta: "செயலில்",
        kn: "ಸಕ್ರಿಯ",
        mr: "सक्रिय",
        bn: "সক্রিয়"
    },
    "pending_sale_count": {
        en: "Pending Sale",
        hi: "बिक्री लंबित",
        te: "అమ్ముడుపోయింది",
        ta: "நிலுவையில் விற்பனை",
        kn: "ಬಾಕಿ ಮಾರಾಟ",
        mr: "प्रलंबित विक्री",
        bn: "মুলতুবি বিক্রি"
    },
    "wishlist_count": {
        en: "Wishlist",
        hi: "विशलिस्ट",
        te: "విష్‌లిస్ట్",
        ta: "விருப்பப்பட்டியல்",
        kn: "ವಿಶ್ ಲಿಸ್ಟ್",
        mr: "विशलिस्ट",
        bn: "উইশলিস্ট"
    },

    // My Home description
    "manage_listings_track_sales": {
        en: "Manage your listings, track sales",
        hi: "अपनी लिस्टिंग प्रबंधित करें, बिक्री ट्रैक करें",
        te: "మీ లిస్టింగ్‌లను నిర్వహించండి, అమ్మకాలను ట్రాక్ చేయండి",
        ta: "உங்கள் பட்டியல்களை நிர்வகிக்கவும், விற்பனையைக் கண்காணிக்கவும்",
        kn: "ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ, ಮಾರಾಟಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
        mr: "तुमची यादी व्यवस्थापित करा, विक्री ट्रॅक करा",
        bn: "আপনার তালিকা পরিচালনা করুন, বিক্রি ট্র্যাক করুন"
    },

    // Bulk select
    "bulk_select": {
        en: "Bulk Select",
        hi: "बल्क चुनाव",
        te: "బల్క్ సెలక్ట్",
        ta: "மொத்தமாக தேர்வு",
        kn: "ಬಲ್ಕ್ ಆಯ್ಕೆ",
        mr: "बल्क निवड",
        bn: "বাল্ক সিলেক্ট"
    },

    // Great offers section
    "great_offers": {
        en: "Great Offers",
        hi: "बेहतरीन ऑफर",
        te: "గొప్ప ఆఫర్లు",
        ta: "சிறந்த சலுகைகள்",
        kn: "ಅದ್ಭುತ ಆಫರ್‌ಗಳು",
        mr: "उत्तम ऑफर्स",
        bn: "দুর্দান্ত অফার"
    },
    "get_discount": {
        en: "Get 50% off on first purchase",
        hi: "पहली खरीद पर 50% छूट पाएं",
        te: "మొదటి కొనుగోలుపై 50% తగ్గింపు పొందండి",
        ta: "முதல் வாங்குதலில் 50% தள்ளுபடி பெறுங்கள்",
        kn: "ಮೊದಲ ಖರೀದಿಯಲ್ಲಿ 50% ರಿಯಾಯಿತಿ ಪಡೆಯಿರಿ",
        mr: "पहिल्या खरेदीवर 50% सूट मिळवा",
        bn: "প্রথম কেনাকাটায় 50% ছাড় পান"
    },
    "shop_now": {
        en: "Shop Now",
        hi: "अभी खरीदें",
        te: "ఇప్పుడే షాపింగ్ చేయండి",
        ta: "இப்போது வாங்கு",
        kn: "ಈಗ ಶಾಪ್ ಮಾಡಿ",
        mr: "आता खरेदी करा",
        bn: "এখনই কিনুন"
    },

    // Sponsored deals
    "sponsored_deals": {
        en: "Sponsored Deals",
        hi: "प्रायोजित डील्स",
        te: "స్పాన్సర్డ్ డీల్స్",
        ta: "ஸ்பான்சர் செய்யப்பட்ட ஒப்பந்தங்கள்",
        kn: "ಪ್ರಾಯೋಜಿತ ಡೀಲ್‌ಗಳು",
        mr: "प्रायोजित डील्स",
        bn: "স্পনসরড ডিল"
    },
    "featured_deals": {
        en: "Featured Deals",
        hi: "विशेष डील्स",
        te: "ప్రత్యేక డీల్స్",
        ta: "சிறப்பு ஒப்பந்தங்கள்",
        kn: "ವಿಶೇಷ ಡೀಲ್‌ಗಳು",
        mr: "विशेष डील्स",
        bn: "বিশেষ ডিল"
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

    console.log(`${lang.toUpperCase()}: ${updated} keys fixed (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ ALL REMAINING HARDCODED STRINGS FIXED!');
console.log('Total keys added:', Object.keys(translations).length);
