const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// PROPER CONTEXTUAL TRANSLATIONS - Natural, colloquial translations
// Reviewed and corrected for each language
const translations = {
    // SaleDone page - corrected contextual translations
    "sale_done": {
        en: "Sale Done",
        hi: "बिक्री हो गई",
        te: "అమ్మకం జరిగింది",  // ammakam jarigindhi
        ta: "விற்பனை ஆனது",
        kn: "ಮಾರಾಟ ಆಯಿತು",
        mr: "विक्री झाली",
        bn: "বিক্রি হয়েছে"
    },
    "sale_undone": {
        en: "Sale Undone",
        hi: "बिक्री रद्द",
        te: "అమ్మకం జరగలేదు",  // ammakam jaragaledhu
        ta: "விற்பனை ரத்து",
        kn: "ಮಾರಾಟ ರದ್ದುಗೊಂಡಿದೆ",
        mr: "विक्री रद्द",
        bn: "বিক্রি বাতিল"
    },
    "sale_confirmed": {
        en: "Sale Confirmed",
        hi: "बिक्री की पुष्टि",
        te: "అమ్మకం నిర్ధారించబడింది",  // ammakam nirdharintchbadindi
        ta: "விற்பனை உறுதிப்படுத்தப்பட்டது",
        kn: "ಮಾರಾಟ ದೃಢಪಡಿಸಲಾಗಿದೆ",
        mr: "विक्री पुष्टी झाली",
        bn: "বিক্রি নিশ্চিত হয়েছে"
    },
    "sale_completed": {
        en: "Sale Completed",
        hi: "बिक्री पूरी हुई",
        te: "అమ్మకం పూర్తయింది",  // ammakam purtayindi
        ta: "விற்பனை நிறைவடைந்தது",
        kn: "ಮಾರಾಟ ಪೂರ್ಣಗೊಂಡಿದೆ",
        mr: "विक्री पूर्ण झाली",
        bn: "বিক্রি সম্পন্ন"
    },
    "transaction_successful": {
        en: "Transaction Successful",
        hi: "लेनदेन सफल",
        te: "లావాదేవీ విజయవంతం",  // lavadevi vijayavantam
        ta: "பரிவர்த்தனை வெற்றியடைந்தது",
        kn: "ವಹಿವಾಟು ಯಶಸ್ವಿಯಾಗಿದೆ",
        mr: "व्यवहार यशस्वी",
        bn: "লেনদেন সফল"
    },
    "confirm_sale": {
        en: "Confirm Sale",
        hi: "बिक्री की पुष्टि करें",
        te: "అమ్మకం నిర్ధారించండి",
        ta: "விற்பனையை உறுதிப்படுத்து",
        kn: "ಮಾರಾಟವನ್ನು ದೃಢಪಡಿಸಿ",
        mr: "विक्री पुष्टी करा",
        bn: "বিক্রি নিশ্চিত করুন"
    },
    "undo_sale": {
        en: "Undo Sale",
        hi: "बिक्री रद्द करें",
        te: "అమ్మకం రద్దు చేయండి",
        ta: "விற்பனையை ரத்து செய்",
        kn: "ಮಾರಾಟವನ್ನು ರದ್ದುಮಾಡಿ",
        mr: "विक्री रद्द करा",
        bn: "বিক্রি বাতিল করুন"
    },

    // Buyer/Seller context
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
    "product": {
        en: "Product",
        hi: "उत्पाद",
        te: "ఉత్పత్తి",
        ta: "தயாரிப்பு",
        kn: "ಉತ್ಪನ್ನ",
        mr: "उत्पादन",
        bn: "পণ্য"
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

    // Status messages - natural language
    "item_sold": {
        en: "Item Sold",
        hi: "वस्तु बिक गई",
        te: "వస్తువు అమ్ముడుపోయింది",
        ta: "பொருள் விற்கப்பட்டது",
        kn: "ವಸ್ತು ಮಾರಾಟವಾಗಿದೆ",
        mr: "वस्तू विकली गेली",
        bn: "জিনিস বিক্রি হয়ে গেছে"
    },
    "item_available": {
        en: "Item Available",
        hi: "वस्तु उपलब्ध है",
        te: "వస్తువు అందుబాటులో ఉంది",
        ta: "பொருள் கிடைக்கிறது",
        kn: "ವಸ್ತು ಲಭ್ಯವಿದೆ",
        mr: "वस्तू उपलब्ध आहे",
        bn: "জিনিস পাওয়া যাচ্ছে"
    },
    "sold_to": {
        en: "Sold to",
        hi: "को बेचा",
        te: "కు అమ్మబడింది",
        ta: "க்கு விற்கப்பட்டது",
        kn: "ಗೆ ಮಾರಾಟವಾಗಿದೆ",
        mr: "ला विकले",
        bn: "কে বিক্রি করা হয়েছে"
    },
    "bought_from": {
        en: "Bought from",
        hi: "से खरीदा",
        te: "నుండి కొన్నారు",
        ta: "இருந்து வாங்கியது",
        kn: "ಇಂದ ಖರೀದಿಸಿದ್ದಾರೆ",
        mr: "कडून विकत घेतले",
        bn: "থেকে কেনা"
    },

    // Actions - natural language
    "mark_as_sold": {
        en: "Mark as Sold",
        hi: "बिकी हुई के रूप में चिन्हित करें",
        te: "అమ్ముడుపోయిందిగా గుర్తించండి",
        ta: "விற்கப்பட்டதாக குறிக்கவும்",
        kn: "ಮಾರಾಟವಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ",
        mr: "विकले म्हणून चिन्हांकित करा",
        bn: "বিক্রি হয়েছে হিসেবে চিহ্নিত করুন"
    },
    "complete_transaction": {
        en: "Complete Transaction",
        hi: "लेनदेन पूरा करें",
        te: "లావాదేవీని పూర్తి చేయండి",
        ta: "பரிவர்த்தனையை முடிக்கவும்",
        kn: "ವಹಿವಾಟು ಪೂರ್ಣಗೊಳಿಸಿ",
        mr: "व्यवहार पूर्ण करा",
        bn: "লেনদেন সম্পন্ন করুন"
    },
    "cancel_transaction": {
        en: "Cancel Transaction",
        hi: "लेनदेन रद्द करें",
        te: "లావాదేవీ రద్దు చేయండి",
        ta: "பரிவர்த்தனையை ரத்து செய்யவும்",
        kn: "ವಹಿವಾಟು ರದ్ದುಮಾಡಿ",
        mr: "व्यवहार रद्द करा",
        bn: "লেনদেন বাতিল করুন"
    },

    // Trust and verification
    "verified_seller": {
        en: "Verified Seller",
        hi: "सत्यापित विक्रेता",
        te: "ధృవీకరించబడిన విక్రేత",
        ta: "சரிபார்க்கப்பட்ட விற்பனையாளர்",
        kn: "ಪರಿಶೀಲಿಸಿದ ಮಾರಾಟಗಾರ",
        mr: "सत्यापित विक्रेता",
        bn: "যাচাইকৃত বিক্রেতা"
    },
    "trusted_buyer": {
        en: "Trusted Buyer",
        hi: "विश्वसनीय खरीदार",
        te: "నమ్మకమైన కొనుగోలుదారుడు",
        ta: "நம்பகமான வாங்குபவர்",
        kn: "ನಂಬಿಕಸ್ಥ ಖರೀದಿದಾರ",
        mr: "विश्वासू खरेदीदार",
        bn: "বিশ্বস্ত ক্রেতা"
    },
    "trust_points": {
        en: "Trust Points",
        hi: "विश्वास अंक",
        te: "నమ్మకం పాయింట్లు",
        ta: "நம்பிக்கை புள்ளிகள்",
        kn: "ನಂಬಿಕೆ ಅಂಕಗಳು",
        mr: "विश्वास गुण",
        bn: "বিশ্বাস পয়েন্ট"
    },

    // Confirmations
    "are_you_sure": {
        en: "Are you sure?",
        hi: "क्या आप निश्चित हैं?",
        te: "మీరు ఖచ్చితంగా అనుకుంటున్నారా?",
        ta: "நீங்கள் உறுதியாக இருக்கிறீர்களா?",
        kn: "ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ?",
        mr: "तुम्हाला खात्री आहे?",
        bn: "আপনি কি নিশ্চিত?"
    },
    "yes": {
        en: "Yes",
        hi: "हाँ",
        te: "అవును",
        ta: "ஆம்",
        kn: "ಹೌದು",
        mr: "हो",
        bn: "হ্যাঁ"
    },
    "no": {
        en: "No",
        hi: "नहीं",
        te: "కాదు",
        ta: "இல்லை",
        kn: "ಇಲ್ಲ",
        mr: "नाही",
        bn: "না"
    },

    // Common navigation and UI
    "view_details": {
        en: "View Details",
        hi: "विवरण देखें",
        te: "వివరాలు చూడండి",
        ta: "விவரங்களைக் காண்க",
        kn: "ವಿವರಗಳನ್ನು ನೋಡಿ",
        mr: "तपशील पहा",
        bn: "বিস্তারিত দেখুন"
    },
    "go_back": {
        en: "Go Back",
        hi: "वापस जाएं",
        te: "వెనుకకు వెళ్ళు",
        ta: "பின்செல்",
        kn: "ಹಿಂದೆ ಹೋಗು",
        mr: "मागे जा",
        bn: "ফিরে যান"
    },
    "share": {
        en: "Share",
        hi: "साझा करें",
        te: "షేర్ చేయండి",
        ta: "பகிர்",
        kn: "ಹಂಚಿಕೊಳ್ಳಿ",
        mr: "शेअर करा",
        bn: "শেয়ার করুন"
    },
    "like": {
        en: "Like",
        hi: "पसंद करें",
        te: "లైక్ చేయండి",
        ta: "விரும்பு",
        kn: "ಇಷ್ಟಪಡು",
        mr: "आवडले",
        bn: "পছন্দ করুন"
    },
    "comment": {
        en: "Comment",
        hi: "टिप्पणी करें",
        te: "వ్యాఖ్యానించండి",
        ta: "கருத்து",
        kn: "ಕಾಮೆಂಟ್",
        mr: "टिप्पणी करा",
        bn: "মন্তব্য করুন"
    },
    "report": {
        en: "Report",
        hi: "रिपोर्ट करें",
        te: "రిపోర్ట్ చేయండి",
        ta: "புகாரளி",
        kn: "ವರದಿ ಮಾಡಿ",
        mr: "तक्रार करा",
        bn: "রিপোর্ট করুন"
    },

    // Success/Error messages
    "success": {
        en: "Success!",
        hi: "सफलता!",
        te: "విజయం!",
        ta: "வெற்றி!",
        kn: "ಯಶಸ್ಸು!",
        mr: "यश!",
        bn: "সফল!"
    },
    "error": {
        en: "Error",
        hi: "त्रुटि",
        te: "లోపం",
        ta: "பிழை",
        kn: "ದೋಷ",
        mr: "त्रुटी",
        bn: "ত্রুটি"
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
    "something_went_wrong": {
        en: "Something went wrong",
        hi: "कुछ गलत हो गया",
        te: "ఏదో తప్పు జరిగింది",
        ta: "ஏதோ தவறு நடந்தது",
        kn: "ಏನೋ ತಪ್ಪಾಗಿದೆ",
        mr: "काहीतरी चूक झाली",
        bn: "কিছু ভুল হয়েছে"
    },

    // Common labels
    "today": {
        en: "Today",
        hi: "आज",
        te: "ఈ రోజు",
        ta: "இன்று",
        kn: "ಇಂದು",
        mr: "आज",
        bn: "আজ"
    },
    "yesterday": {
        en: "Yesterday",
        hi: "कल",
        te: "నిన్న",
        ta: "நேற்று",
        kn: "ನಿನ್ನೆ",
        mr: "काल",
        bn: "গতকাল"
    },
    "days_ago": {
        en: "days ago",
        hi: "दिन पहले",
        te: "రోజుల క్రితం",
        ta: "நாட்களுக்கு முன்",
        kn: "ದಿನಗಳ ಹಿಂದೆ",
        mr: "दिवसांपूर्वी",
        bn: "দিন আগে"
    },
    "hours_ago": {
        en: "hours ago",
        hi: "घंटे पहले",
        te: "గంటల క్రితం",
        ta: "மணி நேரத்திற்கு முன்",
        kn: "ಗಂಟೆಗಳ ಹಿಂದೆ",
        mr: "तासांपूर्वी",
        bn: "ঘন্টা আগে"
    },
    "minutes_ago": {
        en: "minutes ago",
        hi: "मिनट पहले",
        te: "నిమిషాల క్రితం",
        ta: "நிமிடங்களுக்கு முன்",
        kn: "ನಿಮಿಷಗಳ ಹಿಂದೆ",
        mr: "मिनिटांपूर्वी",
        bn: "মিনিট আগে"
    },
    "just_now": {
        en: "Just now",
        hi: "अभी अभी",
        te: "ఇప్పుడే",
        ta: "இப்போது தான்",
        kn: "ಈಗ ತಾನೆ",
        mr: "आत्ताच",
        bn: "এইমাত্র"
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

    console.log(`${lang.toUpperCase()}.json: ${updated} keys fixed/updated (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ Proper contextual translations applied!');
console.log('\nKey fixes:');
console.log('  sale_done (te): అమ్మకం జరిగింది (ammakam jarigindhi)');
console.log('  sale_undone (te): అమ్మకం జరగలేదు (ammakam jaragaledhu)');
