import React from "react";
import heroImg from "../assets/devices-mockup.png"; // Add your device mockup image here
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();
  return (
    <section className="bg-blue-100 py-10 px-4 flex flex-col md:flex-row items-center justify-between rounded-lg max-w-[640px] mx-auto mt-6">
      <div className="mb-6 md:mb-0">
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {t("great_deals_electronics")}
        </h1>
        <p className="text-lg text-gray-700 mb-4">{t("up_to_40_off")}</p>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition" aria-label={t("shop_now")}>
          {t("shop_now")}
        </button>
      </div>
      <img src={heroImg} alt={t("electronics_alt")} className="w-64 h-auto" onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }} />
    </section>
  );
};

export default HeroSection;
