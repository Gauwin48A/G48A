const fs = require('fs');
const path = require('path');

const localesDir = 'client/src/locales';
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const translations = {
    en: {
        share_update: "Share Update",
        share_something: "Share something with the community...",
        create_post: "Create Post",
        no_posts: "No posts yet. Be the first to share!",
        news_updates: "News & Updates",
        share_knowledge: "Share knowledge, news, and updates with the community",
        my_feed: "My Feed"
    },
    hi: {
        share_update: "अपडेट साझा करें",
        share_something: "समुदाय के साथ कुछ साझा करें...",
        create_post: "पोस्ट बनाएं",
        no_posts: "अभी तक कोई पोस्ट नहीं। सबसे पहले साझा करें!",
        news_updates: "समाचार और अपडेट",
        share_knowledge: "समुदाय के साथ ज्ञान, समाचार और अपडेट साझा करें",
        my_feed: "मेरी फ़ीड"
    },
    te: {
        share_update: "అప్‌డేట్ షేర్ చేయండి",
        share_something: "కమ్యూనిటీతో ఏదైనా పంచుకోండి...",
        create_post: "పోస్ట్ సృష్టించండి",
        no_posts: "ఇంకా పోస్ట్‌లు లేవు. మొదట షేర్ చేయండి!",
        news_updates: "వార్తలు & అప్‌డేట్స్",
        share_knowledge: "జ్ఞానం, వార్తలు మరియు అప్‌డేట్‌లను పంచుకోండి",
        my_feed: "నా ఫీడ్"
    },
    ta: {
        share_update: "புதுப்பிப்பைப் பகிரவும்",
        share_something: "சமூகத்துடன் எதையாவது பகிரவும்...",
        create_post: "இடுகையை உருவாக்கவும்",
        no_posts: "இடுகைகள் இல்லை. முதலில் பகிரவும்!",
        news_updates: "செய்திகள் & புதுப்பிப்புகள்",
        share_knowledge: "அறிவு, செய்திகள் மற்றும் புதுப்பிப்புகளைப் பகிரவும்",
        my_feed: "எனது ஊட்டம்"
    },
    kn: {
        share_update: "ನವೀಕರಣವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
        share_something: "ಸಮುದಾಯದೊಂದಿಗೆ ಏನನ್ನಾದರೂ ಹಂಚಿಕೊಳ್ಳಿ...",
        create_post: "ಪೋಸ್ಟ್ ರಚಿಸಿ",
        no_posts: "ಇನ್ನೂ ಯಾವುದೇ ಪೋಸ್ಟ್‌ಗಳಿಲ್ಲ. ಮೊದಲು ಹಂಚಿಕೊಳ್ಳಿ!",
        news_updates: "ಸುದ್ದಿ ಮತ್ತು ನವೀಕರಣಗಳು",
        share_knowledge: "ಜ್ಞಾನ, ಸುದ್ದಿ ಮತ್ತು ನವೀಕರಣಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
        my_feed: "ನನ್ನ ಫೀಡ್"
    },
    mr: {
        share_update: "अपडेट शेअर करा",
        share_something: "समुदायासोबत काहीतरी शेअर करा...",
        create_post: "पोस्ट तयार करा",
        no_posts: "अद्याप कोणतीही पोस्ट नाही. सर्वात आधी शेअर करा!",
        news_updates: "बातम्या आणि अपडेट्स",
        share_knowledge: "ज्ञान, बातम्या आणि अपडेट्स शेअर करा",
        my_feed: "माझे फीड"
    },
    bn: {
        share_update: "আপডেট শেয়ার করুন",
        share_something: "কমিউনিটির সাথে কিছু শেয়ার করুন...",
        create_post: "পোস্ট তৈরি করুন",
        no_posts: "এখনও কোন পোস্ট নেই। সবার আগে শেয়ার করুন!",
        news_updates: "খবর এবং আপডেট",
        share_knowledge: "জ্ঞান, খবর এবং আপডেট শেয়ার করুন",
        my_feed: "আমার ফিড"
    }
};

languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    let content = {};
    try {
        if (fs.existsSync(filePath)) {
            content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // Update keys
        let updated = 0;
        const langTrans = translations[lang];
        Object.keys(langTrans).forEach(key => {
            // Force update if missing or if value equals key (placeholder) or starts with '+'
            if (!content[key] || content[key] === key || content[key].startsWith('+')) {
                content[key] = langTrans[key];
                updated++;
            }
        });

        if (updated > 0) {
            // Sort keys
            const sorted = {};
            Object.keys(content).sort().forEach(k => sorted[k] = content[k]);

            fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2));
            console.log(`Updated ${lang}.json: ${updated} keys`);
        } else {
            console.log(`${lang}.json is up to date.`);
        }

    } catch (err) {
        console.error(`Error updating ${lang}.json:`, err);
    }
});
