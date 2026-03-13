import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { useCart } from "@/context/CartContext";

const formatCurrency = (value) =>
  `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;

const Cart = () => {
  const { t } = useTranslation();
  const { items, updateQty, removeItem, clear, subtotal, totalCount } =
    useCart();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">{t("cart") || "Cart"}</h1>
              <p className="text-blue-100 text-sm">
                {totalCount} {totalCount === 1 ? "item" : "items"}
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

      <div className="max-w-6xl mx-auto px-4 mt-6 -translate-y-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
            {items.length === 0 ? (
              <EmptyState type="cart" className="py-10" />
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
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
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="min-w-[28px] text-center font-semibold">
                        {item.qty || 1}
                      </span>
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => updateQty(item.id, (item.qty || 1) + 1)}
                        aria-label="Increase quantity"
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
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
              <span>{t("shipping") || "Shipping"}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {items.length === 0 ? "\u2014" : "Free"}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between text-base font-semibold text-gray-900 dark:text-white">
              <span>{t("total") || "Total"}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <Button
              className="w-full mt-4 bg-blue-600 text-white hover:bg-blue-700"
              disabled={items.length === 0}
            >
              {t("checkout") || "Checkout"}
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full mt-2 border-blue-200 text-blue-700"
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
