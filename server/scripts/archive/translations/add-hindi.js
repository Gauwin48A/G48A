const fs = require('fs');

const hiPath = 'client/src/locales/hi.json';
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

// Hindi translations for common keys
const hindiTranslations = {
    // Basic UI
    "news_updates": "समाचार और अपडेट",
    "share_knowledge": "समुदाय के साथ ज्ञान, समाचार और अपडेट साझा करें",
    "share_update": "अपडेट साझा करें",
    "view_details": "विवरण देखें",
    "view_more": "और देखें",
    "no_posts_available": "कोई पोस्ट उपलब्ध नहीं",
    "loading": "लोड हो रहा है...",
    "my_posts": "मेरी पोस्ट",
    "all_posts": "सभी पोस्ट",

    // Navigation & Menu
    "home": "होम",
    "feed": "फ़ीड",
    "my_feed": "मेरी फ़ीड",
    "profile": "प्रोफ़ाइल",
    "rewards": "पुरस्कार",
    "more": "अधिक",
    "search": "खोजें",
    "settings": "सेटिंग्स",
    "notifications": "सूचनाएं",
    "messages": "संदेश",
    "logout": "लॉग आउट",
    "login": "लॉग इन",
    "signup": "साइन अप",

    // Actions
    "like": "पसंद",
    "share": "साझा करें",
    "comment": "टिप्पणी",
    "save": "सहेजें",
    "cancel": "रद्द करें",
    "submit": "जमा करें",
    "delete": "हटाएं",
    "edit": "संपादित करें",
    "update": "अपडेट करें",
    "create": "बनाएं",
    "apply": "लागू करें",
    "reset": "रीसेट",
    "confirm": "पुष्टि करें",
    "back": "वापस",
    "next": "अगला",

    // Auth
    "email": "ईमेल",
    "password": "पासवर्ड",
    "phone": "फ़ोन नंबर",
    "sign_in": "साइन इन",
    "create_account": "खाता बनाएं",
    "forgot_password": "पासवर्ड भूल गए?",
    "welcome_back": "वापसी पर स्वागत है",
    "sign_in_to_account": "अपने खाते में साइन इन करें",
    "logging_in": "लॉग इन हो रहा है...",
    "login_successful": "सफलतापूर्वक लॉग इन",
    "login_failed": "लॉग इन विफल",

    // Profile
    "personal_info": "व्यक्तिगत जानकारी",
    "verification": "सत्यापन",
    "preferences": "प्राथमिकताएं",
    "full_name": "पूरा नाम",
    "date_of_birth": "जन्म तिथि",
    "gender": "लिंग",
    "male": "पुरुष",
    "female": "महिला",
    "address": "पता",
    "city": "शहर",
    "location": "स्थान",

    // Wishlist
    "wishlist": "इच्छा सूची",
    "my_wishlist": "मेरी इच्छा सूची",
    "wishlist_empty": "आपकी इच्छा सूची खाली है",
    "save_favorites": "अपने पसंदीदा आइटम बाद के लिए सहेजें",
    "saved_items": "सहेजे गए आइटम",
    "start_saving": "जो आइटम आपको पसंद हैं उन्हें सहेजना शुरू करें!",
    "browse_products": "उत्पाद ब्राउज़ करें",
    "saved": "सहेजा गया",

    // Notifications
    "no_notifications": "कोई सूचनाएं नहीं",
    "mark_all_as_read": "सभी को पढ़ा गया के रूप में चिह्नित करें",
    "all_caught_up": "आप सभी सूचनाएं पढ़ चुके हैं!",
    "new_updates": "नए अपडेट",
    "total": "कुल",
    "unread": "अपठित",
    "read": "पढ़ा गया",
    "pro_tip": "प्रो टिप",

    // Recently Viewed
    "recently_viewed": "हाल ही में देखा गया",
    "items_in_history": "आपके इतिहास में आइटम",
    "no_browsing_history": "कोई ब्राउज़िंग इतिहास नहीं",
    "loading_history": "आपका इतिहास लोड हो रहा है...",
    "browse_posts": "पोस्ट ब्राउज़ करें",
    "clear_all": "सब साफ़ करें",

    // Categories
    "categories": "श्रेणियां",
    "all": "सभी",
    "electronics": "इलेक्ट्रॉनिक्स",
    "mobiles": "मोबाइल",
    "fashion": "फैशन",
    "furniture": "फर्नीचर",
    "books": "किताबें",
    "sports": "खेल",
    "toys": "खिलौने",
    "other": "अन्य",

    // Filters
    "filter": "फ़िल्टर",
    "sort_by": "क्रमबद्ध करें",
    "price": "मूल्य",
    "price_range": "मूल्य सीमा",
    "min_price": "न्यूनतम मूल्य",
    "max_price": "अधिकतम मूल्य",
    "price_low_high": "मूल्य: कम से अधिक",
    "price_high_low": "मूल्य: अधिक से कम",
    "newest_first": "नवीनतम पहले",
    "oldest_first": "सबसे पुराना पहले",
    "default": "डिफ़ॉल्ट",
    "apply_filters": "फ़िल्टर लागू करें",
    "clear_filters": "फ़िल्टर साफ़ करें",

    // Common
    "verified": "सत्यापित",
    "not_verified": "असत्यापित",
    "active": "सक्रिय",
    "inactive": "निष्क्रिय",
    "pending": "लंबित",
    "success": "सफलता",
    "error": "त्रुटि",
    "warning": "चेतावनी",
    "info": "जानकारी",
    "yes": "हाँ",
    "no": "नहीं",
    "unknown": "अज्ञात",
    "no_description": "कोई विवरण नहीं",
    "interested": "रुचि है",

    // More menu items
    "nearby": "आस-पास",
    "chat": "चैट",
    "feedback": "प्रतिक्रिया",
    "complaints": "शिकायतें",
    "dashboard": "डैशबोर्ड",
    "admin_panel": "एडमिन पैनल",
    "more_options": "अधिक विकल्प",
    "accessibility": "पहुँच",
    "dark_mode": "डार्क मोड",
    "language": "भाषा",
    "select_language": "भाषा चुनें",

    // Status messages
    "something_went_wrong": "कुछ गलत हो गया",
    "try_again": "पुनः प्रयास करें",
    "login_required": "कृपया इस सुविधा तक पहुँचने के लिए लॉग इन करें",

    // Rewards
    "my_recommendations": "मेरी सिफारिशें",
    "my_home": "मेरा होम",
    "top_deals": "शीर्ष सौदे",
    "shop_now": "अभी खरीदें",

    // Description
    "description": "विवरण",
    "title": "शीर्षक",
    "image": "छवि",
    "view": "देखें",
    "views": "दृश्य",
    "sell": "बेचें"
};

// Update hi.json
let count = 0;
Object.keys(hindiTranslations).forEach(key => {
    if (!hi[key] || hi[key] === hindiTranslations[key.replace('_', ' ')] || /^[A-Za-z]/.test(hi[key])) {
        hi[key] = hindiTranslations[key];
        count++;
    }
});

// Sort and save
const sorted = {};
Object.keys(hi).sort().forEach(k => sorted[k] = hi[k]);
fs.writeFileSync(hiPath, JSON.stringify(sorted, null, 2));
console.log(`Updated ${count} Hindi translations. Total keys: ${Object.keys(sorted).length}`);
