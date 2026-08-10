const fs = require('fs');
const base = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/res';

const translations = {
  settings_show_less: {
    hi: 'कम दिखाएं', te: 'తక్కువ చూపించు', ta: 'குறைவாக காட்டு',
    kn: 'ಕಡಿಮೆ ತೋರಿಸಿ', mr: 'कमी दाखवा', bn: 'কম দেখাও',
    gu: 'ઓછું બતાવો', ml: 'കുറച്ച് കാണിക്കുക', pa: 'ਘੱਟ ਦਿਖਾਓ',
    ur: 'کم دکھائیں', ar: 'عرض أقل', fr: 'Afficher moins', es: 'Mostrar menos',
  },
  settings_show_all_languages: {
    hi: 'सभी 25 भाषाएं दिखाएं →', te: 'అన్ని 25 భాషలు చూపించు →', ta: 'அனைத்து 25 மொழிகளையும் காட்டு →',
    kn: 'ಎಲ್ಲಾ 25 ಭಾಷೆಗಳನ್ನು ತೋರಿಸಿ →', mr: 'सर्व 25 भाषा दाखवा →', bn: 'সব ২৫টি ভাষা দেখাও →',
    gu: 'બધી 25 ભાષાઓ બતાવો →', ml: 'എല്ലാ 25 ഭാഷകളും കാണിക്കുക →', pa: 'ਸਾਰੀਆਂ 25 ਭਾਸ਼ਾਵਾਂ ਦਿਖਾਓ →',
    ur: 'تمام 25 زبانیں دکھائیں →', ar: 'عرض جميع 25 لغة →', fr: 'Afficher les 25 langues →', es: 'Mostrar los 25 idiomas →',
  },
  commerce_sale_verification_label: {
    hi: 'बिक्री सत्यापन', te: 'అమ్మకం ధృవీకరణ', ta: 'விற்பனை சரிபார்ப்பு',
    kn: 'ಮಾರಾಟ ಪರಿಶೀಲನೆ', mr: 'विक्री सत्यापन', bn: 'বিক্রয় যাচাই',
    gu: 'વેચાણ ચકાસણી', ml: 'വിൽപ്പന സ്ഥിരീകരണം', pa: 'ਵਿਕਰੀ ਤਸਦੀਕ',
    ur: 'فروخت کی تصدیق', ar: 'التحقق من البيع', fr: 'Vérification de vente', es: 'Verificación de venta',
  },
  commerce_sale_confirmation_title: {
    hi: 'बिक्री की पुष्टि', te: 'అమ్మకం నిర్ధారణ', ta: 'விற்பனை உறுதிப்படுத்தல்',
    kn: 'ಮಾರಾಟ ದೃಢೀಕರಣ', mr: 'विक्री पुष्टी', bn: 'বিক্রয় নিশ্চিতকরণ',
    gu: 'વેચાણ પુષ્ટિ', ml: 'വിൽപ്പന സ്ഥിരീകരണം', pa: 'ਵਿਕਰੀ ਪੁਸ਼ਟੀ',
    ur: 'فروخت کی تصدیق', ar: 'تأكيد البيع', fr: 'Confirmation de vente', es: 'Confirmación de venta',
  },
  commerce_sale_confirmation_subtitle: {
    hi: 'खरीदार OTP और लेनदेन ID के साथ बिक्री की पुष्टि करें।',
    te: 'కొనుగోలుదారు OTP మరియు లావాదేవీ ID తో అమ్మకాన్ని నిర్ధారించండి.',
    ta: 'வாங்குபவர் OTP மற்றும் பரிவர்த்தனை ID உடன் விற்பனையை உறுதிப்படுத்தவும்.',
    kn: 'ಖರೀದಿದಾರ OTP ಮತ್ತು ವ್ಯವಹಾರ ID ಯೊಂದಿಗೆ ಮಾರಾಟವನ್ನು ದೃಢೀಕರಿಸಿ.',
    mr: 'खरेदीदार OTP आणि व्यवहार ID सह विक्री पुष्टी करा.',
    bn: 'ক্রেতার OTP এবং লেনদেন ID দিয়ে বিক্রয় নিশ্চিত করুন।',
    gu: 'ખરીદનારની OTP અને ટ્રાન્ઝેક્શન ID સાથે વેચાણ કન્ફર્મ કરો.',
    ml: 'വാങ്ങുന്നയാളുടെ OTP, ഇടപാട് ID ഉപയോഗിച്ച് വിൽപ്പന സ്ഥിരീകരിക്കുക.',
    pa: 'ਖਰੀਦਦਾਰ OTP ਅਤੇ ਟ੍ਰਾਂਜ਼ੈਕਸ਼ਨ ID ਨਾਲ ਵਿਕਰੀ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।',
    ur: 'خریدار OTP اور ٹرانزیکشن ID کے ساتھ فروخت کی تصدیق کریں۔',
    ar: 'قم بتأكيد البيع باستخدام OTP الخاص بالمشتري ومعرف المعاملة.',
    fr: "Confirmez une vente avec l'OTP de l'acheteur et l'ID de transaction.",
    es: 'Confirme una venta con el OTP del comprador e ID de transacción.',
  },
  commerce_badge_secure: {
    hi: '\uD83D\uDD12 सुरक्षित', te: '\uD83D\uDD12 సురక్షితం', ta: '\uD83D\uDD12 பாதுகாப்பானது',
    kn: '\uD83D\uDD12 ಸುರಕ್ಷಿತ', mr: '\uD83D\uDD12 सुरक्षित', bn: '\uD83D\uDD12 নিরাপদ',
    gu: '\uD83D\uDD12 સુરક્ષિત', ml: '\uD83D\uDD12 സുരക്ഷിതം', pa: '\uD83D\uDD12 ਸੁਰੱਖਿਅਤ',
    ur: '\uD83D\uDD12 محفوظ', ar: '\uD83D\uDD12 آمن', fr: '\uD83D\uDD12 Sécurisé', es: '\uD83D\uDD12 Seguro',
  },
  commerce_badge_rewarded: {
    hi: '✓ पुरस्कृत', te: '✓ పురస్కారం', ta: '✓ வெகுமதி',
    kn: '✓ ಪ್ರತಿಫಲಿತ', mr: '✓ पुरस्कृत', bn: '✓ পুরস্কৃত',
    gu: '✓ પુરસ્કૃત', ml: '✓ പ്രതിഫലം', pa: '✓ ਇਨਾਮੀ',
    ur: '✓ انعام یافتہ', ar: '✓ مكافأ', fr: '✓ Récompensé', es: '✓ Recompensado',
  },
  commerce_badge_verified: {
    hi: '\uD83D\uDCCB सत्यापित', te: '\uD83D\uDCCB ధృవీకరించబడింది', ta: '\uD83D\uDCCB சரிபார்க்கப்பட்டது',
    kn: '\uD83D\uDCCB ಪರಿಶೀಲಿಸಲಾಗಿದೆ', mr: '\uD83D\uDCCB सत्यापित', bn: '\uD83D\uDCCB যাচাইকৃত',
    gu: '\uD83D\uDCCB ચકાસાયેલ', ml: '\uD83D\uDCCB സ്ഥിരീകരിച്ചു', pa: '\uD83D\uDCCB ਤਸਦੀਕ ਕੀਤਾ',
    ur: '\uD83D\uDCCB تصدیق شدہ', ar: '\uD83D\uDCCB موثق', fr: '\uD83D\uDCCB Vérifié', es: '\uD83D\uDCCB Verificado',
  },
};

