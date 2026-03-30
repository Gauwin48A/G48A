const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    // Footer
    "browse_phones": "Browse Phones",
    "sell_your_phone": "Sell Your Phone",
    "get_verified_link": "Get Verified",
    "rewards_link": "Rewards",
    "copyright_mobileverify": "© 2025 MobileVerify. All rights reserved.",
    "copyright_mobilemart": "© 2024 MobileMart. All rights reserved.",
    "copyright_greenkart": "© 2025 GreenKart. All rights reserved.",

    // Green Components (Alternative Layouts)
    "under_500": "Under ₹500",
    "500_to_2k": "₹500-₹2K",
    "2k_to_10k": "₹2K-₹10K",
    "above_10k": "Above ₹10K",
    "any_time": "Any Time",
    "last_24_hours": "Last 24 Hours",
    "last_7_days": "Last 7 Days",
    "last_10_days": "Last 10 Days",
    "last_30_days": "Last 30 Days",
    "custom_range": "Custom Range...",
    "custom_date_range": "Custom Date Range",
    "main_navigation": "Main Navigation",
    "bottom_navigation": "Bottom navigation",
    "min_price_placeholder": "Min ₹",
    "max_price_placeholder": "Max ₹",
    "trusted_ecommerce": "Your trusted e-commerce platform for great deals.",
    "quick_links": "Quick Links",
    "follow_us": "Follow Us",
    "twitter": "Twitter",
    "facebook": "Facebook",
    "instagram": "Instagram",
    "banner_alt": "Banner",

    // Header
    "shop": "Shop",
    "search_products_brands": "Search for products, brands and more",
    "logo_alt": "Logo",

    // UI Components
    "more_pages": "More pages",
    "go_to_previous_page": "Go to previous page",
    "go_to_next_page": "Go to next page",
    "pagination_label": "pagination",
    "close_dialog": "Close",
    "breadcrumb_label": "breadcrumb",
    "previous_slide": "Previous slide",
    "next_slide": "Next slide",

    // Hero Section
    "great_deals_electronics": "Great Deals on Electronics",
    "up_to_40_off": "Up to 40% off",
    "electronics_alt": "Electronics",

    // Aadhaar/OTP (Found in audit)
    "aadhaar_number_label": "Aadhaar Number",
    "enter_12_digit_aadhaar": "Enter 12-digit Aadhaar",
    "enter_6_digit_otp": "Enter 6-digit OTP",
    "aadhaar_verified_success": "Aadhaar verified successfully!",
    "xml_files_only": "XML files only, up to 5MB",
    "ready_to_upload": "Ready to upload",
    "security_privacy_notice": "Security & Privacy Notice",
    "aadhaar_privacy_1": "Your Aadhaar XML file is processed locally and securely",
    "aadhaar_privacy_2": "Only necessary identity information is extracted",
    "aadhaar_privacy_3": "The file is not stored after processing",
    "aadhaar_privacy_4": "Aadhaar number is never stored or displayed",
    "aadhaar_privacy_5": "Verification builds user trust",

    // Common/Misc
    "no_images_available": "No images available",
    "no_deals_available": "No deals available",
    "no_categories_available": "No categories available",
    "popular_categories": "Popular Categories"
};

