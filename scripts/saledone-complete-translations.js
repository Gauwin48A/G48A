const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// COMPREHENSIVE translations for all remaining strings
const translations = {
    // Saledone sample data
    "sample_iphone_title": { en: "iPhone 14 Pro Max 128GB", hi: "आईफोन 14 प्रो मैक्स 128GB", te: "ఐఫోన్ 14 ప్రో మ్యాక్స్ 128GB", ta: "ஐபோன் 14 ப்ரோ மேக்ஸ் 128GB", kn: "ಐಫೋನ್ 14 ಪ್ರೊ ಮ್ಯಾಕ್ಸ್ 128GB", mr: "आयफोन 14 प्रो मॅक्स 128GB", bn: "আইফোন 14 প্রো ম্যাক্স 128GB" },
    "sample_samsung_title": { en: "Samsung Galaxy S23 Ultra", hi: "सैमसंग गैलेक्सी S23 अल्ट्रा", te: "శామ్సంగ్ గెలాక్సీ S23 అల్ట్రా", ta: "சாம்சங் கேலக்ஸி S23 அல்ட்ரா", kn: "ಸ್ಯಾಮ್ಸಂಗ್ ಗ್ಯಾಲಕ್ಸಿ S23 ಅಲ್ಟ್ರಾ", mr: "सॅमसंग गॅलेक्सी S23 अल्ट्रा", bn: "স্যামসাং গ্যালাক্সি S23 আল্ট্রা" },
    "sample_macbook_title": { en: "MacBook Pro M2", hi: "मैकबुक प्रो M2", te: "మ్యాక్‌బుక్ ప్రో M2", ta: "மேக்புக் புரோ M2", kn: "ಮ್ಯಾಕ್‌ಬುಕ್ ಪ್ರೊ M2", mr: "मॅकबुक प्रो M2", bn: "ম্যাকবুক প্রো M2" },
    "sample_buyer_1": { en: "Priya Singh", hi: "प्रिया सिंह", te: "ప్రియా సింగ్", ta: "பிரியா சிங்", kn: "ಪ್ರಿಯಾ ಸಿಂಗ್", mr: "प्रिया सिंग", bn: "প্রিয়া সিং" },
    "sample_buyer_2": { en: "Amit Kumar", hi: "अमित कुमार", te: "అమిత్ కుమార్", ta: "அமித் குமார்", kn: "ಅಮಿತ್ ಕುಮಾರ್", mr: "अमित कुमार", bn: "অমিত কুমার" },
    "sample_buyer_3": { en: "Vikram Reddy", hi: "विक्रम रेड्डी", te: "విక్రమ్ రెడ్డి", ta: "விக்ரம் ரெட்டி", kn: "ವಿಕ್ರಮ್ ರೆಡ್ಡಿ", mr: "विक्रम रेड्डी", bn: "বিক্রম রেড্ডি" },
    "sample_seller_1": { en: "Rahul Sharma", hi: "राहुल शर्मा", te: "రాహుల్ శర్మ", ta: "ராகுல் ஷர்மா", kn: "ರಾಹುಲ್ ಶರ್ಮ", mr: "राहुल शर्मा", bn: "রাহুল শর্মা" },
    "sample_seller_2": { en: "Sneha Patel", hi: "स्नेहा पटेल", te: "స్నేహ పటేల్", ta: "ஸ்னேகா படேல்", kn: "ಸ್ನೇಹ ಪಟೇಲ್", mr: "स्नेहा पटेल", bn: "স্নেহা প্যাটেল" },
    "sample_seller_3": { en: "Neha Gupta", hi: "नेहा गुप्ता", te: "నేహ గుప్తా", ta: "நேஹா குப்தா", kn: "ನೇಹ ಗುಪ್ತಾ", mr: "नेहा गुप्ता", bn: "নেহা গুপ্তা" },
    "sample_feedback_1": { en: "Great seller, product as described!", hi: "बहुत अच्छा विक्रेता, वर्णन के अनुसार उत्पाद!", te: "గొప్ప విక్రేత, వర్ణించిన విధంగా ఉత్పత్తి!", ta: "சிறந்த விற்பனையாளர், விவரிக்கப்பட்டபடி பொருள்!", kn: "ಅದ್ಭುತ ಮಾರಾಟಗಾರ, ವಿವರಿಸಿದಂತೆ ಉತ್ಪನ್ನ!", mr: "उत्तम विक्रेता, वर्णनानुसार उत्पादन!", bn: "দুর্দান্ত বিক্রেতা, বর্ণনা অনুযায়ী পণ্য!" },
    "sample_feedback_2": { en: "Good condition, fast delivery", hi: "अच्छी स्थिति, तेज डिलीवरी", te: "మంచి పరిస్థితి, వేగవంతమైన డెలివరీ", ta: "நல்ல நிலை, வேகமான டெலிவரி", kn: "ಉತ್ತಮ ಸ್ಥಿತಿ, ವೇಗದ ಡೆಲಿವರಿ", mr: "चांगली स्थिती, जलद डिलिव्हरी", bn: "ভালো অবস্থা, দ্রুত ডেলিভারি" },
    "sample_feedback_3": { en: "Excellent quality, highly recommend!", hi: "उत्कृष्ट गुणवत्ता, अत्यधिक अनुशंसित!", te: "అద్భుతమైన నాణ్యత, అత్యంత సిఫార్సు చేయబడింది!", ta: "சிறந்த தரம், மிகவும் பரிந்துரைக்கிறேன்!", kn: "ಅತ್ಯುತ್ತಮ ಗುಣಮಟ್ಟ, ಹೆಚ್ಚು ಶಿಫಾರಸು ಮಾಡುತ್ತೇನೆ!", mr: "उत्कृष्ट गुणवत्ता, अत्यंत शिफारस केली!", bn: "চমৎকার মান, অত্যন্ত সুপারিশ করা হয়!" },

    // Saledone toast messages
    "sale_confirmation_initiated": { en: "Sale Confirmation Initiated", hi: "बिक्री पुष्टि आरंभ", te: "విక్రయ నిర్ధారణ ప్రారంభించబడింది", ta: "விற்பனை உறுதிப்படுத்தல் தொடங்கப்பட்டது", kn: "ಮಾರಾಟ ದೃಢೀಕರಣ ಪ್ರಾರಂಭವಾಗಿದೆ", mr: "विक्री पुष्टी सुरू झाली", bn: "বিক্রয় নিশ্চিতকরণ শুরু হয়েছে" },
    "buyer_will_be_notified": { en: "Buyer will be notified to confirm the sale", hi: "खरीदार को बिक्री की पुष्टि करने के लिए सूचित किया जाएगा", te: "కొనుగోలుదారుని విక్రయాన్ని నిర్ధారించమని తెలియజేయబడుతుంది", ta: "விற்பனையை உறுதிப்படுத்த வாங்குபவருக்கு தெரிவிக்கப்படும்", kn: "ಮಾರಾಟವನ್ನು ದೃಢೀಕರಿಸಲು ಖರೀದಿದಾರರಿಗೆ ತಿಳಿಸಲಾಗುವುದು", mr: "विक्री पुष्टी करण्यासाठी खरेदीदाराला सूचित केले जाईल", bn: "বিক্রয় নিশ্চিত করতে ক্রেতাকে জানানো হবে" },
    "sale_confirmed_successfully": { en: "Sale Confirmed Successfully", hi: "बिक्री सफलतापूर्वक पुष्टि हुई", te: "విక్రయం విజయవంతంగా నిర్ధారించబడింది", ta: "விற்பனை வெற்றிகரமாக உறுதிப்படுத்தப்பட்டது", kn: "ಮಾರಾಟ ಯಶಸ್ವಿಯಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ", mr: "विक्री यशस्वीरित्या पुष्टी झाली", bn: "বিক্রয় সফলভাবে নিশ্চিত হয়েছে" },
    "both_parties_verified": { en: "Both parties have verified the transaction", hi: "दोनों पक्षों ने लेनदेन की पुष्टि की है", te: "రెండు పార్టీలు లావాదేవీని ధృవీకరించారు", ta: "இரு தரப்பும் பரிவர்த்தனையை சரிபார்த்துள்ளனர்", kn: "ಎರಡೂ ಪಕ್ಷಗಳು ವಹಿವಾಟನ್ನು ಪರಿಶೀಲಿಸಿವೆ", mr: "दोन्ही पक्षांनी व्यवहाराची पडताळणी केली आहे", bn: "উভয় পক্ষ লেনদেন যাচাই করেছে" },

    // Additional Saledone keys
    "recent_completed_sales": { en: "Recent Completed Sales", hi: "हाल की पूर्ण बिक्री", te: "ఇటీవల పూర్తయిన అమ్మకాలు", ta: "சமீபத்திய முடிக்கப்பட்ட விற்பனைகள்", kn: "ಇತ್ತೀಚಿನ ಪೂర్ణಗొಂಡ ಮಾರಾಟಗಳು", mr: "अलीकडील पूर्ण झालेले विक्री", bn: "সাম্প্রতিক সম্পন্ন বিক্রয়" },

    // Dashboard/common
    "sales": { en: "sales", hi: "बिक्री", te: "అమ్మకాలు", ta: "விற்பனை", kn: "ಮಾರಾಟಗಳು", mr: "विक्री", bn: "বিক্রয়" },
    "coins": { en: "coins", hi: "सिक्के", te: "నాణేలు", ta: "நாணயங்கள்", kn: "ನಾಣ್ಯಗಳು", mr: "नाणी", bn: "কয়েন" },

    // Feedback page categories  
    "bug_report": { en: "Bug Report", hi: "बग रिपोर्ट", te: "బగ్ రిపోర్ట్", ta: "பிழை அறிக்கை", kn: "ಬಗ್ ವರದಿ", mr: "बग रिपोर्ट", bn: "বাগ রিপোর্ট" },
    "feature_request": { en: "Feature Request", hi: "सुविधा अनुरोध", te: "ఫీచర్ అభ్యర్థన", ta: "அம்ச கோரிக்கை", kn: "ವೈಶಿಷ್ಟ್ಯ ವಿನಂತಿ", mr: "वैशिष्ट्य विनंती", bn: "বৈশিষ্ট্য অনুরোধ" },
    "general_feedback": { en: "General Feedback", hi: "सामान्य प्रतिक्रिया", te: "సాధారణ అభిప్రాయం", ta: "பொது கருத்து", kn: "ಸಾಮಾನ್ಯ ಪ್ರತಿಕ್ರಿಯೆ", mr: "सामान्य अभिप्राय", bn: "সাধারণ প্রতিক্রিয়া" },
    "improvement": { en: "Improvement", hi: "सुधार", te: "మెరుగుదల", ta: "மேம்பாடு", kn: "ಸುಧಾರಣೆ", mr: "सुधारणा", bn: "উন্নতি" },
    "report_issues": { en: "Report issues or bugs", hi: "समस्याएं या बग रिपोर्ट करें", te: "సమస్యలు లేదా బగ్‌లను నివేదించండి", ta: "சிக்கல்கள் அல்லது பிழைகளை புகாரளிக்கவும்", kn: "ಸಮಸ್ಯೆಗಳು ಅಥವಾ ಬಗ್‌ಗಳನ್ನು ವರದಿ ಮಾಡಿ", mr: "समस्या किंवा बग रिपोर्ट करा", bn: "সমস্যা বা বাগ রিপোর্ট করুন" },
    "suggest_new_features": { en: "Suggest new features", hi: "नई सुविधाएं सुझाएं", te: "కొత్త ఫీచర్లను సూచించండి", ta: "புதிய அம்சங்களை பரிந்துரைக்கவும்", kn: "ಹೊಸ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಸೂಚಿಸಿ", mr: "नवीन वैशिष्ट्ये सुचवा", bn: "নতুন বৈশিষ্ট্য প্রস্তাব করুন" },
    "share_your_thoughts": { en: "Share your thoughts", hi: "अपने विचार साझा करें", te: "మీ ఆలోచనలు పంచుకోండి", ta: "உங்கள் எண்ணங்களைப் பகிரவும்", kn: "ನಿಮ್ಮ ಆಲೋಚನೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ", mr: "तुमचे विचार शेअर करा", bn: "আপনার মতামত শেয়ার করুন" },
    "suggest_improvements": { en: "Suggest improvements", hi: "सुधार सुझाएं", te: "మెరుగుదలలు సూచించండి", ta: "மேம்பாடுகளை பரிந்துரைக்கவும்", kn: "ಸುಧಾರಣೆಗಳನ್ನು ಸೂಚಿಸಿ", mr: "सुधारणा सुचवा", bn: "উন্নতি প্রস্তাব করুন" }
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

console.log('\n✅ Saledone sample data + Feedback categories translations added!');
