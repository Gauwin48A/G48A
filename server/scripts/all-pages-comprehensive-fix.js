const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const publicDir = 'client/public/locales';

// COMPREHENSIVE ALL-PAGES Input Placeholders and Labels WITH PROPER CONTEXTUAL TRANSLATIONS
// This covers ALL pages: SavedSearches, Saledone, Offers, GetVerified, FeedPostAdd, 
// CreateChannel, Complaints, Chat, ChannelPage, BuyerView, Auth pages, AddPost
const translations = {
    // ========================
    // SavedSearches Page
    // ========================
    "search_name_placeholder": {
        en: "Search name (e.g., 'Cheap iPhones')",
        hi: "खोज का नाम (उदा., 'सस्ते आईफोन')",
        te: "శోధన పేరు (ఉదా., 'చౌకైన ఐఫోన్లు')",
        ta: "தேடல் பெயர் (எ.கா., 'மலிவான ஐஃபோன்கள்')",
        kn: "ಹುಡುಕಾಟ ಹೆಸರು (ಉದಾ., 'ಅಗ್ಗದ ಐಫೋನ್‌ಗಳು')",
        mr: "शोध नाव (उदा., 'स्वस्त आयफोन')",
        bn: "খোঁজার নাম (যেমন, 'সস্তা আইফোন')"
    },
    "search_keywords_placeholder": {
        en: "Search keywords (e.g., 'iPhone 14')",
        hi: "खोज कीवर्ड (उदा., 'आईफोन 14')",
        te: "శోధన కీవర్డ్లు (ఉదా., 'ఐఫోన్ 14')",
        ta: "தேடல் முக்கிய சொற்கள் (எ.கா., 'ஐஃபோன் 14')",
        kn: "ಹುಡುಕಾಟ ಕೀವರ್ಡ್‌ಗಳು (ಉದಾ., 'ಐಫೋನ್ 14')",
        mr: "शोध कीवर्ड (उदा., 'आयफोन 14')",
        bn: "খোঁজার কীওয়ার্ড (যেমন, 'আইফোন 14')"
    },
    "location_placeholder": {
        en: "Location",
        hi: "स्थान",
        te: "ప్రదేశం",
        ta: "இடம்",
        kn: "ಸ್ಥಳ",
        mr: "स्थान",
        bn: "অবস্থান"
    },
    "min_price_placeholder": {
        en: "Min price",
        hi: "न्यूनतम मूल्य",
        te: "కనిష్ట ధర",
        ta: "குறைந்தபட்ச விலை",
        kn: "ಕನಿಷ್ಠ ಬೆಲೆ",
        mr: "किमान किंमत",
        bn: "সর্বনিম্ন মূল্য"
    },
    "max_price_placeholder": {
        en: "Max price",
        hi: "अधिकतम मूल्य",
        te: "గరిష్ట ధర",
        ta: "அதிகபட்ச விலை",
        kn: "ಗರಿಷ್ಠ ಬೆಲೆ",
        mr: "कमाल किंमत",
        bn: "সর্বোচ্চ মূল্য"
    },

    // ========================
    // Saledone Page
    // ========================
    "post_id_example": {
        en: "e.g., POST-12345",
        hi: "उदा., POST-12345",
        te: "ఉదా., POST-12345",
        ta: "எ.கா., POST-12345",
        kn: "ಉದಾ., POST-12345",
        mr: "उदा., POST-12345",
        bn: "যেমন, POST-12345"
    },
    "user_id_example": {
        en: "e.g., USER-67890",
        hi: "उदा., USER-67890",
        te: "ఉదా., USER-67890",
        ta: "எ.கா., USER-67890",
        kn: "ಉದಾ., USER-67890",
        mr: "उदा., USER-67890",
        bn: "যেমন, USER-67890"
    },
    "ask_seller_for_code": {
        en: "Ask seller for code",
        hi: "विक्रेता से कोड मांगें",
        te: "విక్రేత నుండి కోడ్ అడగండి",
        ta: "விற்பனையாளரிடம் குறியீட்டைக் கேளுங்கள்",
        kn: "ಮಾರಾಟಗಾರರಿಂದ ಕೋಡ್ ಕೇಳಿ",
        mr: "विक्रेत्याकडून कोड मागा",
        bn: "বিক্রেতার কাছ থেকে কোড নিন"
    },
    "from_notification": {
        en: "From notification",
        hi: "सूचना से",
        te: "నోటిఫికేషన్ నుండి",
        ta: "அறிவிப்பிலிருந்து",
        kn: "ಅಧಿಸೂಚನೆಯಿಂದ",
        mr: "सूचनेवरून",
        bn: "নোটিফিকেশন থেকে"
    },

    // ========================
    // Post Add / Feed Post Add
    // ========================
    "enter_description_placeholder": {
        en: "Enter your post description...",
        hi: "अपनी पोस्ट का विवरण दर्ज करें...",
        te: "మీ పోస్ట్ వివరణ నమోదు చేయండి...",
        ta: "உங்கள் இடுகை விளக்கத்தை உள்ளிடவும்...",
        kn: "ನಿಮ್ಮ ಪೋಸ್ಟ್ ವಿವರಣೆಯನ್ನು ನಮೂದಿಸಿ...",
        mr: "तुमच्या पोस्टचे वर्णन प्रविष्ट करा...",
        bn: "আপনার পোস্টের বিবরণ লিখুন..."
    },
    "write_update_here": {
        en: "Write your update here...",
        hi: "यहां अपना अपडेट लिखें...",
        te: "మీ అప్‌డేట్ ఇక్కడ వ్రాయండి...",
        ta: "உங்கள் புதுப்பிப்பை இங்கே எழுதுங்கள்...",
        kn: "ನಿಮ್ಮ ನವೀಕರಣವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...",
        mr: "येथे तुमचे अपडेट लिहा...",
        bn: "এখানে আপনার আপডেট লিখুন..."
    },

    // ========================
    // Offers Page
    // ========================
    "counter_placeholder": {
        en: "Counter",
        hi: "प्रतिप्रस्ताव",
        te: "ప్రతి ఆఫర్",
        ta: "எதிர் சலுகை",
        kn: "ಪ್ರತಿ ಕೊಡುಗೆ",
        mr: "प्रतिप्रस्ताव",
        bn: "পাল্টা প্রস্তাব"
    },

    // ========================
    // Get Verified Page
    // ========================
    "enter_otp_placeholder": {
        en: "XXXX",
        hi: "XXXX",
        te: "XXXX",
        ta: "XXXX",
        kn: "XXXX",
        mr: "XXXX",
        bn: "XXXX"
    },

    // ========================
    // Create Channel Page
    // ========================
    "channel_name_placeholder": {
        en: "Channel/Page Name",
        hi: "चैनल/पेज का नाम",
        te: "ఛానెల్/పేజీ పేరు",
        ta: "சேனல்/பக்க பெயர்",
        kn: "ಚಾನೆಲ್/ಪುಟ ಹೆಸರು",
        mr: "चॅनेल/पेज नाव",
        bn: "চ্যানেল/পেজ নাম"
    },
    "description_placeholder": {
        en: "Description",
        hi: "विवरण",
        te: "వివరణ",
        ta: "விளக்கம்",
        kn: "ವಿವರಣೆ",
        mr: "वर्णन",
        bn: "বিবরণ"
    },
    "media_url_optional": {
        en: "Media URL (optional)",
        hi: "मीडिया यूआरएल (वैकल्पिक)",
        te: "మీడియా URL (ఐచ్ఛికం)",
        ta: "மீடியா URL (விருப்பமானது)",
        kn: "ಮೀಡಿಯಾ URL (ಐಚ್ಛಿಕ)",
        mr: "मीडिया URL (पर्यायी)",
        bn: "মিডিয়া URL (ঐচ্ছিক)"
    },

    // ========================
    // Complaints Page
    // ========================
    "user_id_placeholder": {
        en: "e.g., USER123456",
        hi: "उदा., USER123456",
        te: "ఉదా., USER123456",
        ta: "எ.கா., USER123456",
        kn: "ಉದಾ., USER123456",
        mr: "उदा., USER123456",
        bn: "যেমন, USER123456"
    },
    "post_id_short_placeholder": {
        en: "e.g., POST001",
        hi: "उदा., POST001",
        te: "ఉదా., POST001",
        ta: "எ.கா., POST001",
        kn: "ಉದಾ., POST001",
        mr: "उदा., POST001",
        bn: "যেমন, POST001"
    },
    "transaction_id_placeholder": {
        en: "e.g., ABC123",
        hi: "उदा., ABC123",
        te: "ఉదా., ABC123",
        ta: "எ.கா., ABC123",
        kn: "ಉದಾ., ABC123",
        mr: "उदा., ABC123",
        bn: "যেমন, ABC123"
    },

    // ========================
    // Chat Page
    // ========================
    "search_conversations": {
        en: "Search conversations...",
        hi: "बातचीत खोजें...",
        te: "సంభాషణలు శోధించండి...",
        ta: "உரையாடல்களைத் தேடுங்கள்...",
        kn: "ಸಂಭಾಷಣೆಗಳನ್ನು ಹುಡುಕಿ...",
        mr: "संभाषण शोधा...",
        bn: "কথোপকথন অনুসন্ধান করুন..."
    },
    "type_message_placeholder": {
        en: "Type a message...",
        hi: "संदेश टाइप करें...",
        te: "సందేశం టైప్ చేయండి...",
        ta: "செய்தியைத் தட்டச்சு செய்யுங்கள்...",
        kn: "ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...",
        mr: "संदेश टाईप करा...",
        bn: "একটি বার্তা টাইপ করুন..."
    },

    // ========================
    // Buyer View Page
    // ========================
    "search_mobiles_placeholder": {
        en: "Search mobiles...",
        hi: "मोबाइल खोजें...",
        te: "మొబైల్స్ శోధించండి...",
        ta: "மொபைல்களைத் தேடுங்கள்...",
        kn: "ಮೊಬೈಲ್‌ಗಳನ್ನು ಹುಡುಕಿ...",
        mr: "मोबाईल शोधा...",
        bn: "মোবাইল অনুসন্ধান করুন..."
    },

    // ========================
    // Auth Pages - Login
    // ========================
    "email_placeholder": {
        en: "name@example.com",
        hi: "name@example.com",
        te: "name@example.com",
        ta: "name@example.com",
        kn: "name@example.com",
        mr: "name@example.com",
        bn: "name@example.com"
    },

    // ========================
    // Auth Pages - SignUp
    // ========================
    "enter_full_name": {
        en: "Enter your full name",
        hi: "अपना पूरा नाम दर्ज करें",
        te: "మీ పూర్తి పేరు నమోదు చేయండి",
        ta: "உங்கள் முழு பெயரை உள்ளிடவும்",
        kn: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
        mr: "तुमचे पूर्ण नाव प्रविष्ट करा",
        bn: "আপনার পুরো নাম লিখুন"
    },
    "you_example_email": {
        en: "you@example.com",
        hi: "आप@example.com",
        te: "మీరు@example.com",
        ta: "நீங்கள்@example.com",
        kn: "ನೀವು@example.com",
        mr: "तुम्ही@example.com",
        bn: "আপনি@example.com"
    },
    "create_strong_password": {
        en: "Create a strong password",
        hi: "एक मजबूत पासवर्ड बनाएं",
        te: "బలమైన పాస్‌వర్డ్ సృష్టించండి",
        ta: "வலுவான கடவுச்சொல்லை உருவாக்குங்கள்",
        kn: "ಬಲವಾದ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ",
        mr: "एक मजबूत पासवर्ड तयार करा",
        bn: "একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন"
    },
    "confirm_your_password": {
        en: "Confirm your password",
        hi: "अपना पासवर्ड पुष्टि करें",
        te: "మీ పాస్‌వర్డ్ నిర్ధారించండి",
        ta: "உங்கள் கடவுச்சொல்லை உறுதிப்படுத்தவும்",
        kn: "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ",
        mr: "तुमचा पासवर्ड पुष्टी करा",
        bn: "আপনার পাসওয়ার্ড নিশ্চিত করুন"
    },
    "enter_referral_code": {
        en: "Enter referral code",
        hi: "रेफरल कोड दर्ज करें",
        te: "రిఫరల్ కోడ్ నమోదు చేయండి",
        ta: "பரிந்துரை குறியீட்டை உள்ளிடவும்",
        kn: "ರೆಫರಲ್ ಕೋಡ್ ನಮೂದಿಸಿ",
        mr: "रेफरल कोड प्रविष्ट करा",
        bn: "রেফারেল কোড লিখুন"
    },

    // ========================
    // Auth Pages - Reset/Forgot Password
    // ========================
    "create_new_password": {
        en: "Create new password",
        hi: "नया पासवर्ड बनाएं",
        te: "కొత్త పాస్‌వర్డ్ సృష్టించండి",
        ta: "புதிய கடவுச்சொல்லை உருவாக்குங்கள்",
        kn: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ",
        mr: "नवीन पासवर्ड तयार करा",
        bn: "নতুন পাসওয়ার্ড তৈরি করুন"
    },
    "confirm_new_password": {
        en: "Confirm new password",
        hi: "नया पासवर्ड पुष्टि करें",
        te: "కొత్త పాస్‌వర్డ్ నిర్ధారించండి",
        ta: "புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்",
        kn: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ",
        mr: "नवीन पासवर्ड पुष्टी करा",
        bn: "নতুন পাসওয়ার্ড নিশ্চিত করুন"
    },
    "enter_your_email": {
        en: "Enter your email",
        hi: "अपना ईमेल दर्ज करें",
        te: "మీ ఇమెయిల్ నమోదు చేయండి",
        ta: "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
        kn: "ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ",
        mr: "तुमचा ईमेल प्रविष्ट करा",
        bn: "আপনার ইমেইল লিখুন"
    },

    // ========================
    // AddPost Page
    // ========================
    "iphone_for_sale_example": {
        en: "e.g., iPhone 14 Pro for Sale",
        hi: "उदा., बिक्री के लिए आईफोन 14 प्रो",
        te: "ఉదా., అమ్మకానికి ఐఫోన్ 14 ప్రో",
        ta: "எ.கா., விற்பனைக்கு ஐஃபோன் 14 ப்ரோ",
        kn: "ಉದಾ., ಮಾರಾಟಕ್ಕೆ ಐಫೋನ್ 14 ಪ್ರೊ",
        mr: "उदा., विक्रीसाठी आयफोन 14 प्रो",
        bn: "যেমন, বিক্রির জন্য আইফোন 14 প্রো"
    },
    "select_category_placeholder": {
        en: "Select category",
        hi: "श्रेणी चुनें",
        te: "వర్గాన్ని ఎంచుకోండి",
        ta: "வகையைத் தேர்ந்தெடுக்கவும்",
        kn: "ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        mr: "श्रेणी निवडा",
        bn: "বিভাগ নির্বাচন করুন"
    },
    "brand_model_example": {
        en: "e.g., iPhone 14 Pro, Galaxy S23",
        hi: "उदा., आईफोन 14 प्रो, गैलेक्सी S23",
        te: "ఉదా., ఐఫోన్ 14 ప్రో, గెలాక్సీ S23",
        ta: "எ.கா., ஐஃபோன் 14 ப்ரோ, கேலக்ஸி S23",
        kn: "ಉದಾ., ಐಫೋನ್ 14 ಪ್ರೊ, ಗ್ಯಾಲಕ್ಸಿ S23",
        mr: "उदा., आयफोन 14 प्रो, गॅलेक्सी S23",
        bn: "যেমন, আইফোন 14 প্রো, গ্যালাক্সি S23"
    },
    "warranty_status_placeholder": {
        en: "Warranty status",
        hi: "वारंटी स्थिति",
        te: "వారంటీ స్థితి",
        ta: "உத்தரவாத நிலை",
        kn: "ವಾರಂಟಿ ಸ್ಥಿತಿ",
        mr: "वॉरंटी स्थिती",
        bn: "ওয়ারেন্টি স্থিতি"
    },
    "screen_size_example": {
        en: "e.g., 6.1 inch",
        hi: "उदा., 6.1 इंच",
        te: "ఉదా., 6.1 అంగుళాలు",
        ta: "எ.கா., 6.1 அங்குலம்",
        kn: "ಉದಾ., 6.1 ಇಂಚು",
        mr: "उदा., 6.1 इंच",
        bn: "যেমন, 6.1 ইঞ্চি"
    },
    "enter_price_placeholder": {
        en: "Enter price",
        hi: "मूल्य दर्ज करें",
        te: "ధర నమోదు చేయండి",
        ta: "விலையை உள்ளிடவும்",
        kn: "ಬೆಲೆ ನಮೂದಿಸಿ",
        mr: "किंमत प्रविष्ट करा",
        bn: "মূল্য লিখুন"
    },
    "enter_district_placeholder": {
        en: "Enter district",
        hi: "जिला दर्ज करें",
        te: "జిల్లా నమోదు చేయండి",
        ta: "மாவட்டத்தை உள்ளிடவும்",
        kn: "ಜಿಲ್ಲೆ ನಮೂದಿಸಿ",
        mr: "जिल्हा प्रविष्ट करा",
        bn: "জেলা লিখুন"
    },
    "enter_state_placeholder": {
        en: "Enter state",
        hi: "राज्य दर्ज करें",
        te: "రాష్ట్రం నమోదు చేయండి",
        ta: "மாநிலத்தை உள்ளிடவும்",
        kn: "ರಾಜ್ಯ ನಮೂದಿಸಿ",
        mr: "राज्य प्रविष्ट करा",
        bn: "রাজ্য লিখুন"
    },
    "additional_details_mobile": {
        en: "Add any additional details about your mobile phone...",
        hi: "अपने मोबाइल फोन के बारे में कोई अतिरिक्त विवरण जोड़ें...",
        te: "మీ మొబైల్ ఫోన్ గురించి ఏదైనా అదనపు వివరాలు జోడించండి...",
        ta: "உங்கள் மொபைல் போனைப் பற்றிய கூடுதல் விவரங்களைச் சேர்க்கவும்...",
        kn: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಫೋನ್ ಬಗ್ಗೆ ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ...",
        mr: "तुमच्या मोबाईल फोनबद्दल कोणताही अतिरिक्त तपशील जोडा...",
        bn: "আপনার মোবাইল ফোন সম্পর্কে যেকোনো অতিরিক্ত বিবরণ যোগ করুন..."
    },

    // ========================
    // Common UI Labels
    // ========================
    "loading": {
        en: "Loading...",
        hi: "लोड हो रहा है...",
        te: "లోడ్ అవుతోంది...",
        ta: "ஏற்றுகிறது...",
        kn: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
        mr: "लोड होत आहे...",
        bn: "লোড হচ্ছে..."
    },
    "submitting": {
        en: "Submitting...",
        hi: "सबमिट हो रहा है...",
        te: "సమర్పిస్తోంది...",
        ta: "சமர்ப்பிக்கிறது...",
        kn: "ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...",
        mr: "सबमिट होत आहे...",
        bn: "জমা দেওয়া হচ্ছে..."
    },
    "processing": {
        en: "Processing...",
        hi: "प्रोसेस हो रहा है...",
        te: "ప్రాసెస్ అవుతోంది...",
        ta: "செயலாக்குகிறது...",
        kn: "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ...",
        mr: "प्रक्रिया होत आहे...",
        bn: "প্রক্রিয়াকরণ হচ্ছে..."
    },
    "saving": {
        en: "Saving...",
        hi: "सेव हो रहा है...",
        te: "సేవ్ అవుతోంది...",
        ta: "சேமிக்கிறது...",
        kn: "ಉಳಿಸಲಾಗುತ್ತಿದೆ...",
        mr: "जतन होत आहे...",
        bn: "সংরক্ষণ হচ্ছে..."
    },
    "deleting": {
        en: "Deleting...",
        hi: "हटाया जा रहा है...",
        te: "తొలగిస్తోంది...",
        ta: "நீக்குகிறது...",
        kn: "ಅಳಿಸಲಾಗುತ್ತಿದೆ...",
        mr: "हटवत आहे...",
        bn: "মুছে ফেলা হচ্ছে..."
    },
    "no_results_found": {
        en: "No results found",
        hi: "कोई परिणाम नहीं मिला",
        te: "ఫలితాలు కనుగొనబడలేదు",
        ta: "முடிவுகள் கிடைக்கவில்லை",
        kn: "ಯಾವುದೇ ಫಲಿತಾಂಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
        mr: "कोणतेही परिणाम आढळले नाही",
        bn: "কোনো ফলাফল পাওয়া যায়নি"
    },
    "try_again": {
        en: "Try again",
        hi: "पुनः प्रयास करें",
        te: "మళ్లీ ప్రయత్నించండి",
        ta: "மீண்டும் முயற்சிக்கவும்",
        kn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
        mr: "पुन्हा प्रयत्न करा",
        bn: "আবার চেষ্টা করুন"
    },
    "view_more": {
        en: "View more",
        hi: "और देखें",
        te: "మరింత చూడండి",
        ta: "மேலும் காண்க",
        kn: "ಇನ್ನಷ್ಟು ನೋಡಿ",
        mr: "अधिक पहा",
        bn: "আরও দেখুন"
    },
    "view_less": {
        en: "View less",
        hi: "कम देखें",
        te: "తక్కువ చూడండి",
        ta: "குறைவாகக் காண்க",
        kn: "ಕಡಿಮೆ ನೋಡಿ",
        mr: "कमी पहा",
        bn: "কম দেখুন"
    },
    "optional": {
        en: "Optional",
        hi: "वैकल्पिक",
        te: "ఐచ్ఛికం",
        ta: "விருப்பமானது",
        kn: "ಐಚ್ಛಿಕ",
        mr: "पर्यायी",
        bn: "ঐচ্ছিক"
    },
    "required": {
        en: "Required",
        hi: "आवश्यक",
        te: "అవసరం",
        ta: "தேவையானது",
        kn: "ಅಗತ್ಯವಿದೆ",
        mr: "आवश्यक",
        bn: "প্রয়োজনীয়"
    }
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

    console.log(`${lang.toUpperCase()}: ${updated} keys added (total: ${Object.keys(sorted).length})`);
});

console.log('\n✅ ALL PAGES comprehensive translations applied!');
console.log('Total new keys: ' + Object.keys(translations).length);
