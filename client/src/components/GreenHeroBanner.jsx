import React, { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';

const GreenHeroBanner = () => {
  const { t } = useTranslation();
  const [banner, setBanner] = useState({ headline: '', subtext: '', image: '', button: '' });
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const baseUrl = getApiOriginBase();
        const res = await fetch(`${baseUrl}/api/banner`);
        const data = await res.json();
        setBanner({
          headline: data.headline || "",
          subtext: data.subtext || "",
          image: data.image || "/electronics.png",
          button: data.button || "",
        });
      } catch {
        setBanner({
          headline: "",
          subtext: "",
          image: "/electronics.png",
          button: "",
        });
      }
    };
    fetchBanner();
  }, []);
  const headline = banner.headline || t("great_deals_electronics");
  const subtext = banner.subtext || t("up_to_40_off");
  const buttonLabel = banner.button || t("shop_now");
  return (
    <section className="w-full h-64 md:h-96 bg-gradient-to-r from-blue-100 to-blue-300 flex items-center justify-center text-text" role="banner">
      <div className="flex flex-col md:flex-row items-center gap-8 max-w-6xl w-full px-4">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{headline}</h1>
          <p className="text-lg md:text-2xl mb-6">{subtext}</p>
          <button
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            aria-label={t("shop_now")}
          >
            {buttonLabel}
          </button>
        </div>
        <img src={banner.image} alt={t("banner_alt")} className="w-56 h-40 object-contain" onError={(e) => { e.target.style.opacity = '0.3'; }} />
      </div>
    </section>
  );
};

export default GreenHeroBanner;

