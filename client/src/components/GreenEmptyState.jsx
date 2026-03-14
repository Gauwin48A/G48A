import React from 'react';
import { useTranslation } from "react-i18next";

const GreenEmptyState = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <img src="/empty-state.svg" alt={t("no_data_alt")} className="h-32 w-32 mb-4" onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }} />
      <p className="text-lg text-text mb-2">{message || t("no_items_found")}</p>
      <button className="px-6 py-2 bg-primary text-white rounded-lg shadow-elevation-1 hover:bg-primary-dark">{t("go_home")}</button>
    </div>
  );
};

export default GreenEmptyState;
