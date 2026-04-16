const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    // ChannelPage keys
    owner_label: {
        en: "Owner: {{name}}",
        hi: "मालिक: {{name}}",
        te: "యజమాని: {{name}}",
        ta: "உரிமையாளர்: {{name}}",
        kn: "ಮಾಲೀಕರು: {{name}}",
        mr: "मालक: {{name}}",
        bn: "মালিক: {{name}}"
    },
    followers_count: {
        en: "Followers: {{count}}",
        hi: "फ़ॉलोअर्स: {{count}}",
        te: "ఫాలోవర్స్: {{count}}",
        ta: "பின் தொடர்பவர்கள்: {{count}}",
        kn: "ಅನುಯಾಯಿಗಳು: {{count}}",
        mr: "फॉलोअर्स: {{count}}",
        bn: "অনুসরণকারী: {{count}}"
    },
    description_placeholder: {
        en: "Description",
        hi: "विवरण",
        te: "వివరణ",
        ta: "விளக்கம்",
        kn: "ವಿವರಣೆ",
        mr: "वर्णन",
        bn: "বর্ণনা"
    },
    media_url_optional: {
        en: "Media URL (optional)",
        hi: "मीडिया URL (वैकल्पिक)",
        te: "మీడియా URL (ఐచ్ఛికం)",
        ta: "ஊடக URL (விருப்பத்தேர்வு)",
        kn: "ಮಾಧ್ಯಮ URL (ಐಚ್ಛಿಕ)",
        mr: "मीडिया URL (वैकल्पिक)",
        bn: "মিডিয়া URL (ঐচ্ছিক)"
    },
    text_type: {
        en: "Text",
        hi: "टेक्स्ट",
        te: "టెక్స్ట్",
        ta: "உரை",
        kn: "ಪಠ್ಯ",
        mr: "मजकूर",
        bn: "পাঠ্য"
    },
    image_type: {
        en: "Image",
        hi: "छवि",
        te: "చిత్రం",
        ta: "படம்",
        kn: "ಚಿತ್ರ",
        mr: "प्रतिमा",
        bn: "ছবি"
    },
    video_type: {
        en: "Video",
        hi: "वीडियो",
        te: "వీడియో",
        ta: "காணொளி",
        kn: "ವೀಡಿಯೊ",
        mr: "व्हिडिओ",
        bn: "ভিডিও"
    },
    post_button: {
        en: "Post",
        hi: "पोस्ट",
        te: "పోస్ట్",
        ta: "பதிவிடு",
        kn: "ಪೋಸ್ಟ್",
        mr: "पोस्ट",
        bn: "পোস্ট"
    },
    channel_posts: {
        en: "Posts",
        hi: "पोस्ट",
        te: "పోస్ట్‌లు",
        ta: "பதிவுகள்",
        kn: "ಪೋಸ್ಟ್‌ಗಳು",
        mr: "पोस्ट्स",
        bn: "পোস্টগুলি"
    },
    loading: {
        en: "Loading...",
        hi: "लोड हो रहा है...",
        te: "లోడ్ అవుతోంది...",
        ta: "ஏற்றுகிறது...",
        kn: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
        mr: "लोड होत आहे...",
        bn: "লোড হচ্ছে..."
    }
};

languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    let translations = {};
    try {
        if (fs.existsSync(filePath)) {
            translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        Object.keys(newKeys).forEach(key => {
            if (!translations[key]) {
                translations[key] = newKeys[key][lang] || newKeys[key]['en'];
            }
        });

        fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
        console.log(`Updated ${lang}.json`);
    } catch (e) {
        console.error(`Error updating ${lang}:`, e);
    }
});
