const fs = require('fs');

const knPath = 'client/src/locales/kn.json';
const kn = JSON.parse(fs.readFileSync(knPath, 'utf8'));

// Kannada translations for common keys
const kannadaTranslations = {
    // Basic UI
    "news_updates": "ಸುದ್ದಿ ಮತ್ತು ನವೀಕರಣಗಳು",
    "share_knowledge": "ಸಮುದಾಯದೊಂದಿಗೆ ಜ್ಞಾನ, ಸುದ್ದಿ ಮತ್ತು ನವೀಕರಣಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
    "share_update": "ನವೀಕರಣವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
    "view_details": "ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    "view_more": "ಹೆಚ್ಚು ವೀಕ್ಷಿಸಿ",
    "no_posts_available": "ಯಾವುದೇ ಪೋಸ್ಟ್ಗಳು ಲಭ್ಯವಿಲ್ಲ",
    "loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "my_posts": "ನನ್ನ ಪೋಸ್ಟ್ಗಳು",
    "all_posts": "ಎಲ್ಲಾ ಪೋಸ್ಟ್ಗಳು",

    // Navigation & Menu
    "home": "ಮನೆ",
    "feed": "ಫೀಡ್",
    "my_feed": "ನನ್ನ ಫೀಡ್",
    "profile": "ಪ್ರೊಫೈಲ್",
    "rewards": "ಬಹುಮಾನಗಳು",
    "more": "ಇನ್ನಷ್ಟು",
    "search": "ಹುಡುಕಿ",
    "settings": "ಸೆಟ್ಟಿಂಗ್ಗಳು",
    "notifications": "ಅಧಿಸೂಚನೆಗಳು",
    "messages": "ಸಂದೇಶಗಳು",
    "logout": "ಲಾಗ್ ಔಟ್",
    "login": "ಲಾಗ್ ಇನ್",
    "signup": "ಸೈನ್ ಅಪ್",

    // Actions
    "like": "ಇಷ್ಟ",
    "share": "ಹಂಚಿಕೊಳ್ಳಿ",
    "comment": "ಕಾಮೆಂಟ್",
    "save": "ಉಳಿಸಿ",
    "cancel": "ರದ್ದುಮಾಡಿ",
    "submit": "ಸಲ್ಲಿಸಿ",
    "delete": "ಅಳಿಸಿ",
    "edit": "ತಿದ್ದುಪಡಿ",
    "update": "ನವೀಕರಿಸಿ",
    "create": "ರಚಿಸಿ",
    "apply": "ಅನ್ವಯಿಸಿ",
    "reset": "ಮರುಹೊಂದಿಸಿ",
    "confirm": "ದೃಢೀಕರಿಸಿ",
    "back": "ಹಿಂದೆ",
    "next": "ಮುಂದೆ",

    // Auth
    "email": "ಇಮೇಲ್",
    "password": "ಪಾಸ್ವರ್ಡ್",
    "phone": "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
    "sign_in": "ಸೈನ್ ಇನ್",
    "create_account": "ಖಾತೆ ರಚಿಸಿ",
    "forgot_password": "ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರಾ?",
    "welcome_back": "ಸ್ವಾಗತ",
    "sign_in_to_account": "ನಿಮ್ಮ ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ",
    "logging_in": "ಲಾಗ್ ಇನ್ ಆಗುತ್ತಿದೆ...",
    "login_successful": "ಯಶಸ್ವಿಯಾಗಿ ಲಾಗ್ ಇನ್ ಆಗಿದೆ",
    "login_failed": "ಲಾಗ್ ಇನ್ ವಿಫಲವಾಗಿದೆ",

    // Profile
    "personal_info": "ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ",
    "verification": "ಪರಿಶೀಲನೆ",
    "preferences": "ಆದ್ಯತೆಗಳು",
    "full_name": "ಪೂರ್ಣ ಹೆಸರು",
    "date_of_birth": "ಹುಟ್ಟಿದ ದಿನಾಂಕ",
    "gender": "ಲಿಂಗ",
    "male": "ಪುರುಷ",
    "female": "ಮಹಿಳೆ",
    "address": "ವಿಳಾಸ",
    "city": "ನಗರ",
    "location": "ಸ್ಥಳ",

    // Wishlist
    "wishlist": "ವಿಶ್ಲಿಸ್ಟ್",
    "my_wishlist": "ನನ್ನ ವಿಶ್ಲಿಸ್ಟ್",
    "wishlist_empty": "ನಿಮ್ಮ ವಿಶ್ಲಿಸ್ಟ್ ಖಾಲಿಯಾಗಿದೆ",
    "save_favorites": "ನಿಮ್ಮ ಮೆಚ್ಚಿನ ವಸ್ತುಗಳನ್ನು ಉಳಿಸಿ",
    "saved_items": "ಉಳಿಸಿದ ವಸ್ತುಗಳು",
    "start_saving": "ನಿಮಗೆ ಇಷ್ಟವಾದ ವಸ್ತುಗಳನ್ನು ಉಳಿಸಲು ಪ್ರಾರಂಭಿಸಿ!",
    "browse_products": "ಉತ್ಪನ್ನಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ",
    "saved": "ಉಳಿಸಲಾಗಿದೆ",

    // Notifications
    "no_notifications": "ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ",
    "mark_all_as_read": "ಎಲ್ಲವನ್ನೂ ಓದಿದಂತೆ ಗುರುತಿಸಿ",
    "all_caught_up": "ನೀವು ಎಲ್ಲಾ ಅಧಿಸೂಚನೆಗಳನ್ನು ಓದಿದ್ದೀರಿ!",
    "new_updates": "ಹೊಸ ನವೀಕರಣಗಳು",
    "total": "ಒಟ್ಟು",
    "unread": "ಓದಿಲ್ಲದ",
    "read": "ಓದಿದ",
    "pro_tip": "ಪ್ರೊ ಸಲಹೆ",

    // Recently Viewed
    "recently_viewed": "ಇತ್ತೀಚೆಗೆ ವೀಕ್ಷಿಸಿದ",
    "items_in_history": "ನಿಮ್ಮ ಇತಿಹಾಸದಲ್ಲಿನ ವಸ್ತುಗಳು",
    "no_browsing_history": "ಯಾವುದೇ ಬ್ರೌಸಿಂಗ್ ಇತಿಹಾಸವಿಲ್ಲ",
    "loading_history": "ನಿಮ್ಮ ಇತಿಹಾಸ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "browse_posts": "ಪೋಸ್ಟ್ಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ",
    "clear_all": "ಎಲ್ಲವನ್ನೂ ತೆರವುಗೊಳಿಸಿ",

    // Categories
    "categories": "ವರ್ಗಗಳು",
    "all": "ಎಲ್ಲಾ",
    "electronics": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್",
    "mobiles": "ಮೊಬೈಲ್ಗಳು",
    "fashion": "ಫ್ಯಾಷನ್",
    "furniture": "ಪೀಠೋಪಕರಣಗಳು",
    "books": "ಪುಸ್ತಕಗಳು",
    "sports": "ಕ್ರೀಡೆ",
    "toys": "ಆಟಿಕೆಗಳು",
    "other": "ಇತರೆ",
    "home_appliances": "ಗೃಹೋಪಯೋಗಿ ಉಪಕರಣಗಳು",
    "kids": "ಮಕ್ಕಳು",
    "vehicles": "ವಾಹನಗಳು",
    "beauty": "ಸೌಂದರ್ಯ",
    "properties": "ಆಸ್ತಿಗಳು",
    "cameras": "ಕ್ಯಾಮರಗಳು",
    "laptops": "ಲ್ಯಾಪ್ಟಾಪ್ಗಳು",
    "bikes": "ಬೈಕುಗಳು",
    "cars": "ಕಾರುಗಳು",

    // Filters
    "filter": "ಫಿಲ್ಟರ್",
    "sort_by": "ವಿಂಗಡಿಸಿ",
    "price": "ಬೆಲೆ",
    "price_range": "ಬೆಲೆ ಶ್ರೇಣಿ",
    "min_price": "ಕನಿಷ್ಠ ಬೆಲೆ",
    "max_price": "ಗರಿಷ್ಠ ಬೆಲೆ",
    "price_low_high": "ಬೆಲೆ: ಕಡಿಮೆ ಇಂದ ಹೆಚ್ಚು",
    "price_high_low": "ಬೆಲೆ: ಹೆಚ್ಚು ಇಂದ ಕಡಿಮೆ",
    "newest_first": "ಹೊಸದು ಮೊದಲು",
    "oldest_first": "ಹಳೆಯದು ಮೊದಲು",
    "default": "ಡೀಫಾಲ್ಟ್",
    "apply_filters": "ಫಿಲ್ಟರ್ಗಳನ್ನು ಅನ್ವಯಿಸಿ",
    "clear_filters": "ಫಿಲ್ಟರ್ಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ",

    // Common
    "verified": "ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
    "not_verified": "ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ",
    "active": "ಸಕ್ರಿಯ",
    "inactive": "ನಿಷ್ಕ್ರಿಯ",
    "pending": "ಬಾಕಿ ಇದೆ",
    "success": "ಯಶಸ್ಸು",
    "error": "ದೋಷ",
    "warning": "ಎಚ್ಚರಿಕೆ",
    "info": "ಮಾಹಿತಿ",
    "yes": "ಹೌದು",
    "no": "ಇಲ್ಲ",
    "unknown": "ಗೊತ್ತಿಲ್ಲ",
    "no_description": "ಯಾವುದೇ ವಿವರಣೆ ಇಲ್ಲ",
    "interested": "ಆಸಕ್ತಿ",

    // More menu items
    "nearby": "ಹತ್ತಿರದ",
    "chat": "ಚಾಟ್",
    "feedback": "ಪ್ರತಿಕ್ರಿಯೆ",
    "complaints": "ದೂರುಗಳು",
    "dashboard": "ಡ್ಯಾಶ್ಬೋರ್ಡ್",
    "admin_panel": "ಅಡ್ಮಿನ್ ಪ್ಯಾನಲ್",
    "more_options": "ಹೆಚ್ಚಿನ ಆಯ್ಕೆಗಳು",
    "accessibility": "ಪ್ರವೇಶಸಾಧ್ಯತೆ",
    "dark_mode": "ಡಾರ್ಕ್ ಮೋಡ್",
    "language": "ಭಾಷೆ",
    "select_language": "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",

    // Status messages
    "something_went_wrong": "ಏನೋ ತಪ್ಪಾಗಿದೆ",
    "try_again": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "login_required": "ಈ ವೈಶಿಷ್ಟ್ಯವನ್ನು ಪ್ರವೇಶಿಸಲು ದಯವಿಟ್ಟು ಲಾಗ್ ಇನ್ ಮಾಡಿ",

    // Rewards
    "my_recommendations": "ನನ್ನ ಶಿಫಾರಸುಗಳು",
    "my_home": "ನನ್ನ ಮನೆ",
    "top_deals": "ಪ್ರಮುಖ ಡೀಲ್ಗಳು",
    "shop_now": "ಈಗ ಶಾಪಿಂಗ್ ಮಾಡಿ",
    "rewards_stats": "ಬಹುಮಾನ ಅಂಕಿಅಂಶಗಳು",
    "referrals": "ರೆಫರಲ್ಗಳು",
    "coins": "ನಾಣ್ಯಗಳು",
    "streak": "ಸ್ಟ್ರೋಗ್",

    // Description
    "description": "ವಿವರಣೆ",
    "title": "ಶೀರ್ಷಿಕೆ",
    "image": "ಚಿತ್ರ",
    "view": "ವೀಕ್ಷಿಸಿ",
    "views": "ವೀಕ್ಷಣೆಗಳು",
    "sell": "ಮಾರಾಟ"
};

// Update kn.json
let count = 0;
Object.keys(kannadaTranslations).forEach(key => {
    if (!kn[key] || /^[A-Za-z\s&]+$/.test(kn[key])) {
        kn[key] = kannadaTranslations[key];
        count++;
    }
});

// Sort and save
const sorted = {};
Object.keys(kn).sort().forEach(k => sorted[k] = kn[k]);
fs.writeFileSync(knPath, JSON.stringify(sorted, null, 2));
console.log(`Updated ${count} Kannada translations. Total keys: ${Object.keys(sorted).length}`);
