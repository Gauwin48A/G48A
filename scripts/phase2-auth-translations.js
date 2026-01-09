const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    // Auth Common
    "back_to_login": "Back to Login",
    "go_to_login": "Go to Login",
    "email_placeholder": "name@example.com",
    "password_placeholder": "••••••••",
    "enter_your_email": "Enter your email",
    "create_password_placeholder": "Create a strong password",
    "confirm_password_placeholder": "Confirm your password",
    "enter_full_name": "Enter your full name",
    "enter_referral_code": "Enter referral code (Optional)",

    // Reset Password
    "invalid_reset_link": "Invalid Reset Link",
    "invalid_reset_link_desc": "This password reset link is invalid or has expired.",
    "request_new_link": "Request New Link",
    "password_requirements": "Password Requirements:",
    "req_min_chars": "At least 8 characters",
    "req_uppercase": "Uppercase letter (A-Z)",
    "req_lowercase": "Lowercase letter (a-z)",
    "req_number": "Number (0-9)",
    "req_special": "Special character (!@#$%^&*)",
    "reset_password_title": "Reset Password",
    "new_password_label": "New Password",
    "confirm_new_password_label": "Confirm New Password",

    // SignUp
    "account_created": "Account Created!",
    "redirecting_login": "Redirecting you to login...",
    "full_name_label": "Full Name",
    "referral_code_label": "Referral Code",
    "optional_label": "(Optional)",
    "signup_bonus_msg": "🎁 You'll get bonus coins after signup!",
    "what_you_get": "What you get",
    "continue_with": "or continue with",
    "secure_signup": "Secure",
    "users_count_signup": "10K+ Users",
    "verified_signup": "Verified",

    // Login
    "remember_me": "Remember me",
    "forgot_password": "Forgot Password?",

    // MyHome / Misc found in audit
    "cancel_button": "Cancel",
    "select_all_tooltip": "Select all active posts for bulk actions",
    "copy_post_id_tooltip": "Copy Post ID (use this in SaleDone)",
    "no_content": "No content",
    "no_saved_searches": "No Saved Searches",
    "save_search_desc": "Save your searches to get alerts when new posts match",
    "search_name_placeholder": "Search name (e.g., 'Cheap iPhones')",
    "location_placeholder": "Location",
    "min_price": "Min price",
    "max_price": "Max price"
};

