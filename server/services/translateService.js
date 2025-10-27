import axios from "axios";

const PROVIDER = process.env.TRANSLATE_PROVIDER || 'google';

export async function translateText(text, targetLang) {
  if (PROVIDER === 'none') return text;
  try {
    if (PROVIDER === 'google') {
      const res = await axios.post(
        `https://translation.googleapis.com/language/translate/v2`,
        {},
        {
          params: {
            q: text,
            target: targetLang,
            key: process.env.GOOGLE_API_KEY
          }
        }
      );
      return res.data.data.translations[0].translatedText;
    }
    // Add Azure/AWS logic here as needed
    return text;
  } catch (err) {
    console.error(`Translation failed for ${targetLang}`, err.message);
    return text;
  }
}
