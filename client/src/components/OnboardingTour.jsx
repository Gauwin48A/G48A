import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Search,
  Bookmark,
  ShoppingBag,
  MessageCircle,
  ArrowRight,
  X,
} from "lucide-react";

const STORAGE_KEY = "mhub_onboarding_complete";

const STEPS = [
  {
    icon: MapPin,
    titleKey: "onboarding_location",
    titleFallback: "Set Your Location",
    descKey: "onboarding_location_desc",
    descFallback: "Enable location to discover items near you. We use GPS to show the most relevant listings.",
  },
  {
    icon: Search,
    titleKey: "onboarding_search",
    titleFallback: "Search & Discover",
    descKey: "onboarding_search_desc",
    descFallback: "Browse categories, search by keyword, or explore nearby listings. Find exactly what you need.",
  },
  {
    icon: Bookmark,
    titleKey: "onboarding_wishlist",
    titleFallback: "Save Favorites",
    descKey: "onboarding_wishlist_desc",
    descFallback: "Tap the save icon on any listing to add it to your wishlist for later.",
  },
  {
    icon: ShoppingBag,
    titleKey: "onboarding_sell",
    titleFallback: "Start Selling",
    descKey: "onboarding_sell_desc",
    descFallback: "List your items in seconds. Add photos, set a price, and reach buyers in your area.",
  },
  {
    icon: MessageCircle,
    titleKey: "onboarding_chat",
    titleFallback: "Chat & Negotiate",
    descKey: "onboarding_chat_desc",
    descFallback: "Message sellers directly, make offers, and close deals — all within the app.",
  },
];

export default function OnboardingTour({ onComplete }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") {
      setVisible(false);
    }
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }, [step, finish]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={skip}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          aria-label={t("skip") || "Skip"}
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Illustration */}
        <div className="flex items-center justify-center pt-10 pb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Icon className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t(current.titleKey) || current.titleFallback}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(current.descKey) || current.descFallback}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? "bg-blue-500 w-6"
                  : i < step
                    ? "bg-blue-300"
                    : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            type="button"
            onClick={skip}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {t("skip") || "Skip"}
          </button>
          <Button onClick={next} className="gap-1.5">
            {step < STEPS.length - 1
              ? t("next") || "Next"
              : t("get_started") || "Get Started"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useShowOnboarding() {
  return localStorage.getItem(STORAGE_KEY) !== "true";
}
