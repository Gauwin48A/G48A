import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, X } from "lucide-react";
import api from "@/lib/api";
import { hasAuthSession } from "@/utils/authStorage";

/**
 * Contextual upsell banner — fetches the next tier upgrade message from
 * GET /api/subscriptions/upsell and displays a dismissible banner.
 *
 * Usage: <UpsellBanner trigger="post_limit" /> or <UpsellBanner />
 */
export default function UpsellBanner({ trigger, className = "" }) {
  const navigate = useNavigate();
  const [upsell, setUpsell] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!hasAuthSession()) return;
    const key = `upsell_dismissed_${trigger || "default"}`;
    const lastDismissed = sessionStorage.getItem(key);
    if (lastDismissed) {
      setDismissed(true);
      return;
    }

    const fetchUpsell = async () => {
      try {
        const res = await api.get("/subscriptions/upsell");
        const data = res?.data ?? res;
        if (data?.upsell) setUpsell(data.upsell);
      } catch {
        // Upsell is non-critical
      }
    };
    fetchUpsell();
  }, [trigger]);

  if (dismissed || !upsell) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`upsell_dismissed_${trigger || "default"}`, "1");
  };

  const dynamicPrice = upsell.dynamicPrice;
  const showDiscount = dynamicPrice?.isFlashSale;

  return (
    <div
      className={`relative bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 text-white rounded-xl p-4 ${className}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/70 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{upsell.headline}</p>
          {showDiscount && (
            <p className="text-xs text-yellow-300 mt-0.5">
              🌙 {dynamicPrice.discount} — Now ₹{dynamicPrice.price}{" "}
              <span className="line-through opacity-70">₹{dynamicPrice.originalPrice}</span>
            </p>
          )}
          {upsell.benefits && upsell.benefits.length > 0 && (
            <p className="text-xs text-white/80 mt-1 truncate">
              {upsell.benefits.slice(0, 3).join(" • ")}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/tier-selection")}
          className="flex-shrink-0 bg-white dark:bg-white text-blue-700 dark:text-blue-200 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-100 transition-colors"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