const translations = {
    hi: {
        "back_to_login": "लॉगिन पर वापस जाएं",
        "go_to_login": "लॉगिन पर जाएं",
        "email_placeholder": "name@example.com",
        "password_placeholder": "••••••••",
        "enter_your_email": "अपना ईमेल दर्ज करें",
        "create_password_placeholder": "एक मजबूत पासवर्ड बनाएं",
        "confirm_password_placeholder": "अपने पासवर्ड की पुष्टि करें",
        "enter_full_name": "अपना पूरा नाम दर्ज करें",
        "enter_referral_code": "रेफरल कोड दर्ज करें (वैकल्पिक)",
        "invalid_reset_link": "अमान्य रीसेट लिंक",
        "invalid_reset_link_desc": "यह पासवर्ड रीसेट लिंक अमान्य है या समाप्त हो गया है।",
        "request_new_link": "नए लिंक का अनुरोध करें",
        "password_requirements": "पासवर्ड की आवश्यकताएं:",
        "req_min_chars": "कम से कम 8 वर्ण",
        "req_uppercase": "बड़ा अक्षर (A-Z)",
        "req_lowercase": "छोटा अक्षर (a-z)",
        "req_number": "संख्या (0-9)",
        "req_special": "विशेष वर्ण (!@#$%^&*)",
        "reset_password_title": "पासवर्ड रीसेट करें",
        "new_password_label": "नया पासवर्ड",
        "confirm_new_password_label": "नए पासवर्ड की पुष्टि करें",
        "account_created": "खाता बनाया गया!",
        "redirecting_login": "आपको लॉगिन पर रीडायरेक्ट कर रहा है...",
        "full_name_label": "पूरा नाम",
        "referral_code_label": "रेफरल कोड",
        "optional_label": "(वैकल्पिक)",
        "signup_bonus_msg": "🎁 साइनअप के बाद आपको बोनस सिक्के मिलेंगे!",
        "what_you_get": "आपको क्या मिलता है",
        "continue_with": "या इसके साथ जारी रखें",
        "secure_signup": "सुरक्षित",
        "users_count_signup": "10K+ उपयोगकर्ता",
        "verified_signup": "सत्यापित",
        "remember_me": "मुझे याद रखें",
        "forgot_password": "पासवर्ड भूल गए?",
        "cancel_button": "रद्द करें",
        "select_all_tooltip": "थोक कार्यों के लिए सभी सक्रिय पोस्ट चुनें",
        "copy_post_id_tooltip": "पोस्ट आईडी कॉपी करें (इसे SaleDone में उपयोग करें)",
        "no_content": "कोई सामग्री नहीं",
        "no_saved_searches": "कोई सहेजी गई खोज नहीं",
        "save_search_desc": "नई पोस्ट मेल खाने पर अलर्ट प्राप्त करने के लिए अपनी खोजें सहेजें",
        "search_name_placeholder": "खोज नाम (उदा., 'सस्ते आईफ़ोन')",
        "location_placeholder": "स्थान",
        "min_price": "न्यूनतम मूल्य",
        "max_price": "अधिकतम मूल्य"
    },
    te: {
        "back_to_login": "లాగిన్‌కి తిరిగి వెళ్లు",
        "go_to_login": "లాగిన్‌కి వెళ్లు",
        "email_placeholder": "name@example.com",
        "password_placeholder": "••••••••",
        "enter_your_email": "మీ ఇమెయిల్‌ను నమోదు చేయండి",
        "create_password_placeholder": "బలమైన పాస్‌వర్డ్‌ను సృష్టించండి",
        "confirm_password_placeholder": "మీ పాస్‌వర్డ్‌ను నిర్ధారించండి",
        "enter_full_name": "మీ పూర్తి పేరును నమోదు చేయండి",
        "enter_referral_code": "రెఫరల్ కోడ్‌ను నమోదు చేయండి (ఐచ్ఛికం)",
        "invalid_reset_link": "చెల్లని రీసెట్ లింక్",
        "invalid_reset_link_desc": "ఈ పాస్‌వర్డ్ రీసెట్ లింక్ చెల్లదు లేదా గడువు ముగిసింది.",
        "request_new_link": "కొత్త లింక్‌ని అభ్యర్థించండి",
        "password_requirements": "పాస్‌వర్డ్ ఆవశ్యకతలు:",
        "req_min_chars": "కనీసం 8 అక్షరాలు",
        "req_uppercase": "పెద్ద అక్షరం (A-Z)",
        "req_lowercase": "చిన్న అక్షరం (a-z)",
        "req_number": "సంఖ్య (0-9)",
        "req_special": "ప్రత్యేక అక్షరం (!@#$%^&*)",
        "reset_password_title": "పాస్‌వర్డ్ రీసెట్ చేయండి",
        "new_password_label": "కొత్త పాస్‌వర్డ్",
        "confirm_new_password_label": "కొత్త పాస్‌వర్డ్‌ను నిర్ధారించండి",
        "account_created": "ఖాతా సృష్టించబడింది!",
        "redirecting_login": "మిమ్మల్ని లాగిన్‌కి మళ్ళిస్తోంది...",
        "full_name_label": "పూర్తి పేరు",
        "referral_code_label": "రెఫరల్ కోడ్",
        "optional_label": "(ఐచ్ఛికం)",
        "signup_bonus_msg": "🎁 సైన్అప్ తర్వాత మీకు బోనస్ నాణేలు లభిస్తాయి!",
        "what_you_get": "మీకు లభించేవి",
        "continue_with": "లేదా దీనితో కొనసాగించండి",
        "secure_signup": "సురక్షితం",
        "users_count_signup": "10K+ వినియోగదారులు",
        "verified_signup": "ధృవీకరించబడింది",
        "remember_me": "నన్ను గుర్తుంచుకో",
        "forgot_password": "పాస్‌వర్డ్ మర్చిపోయారా?",
        "cancel_button": "రద్దు చేయి",
        "select_all_tooltip": "బల్క్ చర్యల కోసం అన్ని యాక్టివ్ పోస్ట్‌లను ఎంచుకోండి",
        "copy_post_id_tooltip": "పోస్ట్ ID కాపీ చేయండి (SaleDone లో వాడండి)",
        "no_content": "కంటెంట్ లేదు",
        "no_saved_searches": "సేవ్ చేసిన శోధనలు లేవు",
        "save_search_desc": "కొత్త పోస్ట్‌లు సరిపోలినప్పుడు అలర్ట్స్ పొందడానికి మీ శోధనలను సేవ్ చేయండి",
        "search_name_placeholder": "శోధన పేరు (ఉదా., 'చౌక ఐఫోన్లు')",
        "location_placeholder": "స్థానం",
        "min_price": "కనిష్ట ధర",
        "max_price": "గరిష్ట ధర"
    }
};

async function updateTranslations() {
    for (const lang of languages) {
        const filePath = path.join(localesDir, `${lang}.json`);
        let content = {};

        if (fs.existsSync(filePath)) {
            content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        let addedCount = 0;

        Object.keys(newKeys).forEach(key => {
            if (!content[key]) {
                // Check if key exists in translations map, else if it's English use provided string, otherwise use key name as fallback (avoiding blank)
                // Actually better to use English string as fallback for other langs if translation missing
                const translatedText = translations[lang]?.[key] || (lang === 'en' ? newKeys[key] : newKeys[key]);
                content[key] = translatedText;
                addedCount++;
            }
        });

        // Sort keys
        const sortedContent = Object.keys(content).sort().reduce((acc, key) => {
            acc[key] = content[key];
            return acc;
        }, {});

        fs.writeFileSync(filePath, JSON.stringify(sortedContent, null, 2));
        console.log(`Updated ${lang}.json: Added ${addedCount} keys`);

        // Also update local src locales if they exist
        const srcLocalesPath = path.join(__dirname, '../client/src/locales', `${lang}.json`);
        if (fs.existsSync(path.dirname(srcLocalesPath))) {
            fs.writeFileSync(srcLocalesPath, JSON.stringify(sortedContent, null, 2));
            console.log(`Updated src/locales/${lang}.json`);
        }
    }
}

updateTranslations();
