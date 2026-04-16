const fs = require('fs');

const bnPath = 'client/src/locales/bn.json';
const bn = JSON.parse(fs.readFileSync(bnPath, 'utf8'));

// Bengali translations for common keys
const bengaliTranslations = {
    // Basic UI
    "news_updates": "খবর এবং আপডেট",
    "share_knowledge": "সম্প্রদায়ের সাথে জ্ঞান, খবর এবং আপডেট শেয়ার করুন",
    "share_update": "আপডেট শেয়ার করুন",
    "view_details": "বিস্তারিত দেখুন",
    "view_more": "আরও দেখুন",
    "no_posts_available": "কোনো পোস্ট উপলব্ধ নেই",
    "loading": "লোড হচ্ছে...",
    "my_posts": "আমার পোস্ট",
    "all_posts": "সব পোস্ট",

    // Navigation & Menu
    "home": "হোম",
    "feed": "ফিড",
    "my_feed": "আমার ফিড",
    "profile": "প্রোফাইল",
    "rewards": "পুরস্কার",
    "more": "আরও",
    "search": "অনুসন্ধান",
    "settings": "সেটিংস",
    "notifications": "বিজ্ঞপ্তি",
    "messages": "বার্তা",
    "logout": "লগ আউট",
    "login": "লগ ইন",
    "signup": "সাইন আপ",

    // Actions
    "like": "পছন্দ",
    "share": "শেয়ার করুন",
    "comment": "মন্তব্য",
    "save": "সংরক্ষণ করুন",
    "cancel": "বাতিল করুন",
    "submit": "জমা দিন",
    "delete": "মুছুন",
    "edit": "সম্পাদনা",
    "update": "আপডেট",
    "create": "তৈরি করুন",
    "apply": "প্রয়োগ করুন",
    "reset": "পুনরায় সেট করুন",
    "confirm": "নিশ্চিত করুন",
    "back": "পেছনে",
    "next": "পরবর্তী",

    // Auth
    "email": "ইমেল",
    "password": "পাসওয়ার্ড",
    "phone": "ফোন নম্বর",
    "sign_in": "সাইন ইন",
    "create_account": "অ্যাকাউন্ট তৈরি করুন",
    "forgot_password": "পাসওয়ার্ড ভুলে গেছেন?",
    "welcome_back": "স্বাগতম",
    "sign_in_to_account": "আপনার অ্যাকাউন্টে সাইন ইন করুন",
    "logging_in": "লগ ইন হচ্ছে...",
    "login_successful": "সফলভাবে লগ ইন হয়েছে",
    "login_failed": "লগ ইন ব্যর্থ হয়েছে",

    // Profile
    "personal_info": "ব্যক্তিগত তথ্য",
    "verification": "যাচাইকরণ",
    "preferences": "পছন্দসমূহ",
    "full_name": "পুরো নাম",
    "date_of_birth": "জন্ম তারিখ",
    "gender": "লিঙ্গ",
    "male": "পুরুষ",
    "female": "মহিলা",
    "address": "ঠিকানা",
    "city": "শহর",
    "location": "অবস্থান",

    // Wishlist
    "wishlist": "উইশলিস্ট",
    "my_wishlist": "আমার উইশলিস্ট",
    "wishlist_empty": "আপনার উইশলিস্ট খালি",
    "save_favorites": "আপনার পছন্দের আইটেমগুলি পরে সংরক্ষণের জন্য রাখুন",
    "saved_items": "সংরক্ষিত আইটেম",
    "start_saving": "আপনার পছন্দের আইটেম সংরক্ষণ করা শুরু করুন!",
    "browse_products": "পণ্য ব্রাউজ করুন",
    "saved": "সংরক্ষিত",

    // Notifications
    "no_notifications": "কোনো বিজ্ঞপ্তি নেই",
    "mark_all_as_read": "সব পড়া হয়েছে হিসেবে চিহ্নিত করুন",
    "all_caught_up": "আপনি সব বিজ্ঞপ্তি পড়েছেন!",
    "new_updates": "নতুন আপডেট",
    "total": "মোট",
    "unread": "পড়া হয়নি",
    "read": "পড়া হয়েছে",
    "pro_tip": "প্রো টিপ",

    // Recently Viewed
    "recently_viewed": "সম্প্রতি দেখা হয়েছে",
    "items_in_history": "আপনার ইতিহাসের আইটেম",
    "no_browsing_history": "কোনো ব্রাউজিং ইতিহাস নেই",
    "loading_history": "আপনার ইতিহাস লোড হচ্ছে...",
    "browse_posts": "পোস্ট ব্রাউজ করুন",
    "clear_all": "সব মুছুন",

    // Categories
    "categories": "বিভাগ",
    "all": "সব",
    "electronics": "ইলেকট্রনিক্স",
    "mobiles": "মোবাইল",
    "fashion": "ফ্যাশন",
    "furniture": "আসবাবপত্র",
    "books": "বই",
    "sports": "খেলাধুলা",
    "toys": "খেলনা",
    "other": "অন্যান্য",
    "home_appliances": "গৃহস্থালী যন্ত্রপাতি",
    "kids": "বাচ্চাদের",
    "vehicles": "যানবাহন",
    "beauty": "সৌন্দর্য",
    "properties": "সম্পত্তি",
    "cameras": "ক্যামেরা",
    "laptops": "ল্যাপটপ",
    "bikes": "বাইক",
    "cars": "গাড়ি",

    // Filters
    "filter": "ফিল্টার",
    "sort_by": "বাছাই করুন",
    "price": "দাম",
    "price_range": "দামের সীমা",
    "min_price": "ন্যূনতম দাম",
    "max_price": "সর্বোচ্চ দাম",
    "price_low_high": "দাম: কম থেকে বেশি",
    "price_high_low": "দাম: বেশি থেকে কম",
    "newest_first": "নতুনতম প্রথমে",
    "oldest_first": "পুরানো প্রথমে",
    "default": "ডিফল্ট",
    "apply_filters": "ফিল্টার প্রয়োগ করুন",
    "clear_filters": "ফিল্টার মুছুন",

    // Common
    "verified": "যাচাইকৃত",
    "not_verified": "যাচাই করা হয়নি",
    "active": "সক্রিয়",
    "inactive": "নিষ্ক্রিয়",
    "pending": "অপেক্ষমান",
    "success": "সফল",
    "error": "ত্রুটি",
    "warning": "সতর্কতা",
    "info": "তথ্য",
    "yes": "হ্যাঁ",
    "no": "না",
    "unknown": "অজানা",
    "no_description": "কোনো বিবরণ নেই",
    "interested": "আগ্রহী",

    // More menu items
    "nearby": "কাছাকাছি",
    "chat": "চ্যাট",
    "feedback": "মতামত",
    "complaints": "অভিযোগ",
    "dashboard": "ড্যাশবোর্ড",
    "admin_panel": "অ্যাডমিন প্যানেল",
    "more_options": "আরও বিকল্প",
    "accessibility": "অ্যাক্সেসিবিলিটি",
    "dark_mode": "ডার্ক মোড",
    "language": "ভাষা",
    "select_language": "ভাষা নির্বাচন করুন",

    // Status messages
    "something_went_wrong": "কিছু ভুল হয়েছে",
    "try_again": "আবার চেষ্টা করুন",
    "login_required": "এই বৈশিষ্ট্যটি অ্যাক্সেস করার জন্য অনুগ্রহ করে লগ ইন করুন",

    // Rewards
    "my_recommendations": "আমার সুপারিশ",
    "my_home": "আমার হোম",
    "top_deals": "শীর্ষ ডিল",
    "shop_now": "এখনই কিনুন",
    "rewards_stats": "পুরস্কার পরিসংখ্যান",
    "referrals": "রেফারেল",
    "coins": "কয়েন",
    "streak": "স্ট্রিক",

    // Description
    "description": "বিবরণ",
    "title": "শিরোনাম",
    "image": "ছবি",
    "view": "দেখুন",
    "views": "ভিউজ",
    "sell": "বিক্রয়"
};

// Update bn.json
let count = 0;
Object.keys(bengaliTranslations).forEach(key => {
    if (!bn[key] || /^[A-Za-z\s&]+$/.test(bn[key])) {
        bn[key] = bengaliTranslations[key];
        count++;
    }
});

// Sort and save
const sorted = {};
Object.keys(bn).sort().forEach(k => sorted[k] = bn[k]);
fs.writeFileSync(bnPath, JSON.stringify(sorted, null, 2));
console.log(`Updated ${count} Bengali translations. Total keys: ${Object.keys(sorted).length}`);
