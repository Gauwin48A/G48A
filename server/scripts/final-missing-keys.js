const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Final missing keys
const translations = {
    "viewed": { en: "Viewed", hi: "देखा गया", te: "చూసారు", ta: "பார்த்தது", kn: "ನೋಡಲಾಗಿದೆ", mr: "पाहिले", bn: "দেখা হয়েছে" },
    "failed_to_remove": { en: "Failed to remove", hi: "हटाने में विफल", te: "తొలగించడం విఫలమైంది", ta: "அகற்றுவதில் தோல்வி", kn: "ತೆಗೆದುಹಾಕಲು ವಿಫಲವಾಗಿದೆ", mr: "काढण्यात अयशस्वी", bn: "সরাতে ব্যর্থ" },
    "failed_to_clear": { en: "Failed to clear history", hi: "इतिहास साफ करने में विफल", te: "చరిత్రను క్లియర్ చేయడం విఫలమైంది", ta: "வரலாற்றை அழிப்பதில் தோல்வி", kn: "ಇತಿಹಾಸವನ್ನು ತೆರವುಗೊಳಿಸಲು ವಿಫಲವಾಗಿದೆ", mr: "इतिहास साफ करण्यात अयशस्वी", bn: "ইতিহাস মুছতে ব্যর্থ" },
    "m_ago": { en: "m ago", hi: "मिनट पहले", te: "ని. క్రితం", ta: "நி. முன்", kn: "ನಿ. ಹಿಂದೆ", mr: "मि. पूर्वी", bn: "মি. আগে" },
    "h_ago": { en: "h ago", hi: "घंटे पहले", te: "గం. క్రితం", ta: "ம. முன்", kn: "ಗಂ. ಹಿಂದೆ", mr: "ता. पूर्वी", bn: "ঘ. আগে" },
    "d_ago": { en: "d ago", hi: "दिन पहले", te: "రో. క్రితం", ta: "நா. முன்", kn: "ದಿ. ಹಿಂದೆ", mr: "दि. पूर्वी", bn: "দি. আগে" },
    "new": { en: "New", hi: "नया", te: "కొత్త", ta: "புதியது", kn: "ಹೊಸ", mr: "नवीन", bn: "নতুন" },
    "like_new": { en: "Like New", hi: "नए जैसा", te: "కొత్తగా ఉంది", ta: "புதியது போல்", kn: "ಹೊಸತರ ಹಾಗೆ", mr: "नवीन सारखे", bn: "নতুনের মতো" },
    "excellent": { en: "Excellent", hi: "उत्कृष्ट", te: "అద్భుతం", ta: "சிறந்தது", kn: "ಅತ್ಯುತ್ತಮ", mr: "उत्कृष्ट", bn: "চমৎকার" },
    "good": { en: "Good", hi: "अच्छा", te: "మంచిది", ta: "நல்லது", kn: "ಒಳ್ಳೆಯದು", mr: "चांगले", bn: "ভালো" },
    "fair": { en: "Fair", hi: "ठीक", te: "సరిపోతుంది", ta: "சரி", kn: "ಸರಿ", mr: "बरे", bn: "মোটামুটি" },
    "under_warranty": { en: "Under Warranty", hi: "वारंटी में", te: "వారంటీలో ఉంది", ta: "உத்தரவாதத்தின் கீழ்", kn: "ವಾರಂಟಿಯಲ್ಲಿ", mr: "वॉरंटीमध्ये", bn: "ওয়ারেন্টির অধীনে" },
    "warranty_expired": { en: "Warranty Expired", hi: "वारंटी समाप्त", te: "వారంటీ ముగిసింది", ta: "உத்தரவாதம் காலாவதியானது", kn: "ವಾರಂಟಿ ಮುಗಿದಿದೆ", mr: "वॉरंटी संपली", bn: "ওয়ারেন্টি শেষ" },
    "no_warranty": { en: "No Warranty", hi: "कोई वारंटी नहीं", te: "వారంటీ లేదు", ta: "உத்தரவாதம் இல்லை", kn: "ವಾರಂಟಿ ಇಲ್ಲ", mr: "वॉरंटी नाही", bn: "ওয়ারেন্টি নেই" },
    "enter_price": { en: "Enter price", hi: "कीमत दर्ज करें", te: "ధర నమోదు చేయండి", ta: "விலையை உள்ளிடவும்", kn: "ಬೆಲೆ ನಮೂದಿಸಿ", mr: "किंमत प्रविष्ट करा", bn: "দাম লিখুন" },
    "enter_district": { en: "Enter district", hi: "जिला दर्ज करें", te: "జిల్లా నమోదు చేయండి", ta: "மாவட்டம் உள்ளிடவும்", kn: "ಜಿಲ್ಲೆಯನ್ನು ನಮೂದಿಸಿ", mr: "जिल्हा प्रविष्ट करा", bn: "জেলা লিখুন" },
    "enter_state": { en: "Enter state", hi: "राज्य दर्ज करें", te: "రాష్ట్రం నమోదు చేయండి", ta: "மாநிலம் உள்ளிடவும்", kn: "ರಾಜ್ಯವನ್ನು ನಮೂದಿಸಿ", mr: "राज्य प्रविष्ट करा", bn: "রাজ্য লিখুন" },
    "add_description": { en: "Add any additional details about your mobile phone...", hi: "अपने मोबाइल फोन के बारे में कोई अतिरिक्त विवरण जोड़ें...", te: "మీ మొబైల్ ఫోన్ గురించి ఏదైనా అదనపు వివరాలు జోడించండి...", ta: "உங்கள் மொபைல் போன் பற்றிய கூடுதல் விவரங்களைச் சேர்க்கவும்...", kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಫೋನ್ ಬಗ್ಗೆ ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ...", mr: "तुमच्या मोबाइल फोनबद्दल कोणताही अतिरिक्त तपशील जोडा...", bn: "আপনার মোবাইল ফোন সম্পর্কে অতিরিক্ত বিবরণ যোগ করুন..." },
    "images": { en: "Images", hi: "छवियां", te: "చిత్రాలు", ta: "படங்கள்", kn: "ಚಿತ್ರಗಳು", mr: "प्रतिमा", bn: "ছবি" },
    "photos": { en: "photos", hi: "फोटो", te: "ఫోటోలు", ta: "புகைப்படங்கள்", kn: "ಫೋಟೋಗಳು", mr: "फोटो", bn: "ফটো" },
    "contact_images": { en: "Contact & Images", hi: "संपर्क और छवियां", te: "సంప్రదింపు & చిత్రాలు", ta: "தொடர்பு & படங்கள்", kn: "ಸಂಪರ್ಕ & ಚಿತ್ರಗಳು", mr: "संपर्क आणि प्रतिमा", bn: "যোগাযোগ এবং ছবি" },
    "max_images": { en: "Max", hi: "अधिकतम", te: "గరిష్టంగా", ta: "அதிகபட்சம்", kn: "ಗರಿಷ್ಠ", mr: "कमाल", bn: "সর্বোচ্চ" }
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

console.log('\n✅ Final missing keys added!');
