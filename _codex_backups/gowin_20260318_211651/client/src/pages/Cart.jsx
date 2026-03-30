import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { useCart } from "@/context/CartContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";

const formatCurrency = (value) =>
  `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;

const Cart = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, updateQty, removeItem, clear } = useCart();
  const {
    activeCategory: categoryModeCategory,
    activeApp,
    hasSelection: hasCategoryMode,
    categories: categoryModeCategories,
  } = useCategoryMode();

  const categoryModeCategoryId = useMemo(() => {
    if (!hasCategoryMode || !categoryModeCategory?.name) return null;
    if (categoryModeCategory?.id) return String(categoryModeCategory.id);
    const normalized = String(categoryModeCategory.name).trim().toLowerCase();
    const match = (Array.isArray(categoryModeCategories)
      ? categoryModeCategories
      : []
    ).find(
      (entry) =>
        String(
          entry?.name ||
            entry?.title ||
            entry?.label ||
            entry?.category_name ||
            "",
        )
          .trim()
          .toLowerCase() === normalized,
    );
    const id = match?.category_id || match?.id;
    return id ? String(id) : null;
  }, [
    hasCategoryMode,
    categoryModeCategory?.id,
    categoryModeCategory?.name,
    categoryModeCategories,
  ]);

  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const displayItems = useMemo(() => {
    return items.filter((item) =>
      matchesCategoryModeItem(item, {
        activeCategory: hasCategoryMode ? categoryModeCategory : null,
        activeCategoryId: categoryModeCategoryId,
        activeAppMatcher,
      }),
    );
  }, [
    items,
    hasCategoryMode,
    categoryModeCategory,
    categoryModeCategoryId,
    activeAppMatcher,
  ]);

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

  const isFilteredEmpty =
    (Boolean(hasCategoryMode && categoryModeCategory?.name) ||
      Boolean(activeAppMatcher?.activeApp)) &&
    items.length > 0 &&
    displayItems.length === 0;

  const MAX_QTY = 10;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 nav-clearance">
      {items.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 max-w-6xl mx-auto">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            {t("cart_local_storage_note") || "Cart is saved on this device. Sign in on another device to sync your cart."}
          </p>
        </div>
      )}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center page-shell page-pad">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">{t("cart") || "Cart"}</h1>
              <p className="text-blue-100 text-sm">
                {displayCount} {displayCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/50 text-white bg-white/10 hover:bg-white/20 hover:text-white"
            >
              <Link to="/all-posts">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("browse") || "Browse"}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={items.length === 0}
            >
              {t("clear_all") || "Clear"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 -translate-y-6 pb-8 page-shell page-pad">
        {hasCategoryMode && categoryModeCategory?.name ? (
          <div className="mb-4 rounded-2xl border border-indigo-100 bg-white/90 dark:border-indigo-900/40 dark:bg-gray-900/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Category mode: {categoryModeCategory.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cart items are filtered to this category.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-indigo-200 text-indigo-700 w-fit"
              onClick={() => navigate("/category-mode")}
            >
              {t("switch_category") || "Switch category"}
            </Button>
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
            {displayItems.length === 0 ? (
              isFilteredEmpty ? (
                <EmptyState
                  type="cart"
                  title={
                    categoryModeCategory?.name
                      ? `No items in ${categoryModeCategory.name}`
                      : t("cart") || "Cart"
                  }
                  message={
                    categoryModeCategory?.name
                      ? `Your cart is filtered to ${categoryModeCategory.name}. Switch category to see more.`
                      : t("cart_empty") || "Your cart is empty."
                  }
                  actionLabel={t("switch_category") || "Switch category"}
                  onAction={() => navigate("/category-mode")}
                  className="py-10"
                />
              ) : (
                <EmptyState type="cart" className="py-10" />
              )
            ) : (
              <div className="space-y-4">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700"
                  >
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full sm:w-24 h-24 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                      onError={(event) => {
                        event.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.seller || t("seller") || "Seller"}
                        {item.location ? ` \u2022 ${item.location}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => updateQty(item.id, (item.qty || 1) - 1)}
                        aria-label={t("decrease_quantity")}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="min-w-[28px] text-center font-semibold">
                        {item.qty || 1}
                      </span>
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                        onClick={() => updateQty(item.id, (item.qty || 1) + 1)}
                        disabled={(item.qty || 1) >= MAX_QTY}
                        aria-label={t("increase_quantity")}
                        title={(item.qty || 1) >= MAX_QTY ? `Max ${MAX_QTY} per item` : ""}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-semibold"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t("remove") || "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6 h-fit md:sticky md:top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("summary") || "Summary"}
            </h2>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>{t("subtotal") || "Subtotal"}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(displaySubtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
              <span>{t("shipping") || "Shipping"}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {displayItems.length === 0 ? "\u2014" : "Free"}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between text-base font-semibold text-gray-900 dark:text-white">
              <span>{t("total") || "Total"}</span>
              <span>{formatCurrency(displaySubtotal)}</span>
            </div>
            <Button
              className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
              disabled={displayItems.length === 0}
              onClick={() => navigate("/payment?returnTo=/cart")}
            >
              {t("checkout") || "Checkout"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full mt-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
            >
              <Link to="/all-posts">
                {t("browse_all_posts") || "Continue shopping"}
              </Link>
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Cart;
