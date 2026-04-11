import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ShoppingCart,
  MapPin,
  Tag,
  Package,
  Star,
  Clock,
  CheckCircle,
  ShieldCheck,
  X,
  Eye,
} from "lucide-react";
import { FaExchangeAlt as CompareIcon } from "react-icons/fa";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { navigateBack } from "@/utils/navigation";

const getImageUrl = (item) => {
  const raw =
    item?.image_url ||
    item?.imageUrl ||
    item?.thumbnail ||
    item?.cover ||
    (Array.isArray(item?.images) ? item.images[0] : null) ||
    (Array.isArray(item?.media) ? item.media[0] : null);
  if (!raw) return "/placeholder.svg";
  if (typeof raw === "string") return resolveMediaUrl(raw) || "/placeholder.svg";
  const candidate = raw?.url || raw?.src || raw?.image_url || "";
  return resolveMediaUrl(candidate) || "/placeholder.svg";
};

const parsePrice = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  return Number(cleaned) || 0;
};

const formatCurrency = (value) => {
  const num = parsePrice(value);
  if (!num) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

const getItemId = (item) =>
  String(item?.post_id ?? item?.postId ?? item?.id ?? "").trim();

const SPEC_FIELDS = [
  { key: "price", label: "Price", getter: (i) => formatCurrency(i?.price) },
  { key: "condition", label: "Condition", getter: (i) => i?.condition || i?.item_condition },
  { key: "brand", label: "Brand", getter: (i) => i?.brand || i?.brand_name },
  { key: "model", label: "Model", getter: (i) => i?.model || i?.model_name },
  { key: "category", label: "Category", getter: (i) => i?.category_name || i?.category },
  { key: "subcategory", label: "Subcategory", getter: (i) => i?.subcategory_name || i?.subcategory },
  { key: "location", label: "Location", getter: (i) => i?.location || i?.city || i?.area },
  { key: "seller", label: "Seller", getter: (i) => i?.user?.name || i?.user_name || i?.username || i?.seller_name },
  { key: "posted", label: "Posted", getter: (i) => i?.created_at ? new Date(i.created_at).toLocaleDateString() : null },
  { key: "warranty", label: "Warranty", getter: (i) => i?.warranty || i?.warranty_period },
  { key: "delivery", label: "Delivery", getter: (i) => i?.delivery_option || i?.delivery },
  { key: "storage", label: "Storage", getter: (i) => i?.storage || i?.storage_size },
  { key: "color", label: "Color", getter: (i) => i?.color },
  { key: "year", label: "Year", getter: (i) => i?.year || i?.manufacture_year },
  { key: "status", label: "Status", getter: (i) => i?.status },
];

export default function ComparePosts() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const items = useMemo(
    () => (Array.isArray(location.state?.compareItems) ? location.state.compareItems : []),
    [location.state],
  );

  const commonSubcategory = useMemo(() => {
    if (!items.length) return "";
    const sub = String(items[0]?.subcategory_name || items[0]?.subcategory || "").trim();
    return sub;
  }, [items]);

  const visibleSpecs = useMemo(() => {
    return SPEC_FIELDS.filter((spec) =>
      items.some((item) => {
        const val = spec.getter(item);
        return val != null && String(val).trim() !== "";
      }),
    );
  }, [items]);

  if (!items.length) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="mhub-premium-surface max-w-md w-full p-8 text-center">
          <CompareIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {t("no_items_to_compare", { defaultValue: "No items to compare" })}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("select_items_first", { defaultValue: "Select items from listings to compare them side by side." })}
          </p>
          <Button onClick={() => navigateBack(navigate, "/all-posts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back_to_listings", { defaultValue: "Back to Listings" })}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigateBack(navigate, "/all-posts")}
              className="rounded-full px-3 py-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CompareIcon className="w-5 h-5 text-purple-500" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("compare_products", { defaultValue: "Compare Products" })}
              </h1>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {items.length} {t("items", { defaultValue: "items" })}
              </Badge>
              {commonSubcategory && (
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {commonSubcategory}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Product cards row ── */}
        <div
          className="grid gap-4 mb-8"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(240px, 1fr))` }}
        >
          {items.map((item) => {
            const itemId = getItemId(item);
            const imgSrc = getImageUrl(item);
            const price = formatCurrency(item?.price);
            return (
              <Card
                key={itemId}
                className="mhub-premium-surface rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="relative">
                  <img
                    src={imgSrc}
                    alt={item?.title || ""}
                    className="w-full h-48 object-cover"
                    onError={(ev) => { ev.target.src = "/placeholder.svg"; }}
                  />
                  {price && (
                    <span className="absolute bottom-2.5 left-3 bg-black/40 backdrop-blur-md rounded-lg px-2.5 py-1 text-lg font-bold text-white">
                      {price}
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 mb-2">
                    {item?.title || "—"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {(item?.location || item?.city) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item?.location || item?.city}
                      </span>
                    )}
                    {item?.user?.name || item?.user_name ? (
                      <>
                        <span>·</span>
                        <span>{item?.user?.name || item?.user_name}</span>
                      </>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => navigate(`/post/${itemId}`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    {t("view_details", { defaultValue: "View Details" })}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Comparison table ── */}
        <Card className="mhub-premium-surface rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/40">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky left-0 min-w-[140px]">
                      {t("specification", { defaultValue: "Specification" })}
                    </th>
                    {items.map((item) => (
                      <th
                        key={getItemId(item)}
                        className="text-left p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 min-w-[200px]"
                      >
                        <span className="line-clamp-1">{item?.title || "—"}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSpecs.map((spec, index) => (
                    <tr
                      key={spec.key}
                      className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-800/20"}`}
                    >
                      <td className="p-4 font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-900">
                        {t(spec.key, { defaultValue: spec.label })}
                      </td>
                      {items.map((item) => {
                        const val = spec.getter(item);
                        const display = val != null && String(val).trim() ? String(val) : "—";
                        return (
                          <td
                            key={getItemId(item)}
                            className="p-4 text-gray-900 dark:text-gray-100 font-medium"
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
