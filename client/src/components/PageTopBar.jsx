import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { navigateBack } from "@/utils/navigation";

/**
 * PageTopBar — Lightweight sticky top app bar injected by PageEnhancer.
 * Provides back navigation + title for pages that lack their own header.
 *
 * @param {{ title: string, icon?: React.ComponentType, backTo?: string }} props
 */
export default function PageTopBar({ title, icon: Icon, backTo }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigateBack(navigate);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/40 dark:border-slate-700/40">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
      </button>
      {Icon && (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </span>
      )}
      <h1 className="text-base font-semibold text-slate-900 dark:text-white truncate font-display">
        {title}
      </h1>
    </header>
  );
}