const langCode = {
  'values-hi': 'hi', 'values-te': 'te', 'values-ta': 'ta', 'values-kn': 'kn',
  'values-mr': 'mr', 'values-bn': 'bn', 'values-gu': 'gu', 'values-ml': 'ml',
  'values-pa': 'pa', 'values-ur': 'ur', 'values-ar': 'ar', 'values-fr': 'fr', 'values-es': 'es',
};

const langs = Object.keys(langCode);
for (const lang of langs) {
  const code = langCode[lang];
  const p = base + '/' + lang + '/strings.xml';
  if (!fs.existsSync(p)) { console.log(lang + ': FILE NOT FOUND'); continue; }
  let content = fs.readFileSync(p, 'utf8');
  const keysToAdd = Object.keys(translations).filter(k => !content.includes('name="' + k + '"'));
  if (keysToAdd.length === 0) { console.log(lang + ': already up to date'); continue; }
  const newLines = keysToAdd.map(k => '    <string name="' + k + '">' + translations[k][code] + '</string>').join('\n');
  content = content.replace('</resources>', newLines + '\n</resources>');
  fs.writeFileSync(p, content, 'utf8');
  console.log('Updated ' + lang + ' with ' + keysToAdd.length + ' keys: ' + keysToAdd.join(', '));
}
console.log('All done.');
