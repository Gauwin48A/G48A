const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../client/src/locales');
const publicLocalesDir = path.join(__dirname, '../client/public/locales');
const languages = ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'];

const newKeys = {
    my_home: {
        en: "My Home",
        hi: "मेरा होम",
        te: "నా హోమ్",
        ta: "என் முகப்பு",
        kn: "ನನ್ನ ಮನೆ",
        mr: "माझे घर",
        bn: "আমার বাড়ি"
    },
    my_feed: {
        en: "My Feed",
        hi: "मेरी फीड",
        te: "నా ఫీడ్",
        ta: "என் ஊட்டம்",
        kn: "ನನ್ನ ಫೀಡ್",
        mr: "माझी फीड",
        bn: "আমার ফিড"
    },
    quick_actions: {
        en: "Quick Actions",
        hi: "त्वरित कार्य",
        te: "త్వరిత చర్యలు",
        ta: "விரைவு செயல்கள்",
        kn: "ತ್ವರಿತ ಕ್ರಮಗಳು",
        mr: "जलद क्रिया",
        bn: "দ্রুত পদক্ষেপ"
    },
    access_dashboard: {
        en: "Access your personal dashboard",
        hi: "अपने व्यक्तिगत डैशबोर्ड तक पहुंचें",
        te: "మీ వ్యక్తిగత డాష్‌బోర్డ్‌ను యాక్సెస్ చేయండి",
        ta: "உங்கள் தனிப்பட்ட டாஷ்போர்டை அணுகவும்",
        kn: "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪ್ರವೇಶಿಸಿ",
        mr: "आपल्या वैयक्तिक डॅशबोर्डवर प्रवेश करा",
        bn: "আপনার ব্যক্তিগত ড্যাশবোর্ড অ্যাক্সেস করুন"
    },
    view_feed: {
        en: "View your personalized feed",
        hi: "अपनी व्यक्तिगत फीड देखें",
        te: "మీ వ్యక్తిగతీకరించిన ఫీడ్‌ను వీక్షించండి",
        ta: "உங்கள் தனிப்பயனாக்கப்பட்ட ஊட்டத்தைக் காண்க",
        kn: "ನಿಮ್ಮ ವೈಯಕ್ತೀಕರಿಸಿದ ಫೀಡ್ ವೀಕ್ಷಿಸಿ",
        mr: "आपली वैयक्तिकृत फीड पहा",
        bn: "আপনার ব্যক্তিগত ফিড দেখুন"
    }
};

function updateLocales(baseDir) {
    if (!fs.existsSync(baseDir)) {
        console.log(`Directory not found: ${baseDir}`);
        return;
    }

    languages.forEach(lang => {
        const filePath = path.join(baseDir, `${lang}.json`);
        let translations = {};

        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                translations = JSON.parse(fileContent);
            } catch (e) {
                console.error(`Error reading ${filePath}:`, e.message);
            }
        }

        let updated = false;
        Object.keys(newKeys).forEach(key => {
            if (!translations[key]) {
                translations[key] = newKeys[key][lang];
                updated = true;
            }
        });

        if (updated) {
            // Sort keys
            const sortedTranslations = {};
            Object.keys(translations).sort().forEach(key => {
                sortedTranslations[key] = translations[key];
            });

            fs.writeFileSync(filePath, JSON.stringify(sortedTranslations, null, 2));
            console.log(`Updated ${lang}.json in ${baseDir}`);
        } else {
            console.log(`No changes needed for ${lang}.json in ${baseDir}`);
        }
    });
}

console.log('Starting translation updates...');
updateLocales(localesDir);
updateLocales(publicLocalesDir);
console.log('Translation updates complete!');
