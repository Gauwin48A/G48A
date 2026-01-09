const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// ALL REMAINING translations from Feedback and Complaints screenshots
const translations = {
    // Feedback page - Why Your Feedback Matters section
    "why_feedback_matters": { en: "Why Your Feedback Matters", hi: "आपकी प्रतिक्रिया क्यों मायने रखती है", te: "మీ అభిప్రాయం ఎందుకు ముఖ్యం", ta: "உங்கள் கருத்து ஏன் முக்கியம்", kn: "ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ಏಕೆ ಮುಖ್ಯ", mr: "तुमचा अभिप्राय का महत्त्वाचा आहे", bn: "আপনার প্রতিক্রিয়া কেন গুরুত্বপূর্ণ" },
    "helps_us_understand": { en: "Helps us understand", hi: "हमें समझने में मदद करता है", te: "మాకు అర్థం చేసుకోవడంలో సహాయపడుతుంది", ta: "புரிந்துகொள்ள உதவுகிறது", kn: "ನಮಗೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ", mr: "आम्हाला समजून घेण्यास मदत होते", bn: "আমাদের বুঝতে সাহায্য করে" },
    "your_needs_pain_points": { en: "Your needs and pain points", hi: "आपकी जरूरतें और समस्याएं", te: "మీ అవసరాలు మరియు సమస్యలు", ta: "உங்கள் தேவைகள் மற்றும் சிக்கல்கள்", kn: "ನಿಮ್ಮ ಅಗತ್ಯತೆಗಳು ಮತ್ತು ಸಮಸ್ಯೆಗಳು", mr: "तुमच्या गरजा आणि अडचणी", bn: "আপনার প্রয়োজন এবং সমস্যা" },
    "guides_our_priorities": { en: "Guides our priorities", hi: "हमारी प्राथमिकताओं को निर्देशित करता है", te: "మా ప్రాధాన్యతలను మార్గదర్శనం చేస్తుంది", ta: "எங்கள் முன்னுரிமைகளை வழிநடத்துகிறது", kn: "ನಮ್ಮ ಆದ್ಯತೆಗಳನ್ನು ಮಾರ್ಗದರ್ಶನ ಮಾಡುತ್ತದೆ", mr: "आमच्या प्राधान्यक्रमांना मार्गदर्शन करते", bn: "আমাদের অগ্রাধিকার নির্দেশ করে" },
    "what_to_build_next": { en: "What to build next", hi: "आगे क्या बनाना है", te: "తదుపరి ఏమి నిర్మించాలి", ta: "அடுத்து என்ன உருவாக்க வேண்டும்", kn: "ಮುಂದೆ ಏನು ನಿರ್ಮಿಸಬೇಕು", mr: "पुढे काय तयार करायचे", bn: "পরবর্তী কি তৈরি করতে হবে" },
    "improves_experience": { en: "Improves experience", hi: "अनुभव में सुधार करता है", te: "అనుభవాన్ని మెరుగుపరుస్తుంది", ta: "அனுபவத்தை மேம்படுத்துகிறது", kn: "ಅನುಭವವನ್ನು ಸುಧಾರಿಸುತ್ತದೆ", mr: "अनुभव सुधारतो", bn: "অভিজ্ঞতা উন্নত করে" },
    "for_all_users": { en: "For all users", hi: "सभी उपयोगकर्ताओं के लिए", te: "అన్ని వినియోగదారుల కోసం", ta: "அனைத்து பயனர்களுக்கும்", kn: "ಎಲ್ಲಾ ಬಳಕೆದಾರರಿಗೆ", mr: "सर्व वापरकर्त्यांसाठी", bn: "সকল ব্যবহারকারীদের জন্য" },
    "builds_trust": { en: "Builds trust", hi: "विश्वास बनाता है", te: "విశ్వాసాన్ని నిర్మిస్తుంది", ta: "நம்பிக்கையை உருவாக்குகிறது", kn: "ನಂಬಿಕೆಯನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ", mr: "विश्वास निर्माण करतो", bn: "বিশ্বাস তৈরি করে" },
    "a_better_safer_platform": { en: "A better, safer platform", hi: "एक बेहतर, सुरक्षित प्लेटफॉर्म", te: "మెరుగైన, సురక్షితమైన వేదిక", ta: "சிறந்த, பாதுகாப்பான தளம்", kn: "ಉತ್ತಮ, ಸುರಕ್ಷಿತ ವೇದಿಕೆ", mr: "एक चांगले, सुरक्षित व्यासपीठ", bn: "একটি উন্নত, নিরাপদ প্ল্যাটফর্ম" },

    // Direct Contact section
    "direct_contact": { en: "Direct Contact", hi: "सीधा संपर्क", te: "ప్రత్యక్ష సంప్రదింపు", ta: "நேரடி தொடர்பு", kn: "ನೇರ ಸಂಪರ್ಕ", mr: "थेट संपर्क", bn: "সরাসরি যোগাযোগ" },
    "email": { en: "Email", hi: "ईमेल", te: "ఇమెయిల్", ta: "மின்னஞ்சல்", kn: "ಇಮೇಲ್", mr: "ईमेल", bn: "ইমেইল" },
    "response_time": { en: "Response Time", hi: "प्रतिक्रिया समय", te: "ప్రతిస్పందన సమయం", ta: "பதிலளிக்கும் நேரம்", kn: "ಪ್ರತಿಕ್ರಿಯೆ ಸಮಯ", mr: "प्रतिसाद वेळ", bn: "প্রতিক্রিয়া সময়" },
    "24_48_hours": { en: "24-48 hours", hi: "24-48 घंटे", te: "24-48 గంటలు", ta: "24-48 மணி நேரம்", kn: "24-48 ಗಂಟೆಗಳು", mr: "24-48 तास", bn: "24-48 ঘন্টা" },
    "priority_support": { en: "Priority Support", hi: "प्राथमिकता समर्थन", te: "ప్రాధాన్యత మద్దతు", ta: "முன்னுரிமை ஆதரவு", kn: "ಆದ್ಯತೆ ಬೆಂಬಲ", mr: "प्राधान्य समर्थन", bn: "অগ্রাধিকার সহায়তা" },
    "verified_users_faster": { en: "Verified users get faster responses", hi: "सत्यापित उपयोगकर्ताओं को तेज प्रतिक्रिया मिलती है", te: "ధృవీకరించబడిన వినియోగదారులకు వేగవంతమైన ప్రతిస్పందనలు లభిస్తాయి", ta: "சரிபார்க்கப்பட்ட பயனர்கள் விரைவான பதில்களைப் பெறுவார்கள்", kn: "ಪರಿಶೀಲಿಸಿದ ಬಳಕೆದಾರರು ವೇಗವಾಗಿ ಪ್ರತಿಕ್ರಿಯೆಗಳನ್ನು ಪಡೆಯುತ್ತಾರೆ", mr: "सत्यापित वापरकर्त्यांना जलद प्रतिसाद मिळतात", bn: "যাচাইকৃত ব্যবহারকারীরা দ্রুত প্রতিক্রিয়া পান" },

    // Thank you section
    "thank_you_community": { en: "Thank You for Being Part of Our Community!", hi: "हमारे समुदाय का हिस्सा बनने के लिए धन्यवाद!", te: "మా సమాజంలో భాగం అయినందుకు ధన్యవాదాలు!", ta: "எங்கள் சமூகத்தின் ஒரு பகுதியாக இருந்தமைக்கு நன்றி!", kn: "ನಮ್ಮ ಸಮುದಾಯದ ಭಾಗವಾಗಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು!", mr: "आमच्या समुदायाचा भाग बनल्याबद्दल धन्यवाद!", bn: "আমাদের সম্প্রদায়ের অংশ হওয়ার জন্য ধন্যবাদ!" },
    "feedback_helps_build": { en: "Your feedback helps us build a better, safer, and more user-friendly platform for everyone.", hi: "आपकी प्रतिक्रिया हमें सभी के लिए एक बेहतर, सुरक्षित और अधिक उपयोगकर्ता-अनुकूल प्लेटफॉर्म बनाने में मदद करती है।", te: "మీ అభిప్రాయం అందరికీ మెరుగైన, సురక్షితమైన మరియు మరింత వినియోగదారు-స్నేహపూర్వక వేదికను నిర్మించడంలో మాకు సహాయపడుతుంది.", ta: "உங்கள் கருத்து அனைவருக்கும் சிறந்த, பாதுகாப்பான மற்றும் பயனர் நட்பு தளத்தை உருவாக்க எங்களுக்கு உதவுகிறது.", kn: "ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ಎಲ್ಲರಿಗೂ ಉತ್ತಮ, ಸುರಕ್ಷಿತ ಮತ್ತು ಹೆಚ್ಚು ಬಳಕೆದಾರ ಸ್ನೇಹಿ ವೇದಿಕೆಯನ್ನು ನಿರ್ಮಿಸಲು ನಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ.", mr: "तुमचा अभिप्राय आम्हाला सर्वांसाठी एक चांगले, सुरक्षित आणि अधिक वापरकर्ता-अनुकूल व्यासपीठ तयार करण्यात मदत करतो.", bn: "আপনার প্রতিক্রিয়া আমাদের সবার জন্য একটি ভালো, নিরাপদ এবং আরও ব্যবহারকারী-বান্ধব প্ল্যাটফর্ম তৈরি করতে সাহায্য করে।" },

    // Complaints - status badges
    "under_review": { en: "Under Review", hi: "समीक्षाधीन", te: "సమీక్షలో ఉంది", ta: "மதிப்பாய்வில் உள்ளது", kn: "ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ", mr: "पुनरावलोकनाधीन", bn: "পর্যালোচনাধীন" },
    "resolved": { en: "Resolved", hi: "सुलझाया गया", te: "పరిష్కరించబడింది", ta: "தீர்க்கப்பட்டது", kn: "ಪರಿಹರಿಸಲಾಗಿದೆ", mr: "सोडवले", bn: "সমাধান হয়েছে" },
    "pending": { en: "Pending", hi: "लंबित", te: "పెండింగ్‌లో ఉంది", ta: "நிலுவையில் உள்ளது", kn: "ಬಾಕಿ ಉಳಿದಿದೆ", mr: "प्रलंबित", bn: "মুলতুবি" },

    // Complaint types (these are dynamic from sample data in Complaints.jsx)
    "transaction_issue": { en: "Transaction Issue", hi: "लेनदेन समस्या", te: "లావాదేవీ సమస్య", ta: "பரிவர்த்தனை பிரச்சனை", kn: "ವಹಿವಾಟು ಸಮಸ್ಯೆ", mr: "व्यवहार समस्या", bn: "লেনদেন সমস্যা" },
    "product_quality": { en: "Product Quality", hi: "उत्पाद गुणवत्ता", te: "ఉత్పత్తి నాణ్యత", ta: "தயாரிப்பு தரம்", kn: "ಉತ್ಪನ್ನ ಗುಣಮಟ್ಟ", mr: "उत्पादन गुणवत्ता", bn: "পণ্যের মান" },
    "seller_not_responding": { en: "Seller not responding after payment", hi: "भुगतान के बाद विक्रेता प्रतिक्रिया नहीं दे रहा", te: "చెల్లింపు తర్వాత విక్రేత స్పందించడం లేదు", ta: "கட்டணத்திற்குப் பிறகு விற்பனையாளர் பதிலளிக்கவில்லை", kn: "ಪಾವತಿಯ ನಂತರ ಮಾರಾಟಗಾರ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತಿಲ್ಲ", mr: "पेमेंट नंतर विक्रेता प्रतिसाद देत नाही", bn: "পেমেন্টের পরে বিক্রেতা সাড়া দিচ্ছে না" },
    "phone_condition_not_described": { en: "Phone condition was not as described", hi: "फोन की स्थिति वर्णित के अनुसार नहीं थी", te: "ఫోన్ పరిస్థితి వివరించిన విధంగా లేదు", ta: "தொலைபேசி நிலை விவரிக்கப்பட்டபடி இல்லை", kn: "ಫೋನ್ ಸ್ಥಿತಿ ವಿವರಿಸಿದಂತೆ ಇರಲಿಲ್ಲ", mr: "फोनची स्थिती वर्णन केल्याप्रमाणे नव्हती", bn: "ফোনের অবস্থা বর্ণনা অনুযায়ী ছিল না" },
    "issue_resolved_refund": { en: "Issue resolved. Refund processed.", hi: "समस्या सुलझ गई। रिफंड प्रोसेस हो गया।", te: "సమస్య పరిష్కరించబడింది. రీఫండ్ ప్రాసెస్ చేయబడింది.", ta: "பிரச்சனை தீர்க்கப்பட்டது. பணம் திரும்ப செலுத்தப்பட்டது.", kn: "ಸಮಸ್ಯೆ ಪರಿಹರಿಸಲಾಗಿದೆ. ಹಣ ವಾಪಸ್ ಪ್ರಕ್ರಿಯೆ ಮಾಡಲಾಗಿದೆ.", mr: "समस्या सोडवली. परतावा प्रक्रिया झाली.", bn: "সমস্যা সমাধান হয়েছে। ফেরত প্রক্রিয়া করা হয়েছে।" },
    "admin_response": { en: "Admin Response", hi: "प्रशासक प्रतिक्रिया", te: "అడ్మిన్ ప్రతిస్పందన", ta: "நிர்வாகி பதில்", kn: "ಅಡ್ಮಿನ್ ಪ್ರತಿಕ್ರಿಯೆ", mr: "प्रशासक प्रतिसाद", bn: "অ্যাডমিন প্রতিক্রিয়া" },
    "post_id": { en: "Post ID", hi: "पोस्ट ID", te: "పోస్ట్ ID", ta: "பதிவு ID", kn: "ಪೋಸ್ಟ್ ID", mr: "पोस्ट ID", bn: "পোস্ট ID" },
    "submitted": { en: "Submitted", hi: "सबमिट किया गया", te: "సమర్పించబడింది", ta: "சமர்ப்பிக்கப்பட்டது", kn: "ಸಲ್ಲಿಸಲಾಗಿದೆ", mr: "सबमिट केले", bn: "জমা দেওয়া হয়েছে" }
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

console.log('\n✅ Feedback + Complaints remaining translations added!');
