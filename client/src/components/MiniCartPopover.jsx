import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { useFilter } from "@/context/FilterContext";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
  normalizeAppGroup,
  normalizeCategoryText,
} from "@/utils/categoryModeFilters";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";

const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(amount);
};

const MiniCartPopover = ({ className = "" }) => {
  const cart = useCart() || {};
  const items = useMemo(() => (Array.isArray(cart.items) ? cart.items : []), [cart.items]);
  const summary = cart.summary || {};
  const { activeApp, activeCategory, categories: categoryModeCategories } = useCategoryMode();
  const { filters } = useFilter();
  const location = useLocation();
  const derivedGroupFromCategory = useMemo(() => {
    if (!activeCategory) return "";
    const source = Array.isArray(categoryModeCategories) ? categoryModeCategories : [];
    const categoryId =
      activeCategory?.id ||
      activeCategory?.category_id ||
      activeCategory?.categoryId ||
      null;
    const normalizedName = normalizeCategoryText(activeCategory?.name || "");
    const match = source.find((entry) => {
      const entryId = entry?.category_id || entry?.id || null;
      if (categoryId && entryId) {
        return String(entryId) === String(categoryId);
      }
      if (!normalizedName) return false;
      const entryName = normalizeCategoryText(
        entry?.name || entry?.title || entry?.label || entry?.category_name || "",
      );
      return entryName === normalizedName;
    });
    return (
      match?.category_group ||
      match?.categoryGroup ||
      match?.group ||
      ""
    );
  }, [activeCategory, categoryModeCategories]);
  const queryGroup = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return (
      params.get("category_group") ||
      params.get("categoryGroup") ||
      params.get("group") ||
      ""
    );
  }, [location.search]);
  const scopedAppKey = normalizeAppGroup(
    activeApp || filters?.categoryGroup || queryGroup || derivedGroupFromCategory,
  );
  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(scopedAppKey, categoryModeCategories),
    [scopedAppKey, categoryModeCategories],
  );
  const scopedItems = useMemo(() => {
    if (!activeAppMatcher?.activeApp) return items;
    return items.filter((item) =>
      matchesCategoryModeItem(item, { activeAppMatcher }),
    );
  }, [items, activeAppMatcher]);
  const totalCount = scopedItems.reduce(
    (sum, entry) => sum + Number(entry?.qty ?? 1),
    0,
  );
  const displayItems = scopedItems.slice(0, 3);
  const currency =
    summary.currency ||
    scopedItems.find((item) => item?.currency)?.currency ||
    "INR";

  const currencyTotals = useMemo(() => {
    const totals = {};
    scopedItems.forEach((item) => {
      const code = item?.currency || currency;
      const qty = Number(item?.qty ?? 1);
      const lineTotal = Number(item?.price ?? 0) * qty;
      if (!Number.isFinite(lineTotal)) return;
      if (!totals[code]) totals[code] = { subtotal: 0, itemCount: 0 };
      totals[code].subtotal += lineTotal;
      totals[code].itemCount += qty;
    });
    Object.values(totals).forEach((entry) => {
      entry.subtotal = Number(Number(entry.subtotal || 0).toFixed(2));
    });
    return totals;
  }, [currency, scopedItems]);

  const mixedCurrency = Object.keys(currencyTotals).length > 1;
  const computedSubtotal = scopedItems.reduce(
    (sum, entry) => sum + Number(entry?.price ?? 0) * Number(entry?.qty ?? 1),
    0,
  );
  const subtotalValue = activeAppMatcher?.activeApp
    ? Number(computedSubtotal) || 0
    : Number(summary?.subtotal ?? summary?.total ?? computedSubtotal) || 0;

  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-3 w-80 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all duration-200 z-50 dark:border-white/10 dark:bg-slate-900/95",
        className,
      )}
      role="dialog"
      aria-label="Mini cart preview"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {summary?.title || "Cart"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-300">
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <Link
          to="/cart"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
        >
          View
        </Link>
      </div>

      {scopedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200/70 dark:border-white/10 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
            Your cart is empty.
          </p>
          <Button
            asChild
            size="sm"
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Link to="/all-posts">Browse listings</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayItems.map((item) => {
              const itemCurrency = item?.currency || currency;
              const imageUrl = resolveMediaUrl(item?.image, "/placeholder.svg");
              return (
                <Link
                  key={item.id}
                  to={`/post/${item.post_id || item.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100/70 dark:border-white/10 p-2 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                    <img
                      src={imageUrl || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      Qty {item.qty ?? 1}
                    </p>
                  </div>
                  <Badge className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {formatCurrency(item.price, itemCurrency)}
                  </Badge>
                </Link>
              );
            })}
          </div>

          {scopedItems.length > displayItems.length && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
              +{scopedItems.length - displayItems.length} more item
              {scopedItems.length - displayItems.length === 1 ? "" : "s"}
            </p>
          )}

          <div className="mt-4 border-t border-slate-200/60 dark:border-white/10 pt-3 space-y-2">
            {mixedCurrency ? (
              <div className="space-y-1">
                {Object.entries(currencyTotals).map(([code, entry]) => (
                  <div
                    key={code}
                    className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                  >
                    <span className="uppercase tracking-wide">{code}</span>
                    <span className="font-semibold">
                      {formatCurrency(entry.subtotal, code)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                <span>Subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(subtotalValue, currency)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-9 text-xs">
              <Link to="/cart">View cart</Link>
            </Button>
            <Button
              asChild
              className="h-9 text-xs bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Link to="/payment?returnTo=/cart">Checkout</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MiniCartPopover;
