const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

/*
 * COMPREHENSIVE CONTEXTUAL TRANSLATION FIX
 * 
 * IMPORTANT SEMANTIC DIFFERENCES:
 * 
 * 1. Sale Done (అమ్మకం జరిగింది) = The sale happened/completed successfully
 * 2. Sale Undone (అమ్మకం జరగలేదు) = The sale didn't happen (post never sold, needs relisting)
 * 3. Sale Cancelled (అమ్మకం రద్దు చేయబడింది) = The sale was cancelled (undo a confirmed sale)
 * 
 * These have different meanings and must be translated correctly in ALL languages!
 */

const translations = {
    // ===========================================
    // SALE DONE PAGE - Sale completed successfully
    // ===========================================
    "sale_done": {
        en: "Sale Done",
        hi: "बिक्री हो गई",           // bikri ho gayi - sale happened
        te: "అమ్మకం జరిగింది",         // ammakam jarigindhi - sale happened
        ta: "விற்பனை நடந்தது",        // virpanai nadandhadhu - sale happened
        kn: "ಮಾರಾಟ ಆಯಿತು",            // maraata aayithu - sale happened
        mr: "विक्री झाली",            // vikri zhali - sale happened
        bn: "বিক্রি হয়েছে"            // bikri hoyechhe - sale happened
    },
    "sale_confirmed": {
        en: "Sale Confirmed",
        hi: "बिक्री की पुष्टि हुई",
        te: "అమ్మకం నిర్ధారించబడింది",
        ta: "விற்பனை உறுதிப்படுத்தப்பட்டது",
        kn: "ಮಾರಾಟ ದೃಢಪಡಿಸಲಾಗಿದೆ",
        mr: "विक्री पुष्टी झाली",
        bn: "বিক্রি নিশ্চিত হয়েছে"
    },
    "sale_completed": {
        en: "Sale Completed",
        hi: "बिक्री पूरी हुई",
        te: "అమ్మకం పూర్తయింది",
        ta: "விற்பனை முடிந்தது",
        kn: "ಮಾರಾಟ ಪೂರ್ಣಗೊಂಡಿದೆ",
        mr: "विक्री पूर्ण झाली",
        bn: "বিক্রি সম্পন্ন হয়েছে"
    },
    "congratulations_sale": {
        en: "Congratulations! Your sale is complete!",
        hi: "बधाई हो! आपकी बिक्री पूरी हो गई!",
        te: "అభినందనలు! మీ అమ్మకం పూర్తయింది!",
        ta: "வாழ்த்துக்கள்! உங்கள் விற்பனை முடிந்தது!",
        kn: "ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ಮಾರಾಟ ಪೂರ್ಣಗೊಂಡಿದೆ!",
        mr: "अभिनंदन! तुमची विक्री पूर्ण झाली!",
        bn: "অভিনন্দন! আপনার বিক্রি সম্পন্ন হয়েছে!"
    },

    // ===========================================
    // SALE UNDONE PAGE - Sale never happened (for relisting)
    // ===========================================
    "sale_undone_title": {
        en: "Sale Undone",
        hi: "बिक्री नहीं हुई",         // bikri nahi hui - sale didn't happen
        te: "అమ్మకం జరగలేదు",          // ammakam jaragaledhu - sale didn't happen
        ta: "விற்பனை நடக்கவில்லை",    // virpanai nadakkavillai - sale didn't happen
        kn: "ಮಾರಾಟ ಆಗಲಿಲ್ಲ",          // maraata aagalilla - sale didn't happen
        mr: "विक्री झाली नाही",       // vikri zhali nahi - sale didn't happen
        bn: "বিক্রি হয়নি"             // bikri hoyni - sale didn't happen
    },
    "sale_didnt_happen": {
        en: "Sale didn't happen",
        hi: "बिक्री नहीं हुई",
        te: "అమ్మకం జరగలేదు",
        ta: "விற்பனை நடக்கவில்லை",
        kn: "ಮಾರಾಟ ಆಗಲಿಲ್ಲ",
        mr: "विक्री झाली नाही",
        bn: "বিক্রি হয়নি"
    },
    "post_not_sold": {
        en: "Post not sold",
        hi: "पोस्ट नहीं बिकी",
        te: "పోస్ట్ అమ్ముడుపోలేదు",
        ta: "இடுகை விற்கப்படவில்லை",
        kn: "ಪೋಸ್ಟ್ ಮಾರಾಟವಾಗಲಿಲ್ಲ",
        mr: "पोस्ट विकली गेली नाही",
        bn: "পোস্ট বিক্রি হয়নি"
    },
    "reactivate_unsold_posts": {
        en: "Reactivate posts that didn't sell - give them another chance!",
        hi: "जो पोस्ट नहीं बिकी उन्हें फिर से सक्रिय करें - उन्हें एक और मौका दें!",
        te: "అమ్ముడుపోని పోస్ట్‌లను తిరిగి సక్రియం చేయండి - వాటికి మరో అవకాశం ఇవ్వండి!",
        ta: "விற்கப்படாத இடுகைகளை மீண்டும் செயல்படுத்துங்கள் - மற்றொரு வாய்ப்பு கொடுங்கள்!",
        kn: "ಮಾರಾಟವಾಗದ ಪೋಸ್ಟ್‌ಗಳನ್ನು ಮತ್ತೆ ಸಕ್ರಿಯಗೊಳಿಸಿ - ಮತ್ತೊಂದು ಅವಕಾಶ ನೀಡಿ!",
        mr: "न विकलेल्या पोस्ट पुन्हा सक्रिय करा - त्यांना आणखी एक संधी द्या!",
        bn: "যেগুলো বিক্রি হয়নি সেগুলো পুনরায় সক্রিয় করুন - আরেকটি সুযোগ দিন!"
    },

    // ===========================================
    // SALE CANCELLED - Undo a confirmed/completed sale
    // ===========================================
    "sale_cancelled": {
        en: "Sale Cancelled",
        hi: "बिक्री रद्द की गई",       // bikri radda ki gayi - sale was cancelled
        te: "అమ్మకం రద్దు చేయబడింది",  // ammakam raddu cheyabadindi - sale was cancelled
        ta: "விற்பனை ரத்து செய்யப்பட்டது", // virpanai rathu seyyapattathu
        kn: "ಮಾರಾಟ ರದ್ದುಗೊಂಡಿದೆ",     // maraata raddugondide
        mr: "विक्री रद्द केली",        // vikri radda keli
        bn: "বিক্রি বাতিল করা হয়েছে"   // bikri batil kora hoyechhe
    },
    "cancel_sale": {
        en: "Cancel Sale",
        hi: "बिक्री रद्द करें",
        te: "అమ్మకం రద్దు చేయండి",
        ta: "விற்பனையை ரத்து செய்",
        kn: "ಮಾರಾಟವನ್ನು ರದ್ದುಮಾಡಿ",
        mr: "विक्री रद्द करा",
        bn: "বিক্রি বাতিল করুন"
    },
    "undo_confirmed_sale": {
        en: "Undo Confirmed Sale",
        hi: "पुष्टि की गई बिक्री रद्द करें",
        te: "నిర్ధారించిన అమ్మకాన్ని రద్దు చేయండి",
        ta: "உறுதிப்படுத்திய விற்பனையை ரத்து செய்",
        kn: "ದೃಢಪಡಿಸಿದ ಮಾರಾಟವನ್ನು ರದ್ದುಮಾಡಿ",
        mr: "पुष्टी केलेली विक्री रद्द करा",
        bn: "নিশ্চিত বিক্রি বাতিল করুন"
    },

    // ===========================================
    // MY HOME PAGE BUTTONS
    // ===========================================
    "mark_as_sold": {
        en: "Mark as Sold",
        hi: "बिक गई के रूप में चिन्हित करें",
        te: "అమ్ముడుపోయిందిగా గుర్తించండి",
        ta: "விற்கப்பட்டதாக குறிக்கவும்",
        kn: "ಮಾರಾಟವಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ",
        mr: "विकले गेले म्हणून चिन्हांकित करा",
        bn: "বিক্রি হয়েছে হিসেবে চিহ্নিত করুন"
    },
    "sale_happened": {
        en: "Sale Happened",
        hi: "बिक्री हो गई",
        te: "అమ్మకం జరిగింది",
        ta: "விற்பனை நடந்தது",
        kn: "ಮಾರಾಟ ಆಯಿತು",
        mr: "विक्री झाली",
        bn: "বিক্রি হয়েছে"
    },
    "sale_not_happened": {
        en: "Sale Not Happened",
        hi: "बिक्री नहीं हुई",
        te: "అమ్మకం జరగలేదు",
        ta: "விற்பனை நடக்கவில்லை",
        kn: "ಮಾರಾಟ ಆಗಲಿಲ್ಲ",
        mr: "विक्री झाली नाही",
        bn: "বিক্রি হয়নি"
    },

    // ===========================================
    // COMMON TRANSACTION TERMS
    // ===========================================
    "buyer": {
        en: "Buyer",
        hi: "खरीदार",
        te: "కొనుగోలుదారుడు",
        ta: "வாங்குபவர்",
        kn: "ಖರೀದಿದಾರ",
        mr: "खरेदीदार",
        bn: "ক্রেতা"
    },
    "seller": {
        en: "Seller",
        hi: "विक्रेता",
        te: "విక్రేత",
        ta: "விற்பனையாளர்",
        kn: "ಮಾರಾಟಗಾರ",
        mr: "विक्रेता",
        bn: "বিক্রেতা"
    },
    "transaction": {
        en: "Transaction",
        hi: "लेनदेन",
        te: "లావాదేవీ",
        ta: "பரிவர்த்தனை",
        kn: "ವಹಿವಾಟು",
        mr: "व्यवहार",
        bn: "লেনদেন"
    },
    "payment": {
        en: "Payment",
        hi: "भुगतान",
        te: "చెల్లింపు",
        ta: "கட்டணம்",
        kn: "ಪಾವತಿ",
        mr: "पेमेंट",
        bn: "পেমেন্ট"
    },
    "payment_received": {
        en: "Payment Received",
        hi: "भुगतान प्राप्त हुआ",
        te: "చెల్లింపు అందింది",
        ta: "கட்டணம் பெறப்பட்டது",
        kn: "ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ",
        mr: "पेमेंट प्राप्त झाले",
        bn: "পেমেন্ট পাওয়া গেছে"
    },
    "payment_pending": {
        en: "Payment Pending",
        hi: "भुगतान लंबित",
        te: "చెల్లింపు పెండింగ్‌లో ఉంది",
        ta: "கட்டணம் நிலுவையில் உள்ளது",
        kn: "ಪಾವತಿ ಬಾಕಿ ಇದೆ",
        mr: "पेमेंट बाकी आहे",
        bn: "পেমেন্ট বাকি আছে"
    },

    // ===========================================
    // STATUS LABELS
    // ===========================================
    "active": {
        en: "Active",
        hi: "सक्रिय",
        te: "యాక్టివ్",
        ta: "செயலில்",
        kn: "ಸಕ್ರಿಯ",
        mr: "सक्रिय",
        bn: "সক্রিয়"
    },
    "sold": {
        en: "Sold",
        hi: "बिक गई",
        te: "అమ్ముడుపోయింది",
        ta: "விற்கப்பட்டது",
        kn: "ಮಾರಾಟವಾಗಿದೆ",
        mr: "विकले गेले",
        bn: "বিক্রি হয়ে গেছে"
    },
    "pending": {
        en: "Pending",
        hi: "लंबित",
        te: "పెండింగ్",
        ta: "நிலுவையில்",
        kn: "ಬಾಕಿ",
        mr: "प्रलंबित",
        bn: "মুলতুবি"
    },
    "cancelled": {
        en: "Cancelled",
        hi: "रद्द",
        te: "రద్దు చేయబడింది",
        ta: "ரத்து செய்யப்பட்டது",
        kn: "ರದ್ದುಗೊಂಡಿದೆ",
        mr: "रद्द केले",
        bn: "বাতিল করা হয়েছে"
    },
    "completed": {
        en: "Completed",
        hi: "पूर्ण",
        te: "పూర్తయింది",
        ta: "முடிந்தது",
        kn: "ಪೂರ್ಣಗೊಂಡಿದೆ",
        mr: "पूर्ण झाले",
        bn: "সম্পন্ন"
    },

    // ===========================================
    // ERROR MESSAGES
    // ===========================================
    "too_many_requests": {
        en: "Too many requests. Please slow down.",
        hi: "बहुत सारे अनुरोध। कृपया धीरे करें।",
        te: "చాలా ఎక్కువ అభ్యర్థనలు. దయచేసి నెమ్మదిగా చేయండి.",
        ta: "அதிக கோரிக்கைகள். தயவுசெய்து மெதுவாக செய்யுங்கள்.",
        kn: "ತುಂಬಾ ಹೆಚ್ಚು ವಿನಂತಿಗಳು. ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮಾಡಿ.",
        mr: "खूप जास्त विनंत्या. कृपया हळू करा.",
        bn: "অনেক বেশি অনুরোধ। অনুগ্রহ করে ধীরে করুন।"
    },
    "something_went_wrong": {
        en: "Something went wrong",
        hi: "कुछ गलत हो गया",
        te: "ఏదో తప్పు జరిగింది",
        ta: "ஏதோ தவறு நடந்தது",
        kn: "ಏನೋ ತಪ್ಪಾಗಿದೆ",
        mr: "काहीतरी चूक झाली",
        bn: "কিছু ভুল হয়েছে"
    },
    "please_try_again": {
        en: "Please try again",
        hi: "कृपया पुनः प्रयास करें",
        te: "దయచేసి మళ్ళీ ప్రయత్నించండి",
        ta: "மீண்டும் முயற்சிக்கவும்",
        kn: "ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
        mr: "कृपया पुन्हा प्रयत्न करा",
        bn: "আবার চেষ্টা করুন"
    },

    // ===========================================
    // COMMON UI ELEMENTS
    // ===========================================
    "my_home": {
        en: "My Home",
        hi: "मेरा होम",
        te: "నా హోమ్",
        ta: "என் முகப்பு",
        kn: "ನನ್ನ ಮುಖಪುಟ",
        mr: "माझे होम",
        bn: "আমার হোম"
    },
    "total_posts": {
        en: "Total Posts",
        hi: "कुल पोस्ट",
        te: "మొత్తం పోస్ట్‌లు",
        ta: "மொத்த இடுகைகள்",
        kn: "ಒಟ್ಟು ಪೋಸ್ಟ್‌ಗಳು",
        mr: "एकूण पोस्ट",
        bn: "মোট পোস্ট"
    },
    "active_posts": {
        en: "Active",
        hi: "सक्रिय",
        te: "యాక్టివ్",
        ta: "செயலில்",
        kn: "ಸಕ್ರಿಯ",
        mr: "सक्रिय",
        bn: "সক্রিয়"
    },
    "sold_posts": {
        en: "Sold",
        hi: "बिक गई",
        te: "అమ్ముడుపోయినవి",
        ta: "விற்கப்பட்டவை",
        kn: "ಮಾರಾಟವಾದವು",
        mr: "विकले गेले",
        bn: "বিক্রি হয়েছে"
    },
    "pending_sale": {
        en: "Pending Sale",
        hi: "बिक्री लंबित",
        te: "పెండింగ్ అమ్మకం",
        ta: "நிலுவையில் விற்பனை",
        kn: "ಬಾಕಿ ಮಾರಾಟ",
        mr: "प्रलंबित विक्री",
        bn: "মুলতুবি বিক্রি"
    },
    "wishlist": {
        en: "Wishlist",
        hi: "विशलिस्ट",
        te: "విష్‌లిస్ట్",
        ta: "விருப்பப்பட்டியல்",
        kn: "ವಿಶ್ ಲಿಸ್ಟ್",
        mr: "विशलिस्ट",
        bn: "উইশলিস্ট"
    },
    "manage_your_listings": {
        en: "Manage your listings, track sales",
        hi: "अपनी लिस्टिंग प्रबंधित करें, बिक्री ट्रैक करें",
        te: "మీ లిస్టింగ్‌లను నిర్వహించండి, అమ్మకాలను ట్రాక్ చేయండి",
        ta: "உங்கள் பட்டியல்களை நிர்வகிக்கவும், விற்பனையைக் கண்காணிக்கவும்",
        kn: "ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ, ಮಾರಾಟಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
        mr: "तुमची यादी व्यवस्थापित करा, विक्री ट्रॅक करा",
        bn: "আপনার তালিকা পরিচালনা করুন, বিক্রি ট্র্যাক করুন"
    },
    "select_all": {
        en: "Select All",
        hi: "सभी चुनें",
        te: "అన్నీ ఎంచుకోండి",
        ta: "அனைத்தையும் தேர்ந்தெடு",
        kn: "ಎಲ್ಲವನ್ನೂ ಆಯ್ಕೆಮಾಡಿ",
        mr: "सर्व निवडा",
        bn: "সব নির্বাচন করুন"
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
    "use_to_manage_listings": {
        en: "Use this to quickly manage multiple active listings at once",
        hi: "एक साथ कई सक्रिय लिस्टिंग को जल्दी से प्रबंधित करने के लिए इसका उपयोग करें",
        te: "ఒకేసారి బహుళ యాక్టివ్ లిస్టింగ్‌లను త్వరగా నిర్వహించడానికి దీన్ని ఉపయోగించండి",
        ta: "பல செயலில் உள்ள பட்டியல்களை விரைவாக நிர்வகிக்க இதைப் பயன்படுத்தவும்",
        kn: "ಏಕಕಾಲದಲ್ಲಿ ಬಹು ಸಕ್ರಿಯ ಪಟ್ಟಿಗಳನ್ನು ತ್ವರಿತವಾಗಿ ನಿರ್ವಹಿಸಲು ಇದನ್ನು ಬಳಸಿ",
        mr: "एकाच वेळी अनेक सक्रिय सूची त्वरीत व्यवस्थापित करण्यासाठी हे वापरा",
        bn: "একসাথে একাধিক সক্রিয় তালিকা দ্রুত পরিচালনা করতে এটি ব্যবহার করুন"
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
    "filter_location": {
        en: "Filter by location type...",
        hi: "स्थान प्रकार के अनुसार फ़िल्टर करें...",
        te: "ప్రదేశం రకం ద్వారా ఫిల్టర్ చేయండి...",
        ta: "இடம் வகையால் வடிகட்டு...",
        kn: "ಸ್ಥಳ ಪ್ರಕಾರದ ಮೂಲಕ ಫಿಲ್ಟರ್ ಮಾಡಿ...",
        mr: "स्थान प्रकारानुसार फिल्टर करा...",
        bn: "অবস্থান প্রকার দ্বারা ফিল্টার করুন..."
    },
    "placeholder_image": {
        en: "Placeholder Image",
        hi: "प्लेसहोल्डर छवि",
        te: "ప్లేస్‌హోల్డర్ చిత్రం",
        ta: "ஒதுக்கிட படம்",
        kn: "ಪ್ಲೇಸ್‌ಹೋಲ್ಡರ್ ಚಿತ್ರ",
        mr: "प्लेसहोल्डर प्रतिमा",
        bn: "প্লেসহোল্ডার ছবি"
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

    console.log(`${lang.toUpperCase()}: ${updated} keys (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ COMPREHENSIVE CONTEXTUAL TRANSLATIONS APPLIED!');
console.log('\nKey semantic differences:');
console.log('  Sale Done      = అమ్మకం జరిగింది (ammakam jarigindhi) - happened');
console.log('  Sale Undone    = అమ్మకం జరగలేదు (ammakam jaragaledhu) - didnt happen');
console.log('  Sale Cancelled = అమ్మకం రద్దు చేయబడింది (ammakam raddu cheyabadindi) - cancelled');
