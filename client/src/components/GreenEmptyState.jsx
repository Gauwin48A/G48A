import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const GreenEmptyState = ({ message }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <img src="/empty-state.svg" alt={t("no_data_alt")} className="h-32 w-32 mb-4" onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }} />
      <p className="text-lg text-text mb-2">{message || t("no_items_found")}</p>
      <Button type="button" onClick={() => navigate("/")} className="mhub-btn-pill">
        {t("go_home")}
      </Button>
    </div>
  );
};

export default GreenEmptyState;
