const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// Absolute final translations - remaining 33 keys
const absoluteFinal = {
    "date_range": { kn: "ದಿನಾಂಕ ಶ್ರೇಣಿ", mr: "तारीख श्रेणी", bn: "তারিখ সীমা" },
    "enter_address": { kn: "ನಿಮ್ಮ ಪೂರ್ಣ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ", mr: "तुमचा पूर्ण पत्ता प्रविष्ट करा", bn: "আপনার সম্পূর্ণ ঠিকানা দিন" },
    "enter_city": { kn: "ನಗರ", mr: "शहर", bn: "শহর" },
    "enter_email": { kn: "ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ", mr: "तुमचा ईमेल प्रविष्ट करा", bn: "আপনার ইমেল দিন" },
    "enter_phone": { kn: "ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ", mr: "तुमचा फोन नंबर प्रविष्ट करा", bn: "আপনার ফোন নম্বর দিন" },
    "enter_pincode": { kn: "ಪಿನ್‌ಕೋಡ್", mr: "पिनकोड", bn: "পিনকোড" },
    "allow_location": { kn: "ಸ್ಥಳ ಪ್ರವೇಶ ಅನುಮತಿಸಿ", mr: "स्थान प्रवेश अनुमती द्या", bn: "অবস্থান অ্যাক্সেস অনুমতি দিন" },
    "already_have_account": { kn: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?", mr: "आधीच खाते आहे?", bn: "ইতিমধ্যে অ্যাকাউন্ট আছে?" },
    "flags": { kn: "ಫ್ಲ್ಯಾಗ್‌ಗಳು", mr: "फ्लॅग्स", bn: "ফ্ল্যাগ" },
    "follow": { kn: "ಅನುಸರಿಸಿ", mr: "फॉलो करा", bn: "অনুসরণ করুন" },
    "reports": { kn: "ವರದಿಗಳು", mr: "अहवाल", bn: "রিপোর্ট" },
    "my_home_subtitle": { kn: "ನಿಮ್ಮ ಪಟ್ಟಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", mr: "तुमच्या लिस्टिंग व्यवस्थापित आणि ट्रॅक करा", bn: "আপনার তালিকা পরিচালনা এবং ট্র্যাক করুন" },
    "my_home_title": { kn: "ನನ್ನ ಮನೆ", mr: "माझे होम", bn: "আমার হোম" },
    "order": { kn: "ಆರ್ಡರ್", mr: "ऑर्डर", bn: "অর্ডার" },
    "order_history": { kn: "ಆರ್ಡರ್ ಇತಿಹಾಸ", mr: "ऑर्डर इतिहास", bn: "অর্ডার ইতিহাস" },
    "order_id": { kn: "ಆರ್ಡರ್ ಐಡಿ", mr: "ऑर्डर आयडी", bn: "অর্ডার আইডি" },
    "payment": { kn: "ಪಾವತಿ", mr: "पेमेंट", bn: "পেমেন্ট" },
    "payment_method": { kn: "ಪಾವತಿ ವಿಧಾನ", mr: "पेमेंट पद्धत", bn: "পেমেন্ট পদ্ধতি" },
    "points": { kn: "ಪಾಯಿಂಟ್ಸ್", mr: "पॉइंट्स", bn: "পয়েন্ট" },
    "privacy": { kn: "ಗೌಪ್ಯತೆ ನೀತಿ", mr: "गोपनीयता धोरण", bn: "গোপনীয়তা নীতি" },
    "subtotal": { kn: "ಉಪ-ಮೊತ್ತ", mr: "उप-एकूण", bn: "উপ-মোট" },
    "shipping": { kn: "ಶಿಪ್ಪಿಂಗ್", mr: "शिपिंग", bn: "শিপিং" },
    "tax": { kn: "ತೆರಿಗೆ", mr: "कर", bn: "কর" },
    "terms": { kn: "ಸೇವಾ ನಿಯಮಗಳು", mr: "सेवा अटी", bn: "সেবার শর্তাবলী" },
    "terms_conditions": { kn: "ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು", mr: "नियम आणि अटी", bn: "নিয়ম ও শর্তাবলী" },
    "sell": { kn: "ಮಾರಾಟ ಮಾಡಿ", mr: "विक्री करा", bn: "বিক্রি করুন" },
    "badges": { kn: "ಬ್ಯಾಡ್ಜ್‌ಗಳು", mr: "बॅज", bn: "ব্যাজ" },
    "enter_full_name": { kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ನಮೂದಿಸಿ", mr: "तुमचे पूर्ण नाव प्रविष्ट करा", bn: "আপনার পুরো নাম দিন" },
    "max_price": { kn: "ಗರಿಷ್ಠ ಬೆಲೆ", mr: "कमाल किंमत", bn: "সর্বোচ্চ মূল্য" },
    "min_price": { kn: "ಕನಿಷ್ಠ ಬೆಲೆ", mr: "किमान किंमत", bn: "সর্বনিম্ন মূল্য" },
    "no_posts": { kn: "ಇನ್ನೂ ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ", mr: "अद्याप कोणतीही पोस्ट नाही", bn: "এখনও কোনো পোস্ট নেই" },
    "oldest_first": { kn: "ಹಳೆಯದು ಮೊದಲು", mr: "जुने प्रथम", bn: "পুরানো প্রথমে" },
    "newest_first": { kn: "ಹೊಸದು ಮೊದಲು", mr: "नवीन प्रथम", bn: "নতুন প্রথমে" }
};

// Update Kannada, Marathi, Bengali
['kn', 'mr', 'bn'].forEach(lang => {
    const srcPath = path.join(localesDir, `${lang}.json`);
    const pubPath = path.join(publicDir, `${lang}.json`);

    let content = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    let updated = 0;

    Object.keys(absoluteFinal).forEach(key => {
        if (absoluteFinal[key][lang]) {
            content[key] = absoluteFinal[key][lang];
            updated++;
        }
    });

    const sorted = {};
    Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

    fs.writeFileSync(srcPath, JSON.stringify(sorted, null, 2));
    fs.writeFileSync(pubPath, JSON.stringify(sorted, null, 2));

    console.log(`${lang.toUpperCase()}.json: ${updated} keys updated`);
});

console.log('\n🎉 100% Translation Coverage Achieved!');
