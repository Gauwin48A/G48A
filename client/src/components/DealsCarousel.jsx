import React from "react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const DealsCarousel = ({ deals, onView }) => {
  const { t } = useTranslation();
  return (
  <div className="w-full flex flex-col items-center mb-10">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t("todays_deals")}</h2>
    <div className="flex gap-6 w-full max-w-6xl overflow-x-auto scrollbar-hide px-2">
      {deals.length === 0 ? (
        <div className="text-center text-blue-400">
          {t("no_deals_available_right_now")}
        </div>
      ) : (
        deals.map(post => (
          <Card key={post.id} className="rounded-2xl shadow bg-white dark:bg-slate-800 border-0 flex flex-col items-center p-4 min-w-[220px] max-w-[220px]">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded mb-3 flex items-center justify-center">
              {/* Placeholder for image */}
              <span className="text-gray-400 dark:text-gray-500">{t("image_placeholder")}</span>
            </div>
            <div className="font-semibold text-gray-800 dark:text-gray-100 text-base text-center mb-1">{post.title}</div>
            <div className="text-yellow-500 text-xs mb-1">{t("rating_stars")}</div>
            <div className="text-blue-900 dark:text-blue-300 text-lg font-bold mb-1">₹{post.price}</div>
            <button className="bg-blue-600 text-white w-full mt-2 rounded-lg py-1" onClick={() => onView(post.id)}>{t("view")}</button>
          </Card>
        ))
      )}
    </div>
  </div>
  );
};

export default DealsCarousel;

