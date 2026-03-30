const fs = require('fs');

const mrPath = 'client/src/locales/mr.json';
const mr = JSON.parse(fs.readFileSync(mrPath, 'utf8'));

// Marathi translations for common keys
const marathiTranslations = {
    // Basic UI
    "news_updates": "बातम्या आणि अपडेट्स",
    "share_knowledge": "समुदायासोबत ज्ञान, बातम्या आणि अपडेट्स शेअर करा",
    "share_update": "अपडेट शेअर करा",
    "view_details": "तपशील पहा",
    "view_more": "आणखी पहा",
    "no_posts_available": "कोणत्याही पोस्ट उपलब्ध नाहीत",
    "loading": "लोड होत आहे...",
    "my_posts": "माझ्या पोस्ट",
    "all_posts": "सर्व पोस्ट",

    // Navigation & Menu
    "home": "होम",
    "feed": "फीड",
    "my_feed": "माझे फीड",
    "profile": "प्रोफाइल",
    "rewards": "बक्षिसे",
    "more": "अधिक",
    "search": "शोधा",
    "settings": "सेटिंग्ज",
    "notifications": "सूचना",
    "messages": "संदेश",
    "logout": "लॉग आउट",
    "login": "लॉग इन",
    "signup": "साइन अप",

    // Actions
    "like": "आवडले",
    "share": "शेअर करा",
    "comment": "टिप्पणी",
    "save": "सेव्ह करा",
    "cancel": "रद्द करा",
    "submit": "सबमिट करा",
    "delete": "हटवा",
    "edit": "संपादित करा",
    "update": "अपडेट करा",
    "create": "तयार करा",
    "apply": "लागू करा",
    "reset": "रीसेट करा",
    "confirm": "पुष्टी करा",
    "back": "मागे",
    "next": "पुढील",

    // Auth
    "email": "ईमेल",
    "password": "पासवर्ड",
    "phone": "फोन नंबर",
    "sign_in": "साइन इन",
    "create_account": "खाते तयार करा",
    "forgot_password": "पासवर्ड विसरलात?",
    "welcome_back": "बिघारी आपले स्वागत आहे",
    "sign_in_to_account": "आपल्या खात्यात साइन इन करा",
    "logging_in": "लॉग इन करत आहे...",
    "login_successful": "यशस्वीरित्या लॉग इन केले",
    "login_failed": "लॉग इन अयशस्वी",

    // Profile
    "personal_info": "वैयक्तिक माहिती",
    "verification": "पडताळणी",
    "preferences": "प्राधान्ये",
    "full_name": "पूर्ण नाव",
    "date_of_birth": "जन्मतारीख",
    "gender": "लिंग",
    "male": "पुरुष",
    "female": "स्त्री",
    "address": "पत्ता",
    "city": "शहर",
    "location": "स्थान",

    // Wishlist
    "wishlist": "विशलिस्ट",
    "my_wishlist": "माझी विशलिस्ट",
    "wishlist_empty": "तुमची विशलिस्ट रिकामी आहे",
    "save_favorites": "तुमच्या आवडीच्या वस्तू नंतरसाठी सेव्ह करा",
    "saved_items": "सेव्ह केलेल्या वस्तू",
    "start_saving": "तुम्हाला आवडणाऱ्या वस्तू सेव्ह करणे सुरू करा!",
    "browse_products": "उत्पादने ब्राउझ करा",
    "saved": "सेव्ह केले",

    // Notifications
    "no_notifications": "कोणत्याही सूचना नाहीत",
    "mark_all_as_read": "सर्व वाचलेले म्हणून चिन्हांकित करा",
    "all_caught_up": "तुम्ही सर्व काही वाचले आहे!",
    "new_updates": "नवीन अपडेट्स",
    "total": "एकूण",
    "unread": "न वाचलेले",
    "read": "वाचले",
    "pro_tip": "प्रो टिप",

    // Recently Viewed
    "recently_viewed": "अलीकडे पाहिलेले",
    "items_in_history": "तुमच्या इतिहासातील वस्तू",
    "no_browsing_history": "कोणताही ब्राउझिंग इतिहास नाही",
    "loading_history": "तुमचा इतिहास लोड होत आहे...",
    "browse_posts": "पोस्ट ब्राउझ करा",
    "clear_all": "सर्व साफ करा",

    // Categories
    "categories": "श्रेण्या",
    "all": "सर्व",
    "electronics": "इलेक्ट्रॉनिक्स",
    "mobiles": "मोबाईल",
    "fashion": "फॅशन",
    "furniture": "फर्निचर",
    "books": "पुस्तके",
    "sports": "क्रीडा",
    "toys": "खेळणी",
    "other": "इतर",
    "home_appliances": "गृहोपयोगी उपकरणे",
    "kids": "लहान मुले",
    "vehicles": "वाहने",
    "beauty": "सौंदर्य",
    "properties": "मालमत्ता",
    "cameras": "कॅमेरे",
    "laptops": "लॅपटॉप",
    "bikes": "दुचाकी",
    "cars": "चारचाकी",

    // Filters
    "filter": "फिल्टर",
    "sort_by": "क्रमवारी लावा",
    "price": "किंमत",
    "price_range": "किंमत श्रेणी",
    "min_price": "किमान किंमत",
    "max_price": "कमाल किंमत",
    "price_low_high": "किंमत: कमी ते जास्त",
    "price_high_low": "किंमत: जास्त ते कमी",
    "newest_first": "नवीनतम प्रथम",
    "oldest_first": "जुने प्रथम",
    "default": "डीफॉल्ट",
    "apply_filters": "फिल्टर लागू करा",
    "clear_filters": "फिल्टर साफ करा",

    // Common
    "verified": "सत्यापित",
    "not_verified": "असत्यापित",
    "active": "सक्रिय",
    "inactive": "निष्क्रिय",
    "pending": "प्रलंबित",
    "success": "यश",
    "error": "त्रुटी",
    "warning": "इशारा",
    "info": "माहिती",
    "yes": "होय",
    "no": "नाही",
    "unknown": "अज्ञात",
    "no_description": "कोणतेही वर्णन नाही",
    "interested": "इच्छुक",

    // More menu items
    "nearby": "जवळपास",
    "chat": "गप्पा",
    "feedback": "अभिप्राय",
    "complaints": "तक्रारी",
    "dashboard": "डॅशबोर्ड",
    "admin_panel": "अॅडमिन पॅनेल",
    "more_options": "अधिक पर्याय",
    "accessibility": "प्रवेशयोग्यता",
    "dark_mode": "डार्क मोड",
    "language": "भाषा",
    "select_language": "भाषा निवडा",

    // Status messages
    "something_went_wrong": "काहीतरी चूक झाली",
    "try_again": "पुन्हा प्रयत्न करा",
    "login_required": "या वैशिष्ट्यामध्ये प्रवेश करण्यासाठी कृपया लॉग इन करा",

    // Rewards
    "my_recommendations": "माझ्या शिफारसी",
    "my_home": "माझे होम",
    "top_deals": "शीर्ष सौदे",
    "shop_now": "आता खरेदी करा",
    "rewards_stats": "रिवॉर्ड आकडेवारी",
    "referrals": "रेफरल्स",
    "coins": "नाणी",
    "streak": "स्ट्रिक",

    // Description
    "description": "वर्णन",
    "title": "शीर्षक",
    "image": "प्रतिमा",
    "view": "पहा",
    "views": "दृश्ये",
    "sell": "विक्री"
};

// Update mr.json
let count = 0;
Object.keys(marathiTranslations).forEach(key => {
    // Update if missing OR if value is English (same as key or matches known English)
    if (!mr[key] || /^[A-Za-z\s&]+$/.test(mr[key])) {
        mr[key] = marathiTranslations[key];
        count++;
    }
});

// Sort and save
const sorted = {};
Object.keys(mr).sort().forEach(k => sorted[k] = mr[k]);
fs.writeFileSync(mrPath, JSON.stringify(sorted, null, 2));
console.log(`Updated ${count} Marathi translations. Total keys: ${Object.keys(sorted).length}`);
