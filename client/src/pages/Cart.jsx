import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { rupeesToCoins } from "@/utils/coinConversion";
import {
  Minus,
  ArrowLeft,
  Package,
  Plus,
  Clock,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Info,
  Tag,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { buildActiveAppMatcher, matchesCategoryModeItem } from "@/utils/categoryModeFilters";
import { navigateBack } from "@/utils/navigation";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import { impactLight } from "@/services/nativeHapticsService";

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(Number(value || 0));

const Cart = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleBack = () => navigateBack(navigate);
  const { density, setDensity } = usePageDensity("mhub_cart_density");
  const densityClass = density === "compact" ? "mhub-compact" : "";
  const {
    items,
    savedItems,
    summary,
    promotion,
    maxQuantity,
    error: cartError,
    hasMixedCurrency,
    updateQty,
    removeItem,
    clear,
    saveForLater,
    moveToCart,
    applyCoupon,
    isAuthenticated,
  } = useCart();
  const { activeApp, activeCategory, categories: categoryModeCategories } = useCategoryMode();

  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const displayItems = useMemo(
    () =>
      (items || []).filter((item) =>
        matchesCategoryModeItem(item, {
          activeCategory: activeCategory?.name ? activeCategory : null,
          activeAppMatcher,
        }),
      ),
    [items, activeCategory, activeAppMatcher],
  );

  const displayCount = useMemo(
    () =>
      displayItems.reduce((sum, entry) => sum + Number(entry.qty ?? 1), 0),
    [displayItems],
  );

  const displaySubtotal = useMemo(
    () =>
      displayItems.reduce(
        (sum, entry) =>
          sum + Number(entry.qty ?? 1) * Number(entry.price ?? 0),
        0,
      ),
    [displayItems],
  );

  const currencyBreakdown = useMemo(() => {
    const totals = {};
    displayItems.forEach((item) => {
      const code = item?.currency || summary?.currency || "INR";
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
  }, [displayItems, summary?.currency]);

  const mixedCurrency =
    Boolean(hasMixedCurrency) || Object.keys(currencyBreakdown).length > 1;

  const displaySummary = summary || {};
  const displaySubtotalValidated = Number(
    displaySummary.subtotal ?? displaySubtotal,
  );
  const displayTotal = Number(displaySummary.total ?? displaySubtotalValidated);
  const displayShipping = Number(displaySummary.shipping ?? 0);
  const displayTax = Number(displaySummary.tax ?? 0);
  const displayDiscount = Number(displaySummary.discount ?? 0);

  const deliveryEta = useMemo(() => {
    if (!displayItems.length) return null;
    const minDays = displayShipping === 0 ? 2 : 3;
    const maxDays = displayShipping === 0 ? 5 : 7;
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(now.getDate() + minDays);
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + maxDays);
    const format = (date) =>
      date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    return `${format(minDate)} \u2013 ${format(maxDate)}`;
  }, [displayItems.length, displayShipping]);

  const displaySavedItems = useMemo(
    () =>
      (savedItems || []).filter((item) =>
        matchesCategoryModeItem(item, {
          activeCategory: activeCategory?.name ? activeCategory : null,
          activeAppMatcher,
        }),
      ),
    [savedItems, activeCategory, activeAppMatcher],
  );

  const MAX_QTY = maxQuantity || 10;
  const currency =
    summary?.currency ||
    displayItems.find((item) => item?.currency)?.currency ||
    "INR";

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);

  const toggleSelectAll = () => {
    if (selectedIds.size === displayItems.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(displayItems.map((item) => item.id)));
  };

  const toggleSelectItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkRemove = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => removeItem(id)));
    setSelectedIds(new Set());
  };

  const handleBulkSaveForLater = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => saveForLater(id)));
    setSelectedIds(new Set());
  };

  const handleApplyCoupon = async (event) => {
    event?.preventDefault?.();
    if (!couponCode.trim()) return;
    const promo = await applyCoupon(couponCode.trim());
    if (promo?.valid) {
      setCouponStatus({
        type: "success",
        message: promo?.promo?.description || t("coupon_applied") || "Coupon applied",
      });
    } else if (promo?.reason) {
      setCouponStatus({
        type: "error",
        message: t("coupon_invalid") || "Coupon could not be applied",
      });
    }
  };

  return (
    <div
      className={`min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 mhub-page-pad-bottom dark:bg-gradient-to-br ${densityClass}`}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 profile-hero-bg" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-6 page-shell page-pad">
          <div className="mb-3 max-w-3xl text-left dark:text-left mhub-hero-card min-h-[132px] sm:min-h-[150px] rounded-2xl px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[34px]">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-white/30 transition"
                aria-label={t("go_back") || "Go back"}
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back", { defaultValue: "Back" })}
              </button>
              <div className="flex flex-wrap items-center gap-2 text-white/85 text-xs font-semibold">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Package className="w-3.5 h-3.5" />
                  {displayCount} {displayCount === 1 ? (t("item") || "item") : (t("items") || "items")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Tag className="w-3.5 h-3.5" />
                  {mixedCurrency
                    ? t("multi_currency") || "Multi-currency"
                    : formatCurrency(displaySubtotalValidated, summary?.currency || "INR")}
                </span>
                <PageDensityToggle
                  value={density}
                  onChange={setDensity}
                  className="[&>span]:text-white/70 [&_select]:bg-white/15 [&_select]:text-white [&_select]:border-white/30"
                />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70">
                {t("cart_label") || "Checkout"}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                  <ShoppingCart className="w-5 h-5 text-white dark:text-white" />
                </div>
                <h1 className="text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white">
                  {t("cart") || "Cart"}
                </h1>
              </div>
              <p className="text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80">
                {t("cart_subtitle") ||
                  "Review items, update quantities, and check out when ready."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      {items.length > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 backdrop-blur-sm dark:bg-amber-950/80 dark:border-b dark:border-amber-600/40">
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 max-w-6xl mx-auto px-4 py-2.5 dark:text-amber-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 flex-shrink-0 dark:bg-amber-950/20">
              <Info className="w-3 h-3" />
            </span>
            {isAuthenticated
              ? t("cart_server_sync_note", {
                  defaultValue:
                    "Your cart syncs across devices and prices are validated at checkout.",
                })
              : t("cart_local_storage_note", {
                  defaultValue:
                    "Cart is saved on this device. Sign in to sync across devices.",
                })}
          </p>
        </div>
      )}

      {/* Summary bar — only show when cart has items */}
      {displayItems.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/10 backdrop-blur-md dark:bg-gradient-to-r dark:text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative max-w-6xl mx-auto px-4 py-4 flex items-center justify-between page-shell page-pad">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 dark:bg-slate-900/15">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm tracking-wide dark:text-white">
                  {displaySummary.itemCount ?? displayCount}{" "}
                  {(displaySummary.itemCount ?? displayCount) === 1
                    ? t("item") || "item"
                    : t("items") || "items"}
                  <span className="ml-2 text-blue-100 font-normal dark:text-blue-200">
                    &middot;
                  </span>
                  <span className="ml-2 text-white font-bold text-base dark:text-white">
                    {mixedCurrency
                      ? t("multi_currency") || "Multi-currency"
                      : formatCurrency(displaySubtotalValidated, currency)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white rounded-xl backdrop-blur-sm transition-all duration-200 dark:border-white/30 dark:text-white dark:bg-slate-900/10 dark:hover:bg-slate-900/20 dark:hover:text-white"
              >
                <Link to="/all-posts">
                  <ShoppingBag className="w-4 h-4 mr-1.5" />
                  {t("browse") || "Browse"}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clear}
                className="border-white/30 text-white bg-white/10 hover:bg-red-500/90 hover:border-red-400 hover:text-white rounded-xl backdrop-blur-sm transition-all duration-200 dark:border-white/30 dark:text-white dark:bg-slate-900/10 dark:hover:bg-red-800/90 dark:hover:border-red-600/40 dark:hover:text-white"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {t("clear_all") || "Clear"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-10 page-shell page-pad">
        {displayItems.length === 0 ? (
          /* ── Empty cart — full-page centered state ── */
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <>
              {/* Premium empty cart illustration */}
              <div className="relative w-40 h-40 mx-auto mb-10">
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-full blur-2xl opacity-50 dark:bg-gradient-to-br" />
                {/* Outer rotating ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-200/60 dark:border-blue-500/15 animate-[spin_25s_linear_infinite] dark:border-2 dark:border-dashed dark:border-blue-600/60" />
                {/* Inner ring */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-100/40 dark:border-blue-500/10 dark:bg-gradient-to-br dark:border dark:border-blue-600/40" />
                {/* Icon container */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-18 h-18 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 rotate-6 w-[72px] h-[72px] dark:bg-gradient-to-br">
                    <ShoppingBag className="w-9 h-9 text-white -rotate-6 dark:text-white" />
                  </div>
                </div>
                {/* Floating decorative dots */}
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-violet-400 rounded-full opacity-60 animate-[bounce_3s_ease-in-out_infinite] dark:bg-violet-800/30" />
                <div className="absolute bottom-3 -left-2 w-2.5 h-2.5 bg-blue-400 rounded-full opacity-40 animate-[bounce_3s_ease-in-out_infinite_0.5s] dark:bg-blue-800/30" />
                <div className="absolute top-8 -left-1 w-2 h-2 bg-indigo-300 rounded-full opacity-50 dark:bg-indigo-900/30" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 dark:text-slate-100">
                {t("cart_empty_title") || "Your cart is empty"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-[300px] mx-auto leading-relaxed text-center">
                {t("cart_empty_desc") ||
                  "Explore listings and add items you'd like to purchase."}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-8 h-12 text-sm font-semibold shadow-xl shadow-blue-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 dark:bg-gradient-to-r dark:text-white"
                >
                  <Link to="/all-posts">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    {t("browse_products") || "Browse Products"}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl px-6 h-12 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
                >
                  <Link to="/wishlist">
                    <Heart className="w-4 h-4 mr-2" />
                    {t("my_wishlist") || "My Wishlist"}
                  </Link>
                </Button>
              </div>
            </>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
          {/* Items list */}
          <div className="mhub-premium-surface rounded-2xl p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-gray-700/60 dark:border-b dark:border-slate-700">
                  <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest dark:text-slate-300">
                    {t("cart_items") || "Cart Items"}
                  </h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-gray-700/60 px-2.5 py-1 rounded-full font-medium dark:text-slate-300 dark:bg-slate-950">
                    {displayCount} {displayCount === 1 ? (t("item") || "item") : (t("items") || "items")}
                  </span>
                </div>
                {cartError && (
                  <div className="rounded-xl border border-red-200/70 dark:border-red-800/40 bg-red-50/70 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-300">
                    {cartError}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition"
                  >
                    {selectedIds.size === displayItems.length
                      ? t("deselect_all") || "Deselect all"
                      : t("select_all") || "Select all"}
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleBulkSaveForLater}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-full px-3 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                      >
                        {t("save_for_later") || "Save for later"}
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkRemove}
                        className="text-xs font-semibold text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-full px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      >
                        {t("remove_selected") || "Remove selected"}
                      </button>
                    </>
                  )}
                </div>
                {displayItems.map((item) => {
                  const lineTotal =
                    Number(item.qty ?? 1) * Number(item.price ?? 0);
                  const itemCurrency = item.currency || currency;
                  const priceDelta = Number(item.price_delta ?? 0);
                  const showPriceChange =
                    Boolean(item.price_changed) &&
                    Number.isFinite(priceDelta) &&
                    priceDelta !== 0;
                  const priceDeltaLabel = showPriceChange
                    ? formatCurrency(Math.abs(priceDelta), itemCurrency)
                    : null;
                  return (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800/60 bg-[var(--surface-2)] hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-indigo-50/30 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/10 transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30 dark:hover:shadow-none dark:border dark:border-slate-700 dark:hover:border-blue-600/40 dark:bg-[var(--surface-2)] dark:hover:bg-gradient-to-r"
                    >
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          aria-label={`Select ${item.title}`}
                        />
                      </label>
                      {/* Image */}
                      <div
                        className="relative w-24 h-24 sm:w-[100px] sm:h-[100px] rounded-xl overflow-hidden flex-shrink-0 cursor-pointer ring-1 ring-slate-200/60 dark:ring-gray-700/40"
                        onClick={() =>
                          (item.post_id || item.id) &&
                          navigate(`/post/${item.post_id || item.id}`)
                        }
                      >
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(event) => {
                            event.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                        {item.category_name && (
                          <Badge className="absolute top-2 left-2 bg-black/60 text-white border-0 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm font-medium dark:bg-black/60 dark:text-white dark:border-0">
                            {item.category_name}
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h3
                          className="font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 text-[15px] dark:text-slate-100 dark:hover:text-indigo-300"
                          onClick={() =>
                            (item.post_id || item.id) &&
                            navigate(`/post/${item.post_id || item.id}`)
                          }
                        >
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 dark:text-slate-300">
                          <span>{item.seller || t("seller") || "Seller"}</span>
                          {item.location && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 inline-block dark:bg-slate-800" />
                              <span>{item.location}</span>
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 dark:text-indigo-300">
                            {formatCurrency(item.price, itemCurrency)}
                          </span>
                          {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through dark:text-slate-300">
                              {formatCurrency(item.originalPrice, itemCurrency)}
                            </span>
                          )}
                          {showPriceChange && priceDeltaLabel && (
                            <Badge
                              className={`text-[10px] ${
                                priceDelta < 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-700/40"
                                  : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-700/40"
                              }`}
                            >
                              {priceDelta < 0
                                ? t("price_drop") || "Price drop"
                                : t("price_increase") || "Price increase"}{" "}
                              {priceDeltaLabel}
                            </Badge>
                          )}
                          {Number(item.qty ?? 1) > 1 && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-gray-700/40 px-2 py-0.5 rounded-full dark:text-slate-300 dark:bg-slate-950">
                              &times; {item.qty} ={" "}
                              <span className="font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-200">
                                {formatCurrency(lineTotal, itemCurrency)}
                              </span>
                            </span>
                          )}
                          {item.availability_status &&
                            item.availability_status !== "available" && (
                              <Badge className="text-[10px] bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40">
                                {t("unavailable") || "Unavailable"}
                              </Badge>
                            )}
                        </div>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-gray-700/40 rounded-full p-1 ring-1 ring-slate-200/60 dark:ring-gray-600/40 dark:bg-slate-950">
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 active:scale-95 transition-all duration-150 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none disabled:active:scale-100 shadow-none hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-gray-500 dark:hover:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-200 dark:disabled:hover:bg-transparent dark:border dark:border-transparent dark:hover:border-slate-700"
                          onClick={() =>
                            updateQty(item.id, (item.qty || 1) - 1)
                          }
                          disabled={(item.qty || 1) <= 1}
                          aria-label={t("decrease_quantity")}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={MAX_QTY}
                          value={item.qty || 1}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isFinite(nextValue)) return;
                            updateQty(
                              item.id,
                              Math.max(1, Math.min(MAX_QTY, nextValue)),
                            );
                          }}
                          aria-label={`${t("quantity") || "Quantity"} ${item.title}`}
                          className="h-8 w-12 text-center rounded-lg border-0 bg-transparent font-semibold text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:text-center dark:border-0 dark:bg-transparent dark:text-slate-100"
                        />
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 active:scale-95 transition-all duration-150 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none disabled:active:scale-100 shadow-none hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-gray-500 dark:hover:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-200 dark:disabled:hover:bg-transparent dark:border dark:border-transparent dark:hover:border-slate-700"
                          onClick={() =>
                            updateQty(item.id, (item.qty || 1) + 1)
                          }
                          disabled={(item.qty || 1) >= MAX_QTY}
                          aria-label={t("increase_quantity")}
                          title={
                            (item.qty || 1) >= MAX_QTY
                              ? `Max ${MAX_QTY} per item`
                              : ""
                          }
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-sm hover:shadow-red-100 dark:hover:shadow-none dark:text-slate-300 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden">
                          {t("remove") || "Remove"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-sm hover:shadow-indigo-100 dark:hover:shadow-none"
                        onClick={() => saveForLater(item.id)}
                      >
                        {t("save_for_later") || "Save"}
                      </button>
                    </div>
                  );
                })}
              </div>
              {displaySavedItems.length > 0 && (
                <div data-density="extra" className="mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-3">
                    {t("saved_for_later") || "Saved for later"}
                  </h3>
                  <div className="space-y-3">
                    {displaySavedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70"
                      >
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-300">
                            {formatCurrency(
                              item.price,
                              item.currency || currency,
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveToCart(item.id)}
                        >
                          {t("move_to_cart") || "Move to cart"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Summary sidebar — hidden when cart is empty */}
          {displayItems.length > 0 && <aside
            className="rounded-2xl p-5 md:p-6 h-fit md:sticky bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xl shadow-indigo-500/5 dark:shadow-black/20 ring-1 ring-black/[0.03] dark:ring-white/[0.05] dark:bg-slate-900/80 dark:border dark:border-white/60"
            style={{ top: "calc(var(--top-nav-height, 56px) + 1rem)" }}
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2.5 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 dark:bg-indigo-950/20">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400 dark:text-indigo-300" />
              </span>
              {t("summary") || "Order Summary"}
            </h2>
            {mixedCurrency && (
              <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-200">
                {t("multi_currency_notice") ||
                  "Multi-currency cart. Totals are shown per currency; final taxes/discounts apply at checkout."}
              </div>
            )}

            <div className="space-y-3.5 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-300">
                  {t("subtotal") || "Subtotal"} ({displayCount}{" "}
                  {displayCount === 1 ? (t("item") || "item") : (t("items") || "items")})
                </span>
                <span className="font-semibold text-slate-800 dark:text-white dark:text-slate-100">
                  {formatCurrency(displaySubtotalValidated, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 dark:text-slate-300">
                  <Package className="w-3.5 h-3.5" />
                  {t("shipping") || "Shipping"}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 dark:text-emerald-300">
                  {displayItems.length === 0
                    ? "\u2014"
                    : displayShipping === 0
                      ? t("free") || "Free"
                      : formatCurrency(displayShipping, currency)}
                </span>
              </div>
              {deliveryEta && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 dark:text-slate-300">
                    <Clock className="w-3 h-3" />
                    {t("estimated_delivery") || "Estimated delivery"}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {deliveryEta}
                  </span>
                </div>
              )}
              {mixedCurrency && (
                <div className="space-y-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-3 bg-white/70 dark:bg-slate-900/60">
                  {Object.entries(currencyBreakdown).map(([code, entry]) => (
                    <div
                      key={code}
                      className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                    >
                      <span className="font-semibold uppercase tracking-wide">
                        {code}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(entry.subtotal, code)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {displayTax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 dark:text-slate-300">
                    {t("tax") || "Tax"}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white dark:text-slate-100">
                    {formatCurrency(displayTax, currency)}
                  </span>
                </div>
              )}
              {displayDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 dark:text-slate-300">
                    {t("discount") || "Discount"}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 dark:text-emerald-300">
                    -{formatCurrency(displayDiscount, currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-200/80 dark:border-gray-600/50 pt-4 mb-5 dark:border-t dark:border-dashed dark:border-slate-700/80">
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl px-4 py-3 -mx-1 dark:bg-gradient-to-r">
                <span className="text-base font-bold text-slate-900 dark:text-white dark:text-slate-100">
                  {mixedCurrency
                    ? t("total_primary_currency") || "Total (primary)"
                    : t("total") || "Total"}
                </span>
                <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent dark:bg-gradient-to-r dark:bg-clip-text dark:text-transparent">
                  {formatCurrency(displayTotal, currency)}
                </span>
              </div>
              {currency === "INR" && displayTotal > 0 && (
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1">
                  ≈ 🪙 {rupeesToCoins(displayTotal).toLocaleString()} coins value
                </p>
              )}
            </div>

            <form onSubmit={handleApplyCoupon} className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder={t("coupon_code") || "Coupon code"}
                  className="h-10"
                />
                <Button type="submit" variant="outline" className="h-10">
                  {t("apply") || "Apply"}
                </Button>
              </div>
              {promotion?.valid && (
                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                  {promotion?.promo?.description || t("coupon_applied") || "Coupon applied"}
                </p>
              )}
              {couponStatus?.message && !promotion?.valid && (
                <p className="text-xs text-red-500 dark:text-red-300">
                  {couponStatus.message}
                </p>
              )}
            </form>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white rounded-xl h-12 text-base font-bold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg dark:bg-gradient-to-r dark:text-white"
              disabled={displayItems.length === 0 || displayItems.some(item => item.availability_status && item.availability_status !== "available")}
              onClick={() => { impactLight(); navigate("/payment?returnTo=/cart"); }}
            >
              {displayItems.some(item => item.availability_status && item.availability_status !== "available")
                ? (t("remove_unavailable_first") || "Remove unavailable items first")
                : (t("checkout") || "Proceed to Checkout")}
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full mt-2.5 border-slate-200 dark:border-gray-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors duration-200 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-200 dark:hover:bg-slate-950"
            >
              <Link to="/all-posts">
                <ShoppingBag className="w-4 h-4 mr-2" />
                {t("continue_shopping") || "Continue Shopping"}
              </Link>
            </Button>

            {/* Assurance badges */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-gray-700/50 space-y-2.5 dark:border-t dark:border-slate-700">
              {[
                {
                  label: t("secure_checkout") || "Secure checkout",
                  dotClass: "bg-emerald-500 ring-emerald-500/30",
                },
                {
                  label: t("buyer_protection") || "Buyer protection",
                  dotClass: "bg-blue-500 ring-blue-500/30",
                },
                {
                  label: t("easy_returns") || "Easy returns",
                  dotClass: "bg-violet-500 ring-violet-500/30",
                },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800 ${badge.dotClass}`}
                  />
                  {badge.label}
                </div>
              ))}
            </div>
          </aside>}
        </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