const translations = {
    hi: {
        "browse_phones": "फ़ोन ब्राउज़ करें",
        "sell_your_phone": "अपना फ़ोन बेचें",
        "get_verified_link": "सत्यापित हों",
        "rewards_link": "इनाम",
        "copyright_mobileverify": "© 2025 MobileVerify. सर्वाधिकार सुरक्षित।",
        "copyright_mobilemart": "© 2024 MobileMart. सर्वाधिकार सुरक्षित।",
        "copyright_greenkart": "© 2025 GreenKart. सर्वाधिकार सुरक्षित।",
        "under_500": "₹500 से कम",
        "500_to_2k": "₹500-₹2K",
        "2k_to_10k": "₹2K-₹10K",
        "above_10k": "₹10K से ऊपर",
        "any_time": "कभी भी",
        "last_24_hours": "पिछले 24 घंटे",
        "last_7_days": "पिछले 7 दिन",
        "last_10_days": "पिछले 10 दिन",
        "last_30_days": "पिछले 30 दिन",
        "custom_range": "कस्टम रेंज...",
        "custom_date_range": "कस्टम तिथि सीमा",
        "main_navigation": "मुख्य नेविगेशन",
        "bottom_navigation": "निचला नेविगेशन",
        "min_price_placeholder": "न्यूनतम ₹",
        "max_price_placeholder": "अधिकतम ₹",
        "trusted_ecommerce": "शानदार सौदों के लिए आपका विश्वसनीय ई-कॉमर्स प्लेटफॉर्म।",
        "quick_links": "त्वरित लिंक",
        "follow_us": "हमें फॉलो करें",
        "twitter": "ट्विटर",
        "facebook": "फेसबुक",
        "instagram": "इंस्टाग्राम",
        "banner_alt": "बैनर",
        "shop": "खरीदें",
        "search_products_brands": "उत्पादों, ब्रांडों और बहुत कुछ खोजें",
        "logo_alt": "लोगो",
        "more_pages": "और पेज",
        "go_to_previous_page": "पिछले पेज पर जाएं",
        "go_to_next_page": "अगले पेज पर जाएं",
        "pagination_label": "पेजिनेशन",
        "close_dialog": "बंद करें",
        "breadcrumb_label": "ब्रेडक्रंब",
        "previous_slide": "पिछली स्लाइड",
        "next_slide": "अगली स्लाइड",
        "great_deals_electronics": "इलेक्ट्रॉनिक्स पर शानदार सौदे",
        "up_to_40_off": "40% तक की छूट",
        "electronics_alt": "इलेक्ट्रॉनिक्स",
        "aadhaar_number_label": "आधार संख्या",
        "enter_12_digit_aadhaar": "12-अंकीय आधार दर्ज करें",
        "enter_6_digit_otp": "6-अंकीय OTP दर्ज करें",
        "aadhaar_verified_success": "आधार सफलतापूर्वक सत्यापित किया गया!",
        "xml_files_only": "केवल XML फ़ाइलें, 5MB तक",
        "ready_to_upload": "अपलोड के लिए तैयार",
        "security_privacy_notice": "सुरक्षा और गोपनीयता नोटिस",
        "aadhaar_privacy_1": "आपकी आधार XML फ़ाइल स्थानीय और सुरक्षित रूप से संसाधित की जाती है",
        "aadhaar_privacy_2": "केवल आवश्यक पहचान जानकारी निकाली जाती है",
        "aadhaar_privacy_3": "प्रसंस्करण के बाद फ़ाइल संग्रहीत नहीं की जाती है",
        "aadhaar_privacy_4": "आधार संख्या कभी भी संग्रहीत या प्रदर्शित नहीं की जाती है",
        "aadhaar_privacy_5": "सत्यापन से उपयोगकर्ता का विश्वास बढ़ता है",
        "no_images_available": "कोई चित्र उपलब्ध नहीं है",
        "no_deals_available": "कोई सौदे उपलब्ध नहीं हैं",
        "no_categories_available": "कोई श्रेणियाँ उपलब्ध नहीं हैं",
        "popular_categories": "लोकप्रिय श्रेणियाँ"
    },
    te: {
        "browse_phones": "ఫోన్‌లను బ్రౌజ్ చేయండి",
        "sell_your_phone": "మీ ఫోన్‌ను అమ్మండి",
        "get_verified_link": "ధృవీకరించబడండి",
        "rewards_link": "రివార్డ్స్",
        "copyright_mobileverify": "© 2025 MobileVerify. సర్వహక్కులు నిలుపుకోబడ్డాయి.",
        "copyright_mobilemart": "© 2024 MobileMart. సర్వహక్కులు నిలుపుకోబడ్డాయి.",
        "copyright_greenkart": "© 2025 GreenKart. సర్వహక్కులు నిలుపుకోబడ్డాయి.",
        "under_500": "₹500 లోపు",
        "500_to_2k": "₹500 నుండి ₹2K",
        "2k_to_10k": "₹2K నుండి ₹10K",
        "above_10k": "₹10K పైన",
        "any_time": "ఏ సమయంలోనైనా",
        "last_24_hours": "గత 24 గంటలు",
        "last_7_days": "గత 7 రోజులు",
        "last_10_days": "గత 10 రోజులు",
        "last_30_days": "గత 30 రోజులు",
        "custom_range": "అనుకూల పరిధి...",
        "custom_date_range": "అనుకూల తేదీ పరిధి",
        "main_navigation": "ప్రధాన నావిగేషన్",
        "bottom_navigation": "దిగువ నావిగేషన్",
        "min_price_placeholder": "కనిష్ట ₹",
        "max_price_placeholder": "గరిష్ట ₹",
        "trusted_ecommerce": "గొప్ప డీల్స్ కోసం మీ విశ్వసనీయ ఈ-కామర్స్ ప్లాట్‌ఫారమ్.",
        "quick_links": "త్వరిత లింకులు",
        "follow_us": "మమ్మల్ని అనుసరించండి",
        "twitter": "ట్విట్టర్",
        "facebook": "ఫేస్‌బుక్",
        "instagram": "ఇన్‌స్టాగ్రామ్",
        "banner_alt": "బ్యానర్",
        "shop": "షాపింగ్",
        "search_products_brands": "ఉత్పత్తులు, బ్రాండ్లు మరియు మరిన్నింటి కోసం వెతకండి",
        "logo_alt": "లోగో",
        "more_pages": "మరిన్ని పేజీలు",
        "go_to_previous_page": "మునుపటి పేజీకి వెళ్లండి",
        "go_to_next_page": "తదుపరి పేజీకి వెళ్లండి",
        "pagination_label": "పేజీలు",
        "close_dialog": "మూసివేయండి",
        "breadcrumb_label": "బ్రెడ్‌క్రంబ్",
        "previous_slide": "మునుపటి స్లైడ్",
        "next_slide": "తదుపరి స్లైడ్",
        "great_deals_electronics": "ఎలక్ట్రానిక్స్‌పై గొప్ప డీల్స్",
        "up_to_40_off": "40% వరకు తగ్గింపు",
        "electronics_alt": "ఎలక్ట్రానిక్స్",
        "aadhaar_number_label": "ఆధార్ సంఖ్య",
        "enter_12_digit_aadhaar": "12 అంకెల ఆధార్‌ను నమోదు చేయండి",
        "enter_6_digit_otp": "6 అంకెల OTP ని నమోదు చేయండి",
        "aadhaar_verified_success": "ఆధార్ విజయవంతంగా ధృవీకరించబడింది!",
        "xml_files_only": "XML ఫైళ్లు మాత్రమే, 5MB వరకు",
        "ready_to_upload": "అప్‌లోడ్ చేయడానికి సిద్ధంగా ఉంది",
        "security_privacy_notice": "భద్రత & గోప్యతా నోటీసు",
        "aadhaar_privacy_1": "మీ ఆధార్ XML ఫైల్ స్థానికంగా మరియు సురక్షితంగా ప్రాసెస్ చేయబడుతుంది",
        "aadhaar_privacy_2": "అవసరమైన గుర్తింపు సమాచారం మాత్రమే సేకరించబడుతుంది",
        "aadhaar_privacy_3": "ప్రాసెసింగ్ తర్వాత ఫైల్ నిల్వ చేయబడదు",
        "aadhaar_privacy_4": "ఆధార్ సంఖ్య ఎప్పుడూ నిల్వ చేయబడదు లేదా ప్రదర్శించబడదు",
        "aadhaar_privacy_5": "ధృవీకరణ వినియోగదారు విశ్వాసాన్ని పెంచుతుంది",
        "no_images_available": "చిత్రాలు అందుబాటులో లేవు",
        "no_deals_available": "డీల్స్ అందుబాటులో లేవు",
        "no_categories_available": "వర్గాలు అందుబాటులో లేవు",
        "popular_categories": "ప్రసిద్ధ వర్గాలు"
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

        // Add keys
        Object.keys(newKeys).forEach(key => {
            if (!content[key]) {
                const translatedText = translations[lang]?.[key] || newKeys[key];
                // Basic transliteration/translation fallback logic would go here
                // For now, defaulting to English if specific lang missing (for non-hi/te)
                // But in a real scenario we'd use the google translate API or similar
                // Since I provided only hi/te, others will default to English which is better than hardcoded
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
