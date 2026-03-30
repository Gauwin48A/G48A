const fs = require('fs');

const tePath = 'client/src/locales/te.json';
const te = JSON.parse(fs.readFileSync(tePath, 'utf8'));

// Telugu translations for common keys
const teluguTranslations = {
    // Basic UI
    "news_updates": "వార్తలు & నవీకరణలు",
    "share_knowledge": "సమాజంతో జ్ఞానం, వార్తలు మరియు నవీకరణలు పంచుకోండి",
    "share_update": "నవీకరణ పంచుకోండి",
    "view_details": "వివరాలు చూడండి",
    "view_more": "మరింత చూడండి",
    "no_posts_available": "పోస్టులు అందుబాటులో లేవు",
    "loading": "లోడ్ అవుతోంది...",
    "my_posts": "నా పోస్టులు",
    "all_posts": "అన్ని పోస్టులు",

    // Navigation & Menu
    "home": "హోమ్",
    "feed": "ఫీడ్",
    "my_feed": "నా ఫీడ్",
    "profile": "ప్రొఫైల్",
    "rewards": "రివార్డ్లు",
    "more": "మరిన్ని",
    "search": "వెతకండి",
    "settings": "సెట్టింగ్‌లు",
    "notifications": "నోటిఫికేషన్లు",
    "messages": "సందేశాలు",
    "logout": "లాగ్ అవుట్",
    "login": "లాగిన్",
    "signup": "సైన్ అప్",

    // Actions
    "like": "ఇష్టం",
    "share": "షేర్ చేయండి",
    "comment": "వ్యాఖ్య",
    "save": "సేవ్ చేయండి",
    "cancel": "రద్దు చేయండి",
    "submit": "సమర్పించండి",
    "delete": "తొలగించండి",
    "edit": "సవరించండి",
    "update": "అప్‌డేట్ చేయండి",
    "create": "సృష్టించండి",
    "apply": "అమలు చేయండి",
    "reset": "రీసెట్",
    "confirm": "నిర్ధారించండి",
    "back": "వెనుకకు",
    "next": "తరువాత",

    // Auth
    "email": "ఇమెయిల్",
    "password": "పాస్‌వర్డ్",
    "phone": "ఫోన్ నంబర్",
    "sign_in": "సైన్ ఇన్",
    "create_account": "ఖాతా సృష్టించండి",
    "forgot_password": "పాస్‌వర్డ్ మర్చిపోయారా?",
    "welcome_back": "తిరిగి స్వాగతం",
    "sign_in_to_account": "మీ ఖాతాలో సైన్ ఇన్ చేయండి",
    "logging_in": "లాగిన్ అవుతోంది...",
    "login_successful": "లాగిన్ విజయవంతం",
    "login_failed": "లాగిన్ విఫలమైంది",

    // Profile
    "personal_info": "వ్యక్తిగత సమాచారం",
    "verification": "ధృవీకరణ",
    "preferences": "ప్రాధాన్యతలు",
    "full_name": "పూర్తి పేరు",
    "date_of_birth": "పుట్టిన తేదీ",
    "gender": "లింగం",
    "male": "పురుషుడు",
    "female": "స్త్రీ",
    "address": "చిరునామా",
    "city": "నగరం",
    "location": "స్థానం",

    // Wishlist
    "wishlist": "విష్ లిస్ట్",
    "my_wishlist": "నా విష్ లిస్ట్",
    "wishlist_empty": "మీ విష్ లిస్ట్ ఖాళీగా ఉంది",
    "save_favorites": "మీ ఇష్టమైన అంశాలను తర్వాత కోసం సేవ్ చేయండి",
    "saved_items": "సేవ్ చేసిన అంశాలు",
    "start_saving": "మీకు నచ్చిన అంశాలను సేవ్ చేయడం ప్రారంభించండి!",
    "browse_products": "ఉత్పత్తులను బ్రౌజ్ చేయండి",
    "saved": "సేవ్ చేయబడింది",

    // Notifications
    "no_notifications": "నోటిఫికేషన్లు లేవు",
    "mark_all_as_read": "అన్నింటినీ చదివినట్లు గుర్తించండి",
    "all_caught_up": "మీరు అన్ని నోటిఫికేషన్లు చదివారు!",
    "new_updates": "కొత్త అప్‌డేట్లు",
    "total": "మొత్తం",
    "unread": "చదవనివి",
    "read": "చదివినవి",
    "pro_tip": "ప్రో టిప్",

    // Recently Viewed
    "recently_viewed": "ఇటీవల చూసినవి",
    "items_in_history": "మీ చరిత్రలో అంశాలు",
    "no_browsing_history": "బ్రౌజింగ్ చరిత్ర లేదు",
    "loading_history": "మీ చరిత్ర లోడ్ అవుతోంది...",
    "browse_posts": "పోస్టులు బ్రౌజ్ చేయండి",
    "clear_all": "అన్నీ క్లియర్ చేయండి",

    // Categories
    "categories": "వర్గాలు",
    "all": "అన్నీ",
    "electronics": "ఎలక్ట్రానిక్స్",
    "mobiles": "మొబైల్స్",
    "fashion": "ఫ్యాషన్",
    "furniture": "ఫర్నిచర్",
    "books": "పుస్తకాలు",
    "sports": "స్పోర్ట్స్",
    "toys": "బొమ్మలు",
    "other": "ఇతరాలు",

    // Filters
    "filter": "ఫిల్టర్",
    "sort_by": "క్రమబద్ధీకరించు",
    "price": "ధర",
    "price_range": "ధర పరిధి",
    "min_price": "కనిష్ట ధర",
    "max_price": "గరిష్ట ధర",
    "price_low_high": "ధర: తక్కువ నుండి ఎక్కువ",
    "price_high_low": "ధర: ఎక్కువ నుండి తక్కువ",
    "newest_first": "కొత్తవి మొదట",
    "oldest_first": "పాతవి మొదట",
    "default": "డిఫాల్ట్",
    "apply_filters": "ఫిల్టర్లు అమలు చేయండి",
    "clear_filters": "ఫిల్టర్లు క్లియర్ చేయండి",

    // Common
    "verified": "ధృవీకరించబడింది",
    "not_verified": "ధృవీకరించబడలేదు",
    "active": "యాక్టివ్",
    "inactive": "ఇన్‌యాక్టివ్",
    "pending": "పెండింగ్",
    "success": "విజయం",
    "error": "ఎర్రర్",
    "warning": "హెచ్చరిక",
    "info": "సమాచారం",
    "yes": "అవును",
    "no": "కాదు",
    "unknown": "తెలియదు",
    "no_description": "వివరణ లేదు",
    "interested": "ఆసక్తి",

    // More menu items
    "nearby": "సమీపంలో",
    "chat": "చాట్",
    "feedback": "ఫీడ్‌బ్యాక్",
    "complaints": "ఫిర్యాదులు",
    "dashboard": "డాష్‌బోర్డ్",
    "admin_panel": "అడ్మిన్ ప్యానెల్",
    "more_options": "మరిన్ని ఎంపికలు",
    "accessibility": "యాక్సెసిబిలిటీ",
    "dark_mode": "డార్క్ మోడ్",
    "language": "భాష",
    "select_language": "భాష ఎంచుకోండి",

    // Status messages
    "something_went_wrong": "ఏదో తప్పు జరిగింది",
    "try_again": "మళ్ళీ ప్రయత్నించండి",
    "login_required": "ఈ ఫీచర్‌ను యాక్సెస్ చేయడానికి దయచేసి లాగిన్ అవ్వండి",

    // Rewards
    "my_recommendations": "నా సిఫార్సులు",
    "my_home": "నా హోమ్",
    "top_deals": "టాప్ డీల్స్",
    "shop_now": "ఇప్పుడే షాపింగ్ చేయండి",

    // Description
    "description": "వివరణ",
    "title": "శీర్షిక",
    "image": "చిత్రం",
    "view": "చూడండి",
    "views": "వీక్షణలు",
    "sell": "అమ్మండి"
};

// Update te.json
let count = 0;
Object.keys(teluguTranslations).forEach(key => {
    if (!te[key] || /^[A-Za-z]/.test(te[key])) {
        te[key] = teluguTranslations[key];
        count++;
    }
});

// Sort and save
const sorted = {};
Object.keys(te).sort().forEach(k => sorted[k] = te[k]);
fs.writeFileSync(tePath, JSON.stringify(sorted, null, 2));
console.log(`Updated ${count} Telugu translations. Total keys: ${Object.keys(sorted).length}`);
