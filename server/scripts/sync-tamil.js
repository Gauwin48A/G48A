const fs = require('fs');

const enPath = 'client/src/locales/en.json';
const taPath = 'client/src/locales/ta.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

// Translation map for common missing keys
const translations = {
    "select_category": "வகையைத் தேர்ந்தெடுக்கவும்",
    "price_range": "விலை வரம்பு",
    "date_range": "தேதி வரம்பு",
    "last_7_days": "கடந்த 7 நாட்கள்",
    "last_30_days": "கடந்த 30 நாட்கள்",
    "last_90_days": "கடந்த 90 நாட்கள்",
    "any_time": "எந்த நேரமும்",
    "just_for_you": "உங்களுக்காக மட்டுமே",
    "recommendations": "பரிந்துரைகள்",
    "recommended_posts": "பரிந்துரைக்கப்பட்ட பதிவுகள்",
    "based_on_preferences": "உங்கள் விருப்பங்களின் அடிப்படையில்",
    "under_100": "₹100க்கு கீழ்",
    "price_100_500": "₹100 - ₹500",
    "price_500_1000": "₹500 - ₹1000",
    "above_1000": "₹1000க்கு மேல்",
    "default": "இயல்புநிலை",
    "price_low_high": "விலை: குறைவு முதல் அதிகம்",
    "price_high_low": "விலை: அதிகம் முதல் குறைவு",
    "newest_first": "புதியது முதலில்",
    "oldest_first": "பழையது முதலில்",
    "filter_products": "பொருட்களை வடிகட்டு",
    "enter_location": "இடத்தை உள்ளிடவும்",
    "enter_full_name": "முழு பெயரை உள்ளிடவும்",
    "name_placeholder": "பெயர்",
    "enter_email": "மின்னஞ்சலை உள்ளிடவும்",
    "email_placeholder": "name@example.com",
    "password_placeholder": "கடவுச்சொல்லை உருவாக்கவும்",
    "confirm_password_placeholder": "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    "enter_phone": "தொலைபேசி எண்ணை உள்ளிடவும்",
    "phone_placeholder": "+91 XXXXXXXXXX",
    "enter_address": "முழு முகவரியை உள்ளிடவும்",
    "enter_city": "நகரம்",
    "enter_state": "மாநிலம்",
    "enter_pincode": "அஞ்சல் குறியீடு",
    "enter_aadhaar": "XXXX XXXX XXXX",
    "enter_pan": "ABCDE1234F",
    "aadhaar_placeholder": "ஆதார் எண்",
    "pan_placeholder": "பான் எண்",
    "laptops": "லேப்டாப்கள்",
    "tablets": "டேப்லெட்கள்",
    "smart_watches": "ஸ்மார்ட் வாட்ச்கள்",
    "headphones": "ஹெட்ஃபோன்கள்",
    "cameras": "கேமராக்கள்",
    "gaming": "கேமிங்",
    "home_appliances": "வீட்டு உபகரணங்கள்",
    "kitchen": "சமையலறை",
    "accessories": "துணைப்பொருட்கள்",
    "bikes": "பைக்குகள்",
    "cars": "கார்கள்",
    "properties": "சொத்துக்கள்",
    "password_strength": "கடவுச்சொல் வலிமை",
    "offers_title": "என் சலுகைகள்",
    "offers_subtitle": "உங்கள் சலுகைகள் மற்றும் பேச்சுவார்த்தைகளை நிர்வகிக்கவும்",
    "no_offers": "இன்னும் சலுகைகள் இல்லை",
    "make_offer": "சலுகை செய்யுங்கள்",
    "offer_price": "சலுகை விலை",
    "accept_offer": "ஏற்கவும்",
    "reject_offer": "நிராகரி",
    "counter_offer": "எதிர் சலுகை",
    "offer_status": "சலுகை நிலை",
    "offer_pending": "நிலுவையில்",
    "offer_accepted": "ஏற்றுக்கொள்ளப்பட்டது",
    "offer_rejected": "நிராகரிக்கப்பட்டது"
};

// Add missing keys
let count = 0;
Object.keys(en).forEach(key => {
    if (!ta[key]) {
        ta[key] = translations[key] || en[key]; // Use translation if available, else English as placeholder
        count++;
        if (!translations[key]) {
            console.log(`Added placeholder: ${key}`);
        }
    }
});

// Sort keys and save
const sorted = {};
Object.keys(ta).sort().forEach(k => sorted[k] = ta[k]);
fs.writeFileSync(taPath, JSON.stringify(sorted, null, 2));
console.log(`\nSynced ${count} keys. Total keys in ta.json: ${Object.keys(sorted).length}`);
