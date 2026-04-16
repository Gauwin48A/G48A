import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";

/**
 * Modal shown when cart items have price changes since being added.
 * @param {{ items: Array<{title, oldPrice, newPrice}>, onAccept: () => void, onRemove: () => void, onClose: () => void }} props
 */
export default function PriceChangeModal({ items, onAccept, onRemove, onClose }) {
  const { t } = useTranslation();

  if (!items || items.length === 0) return null;

  const formatCurrency = (value) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("price_changed") || "Prices have changed"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={t("close") || "Close"}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-3 max-h-60 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[50%]">{item.title}</span>
              <div className="text-right">
                <span className="text-xs text-slate-400 line-through mr-2">{formatCurrency(item.oldPrice)}</span>
                <span className={`text-sm font-semibold ${Number(item.newPrice) > Number(item.oldPrice) ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(item.newPrice)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onRemove} className="flex-1 gap-1.5">
            <X className="w-4 h-4" />
            {t("remove_changed") || "Remove changed"}
          </Button>
          <Button onClick={onAccept} className="flex-1 gap-1.5">
            <Check className="w-4 h-4" />
            {t("accept_prices") || "Accept new prices"}
          </Button>
        </div>
      </div>
    </div>
  );
}
