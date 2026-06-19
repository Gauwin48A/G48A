import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Search,
  MapPin,
  IndianRupee,
  Calendar,
  Check,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Latest", icon: "🆕" },
  { value: "date_asc", label: "Oldest", icon: "📅" },
  { value: "price_asc", label: "Price: Low to High", icon: "💰" },
  { value: "price_desc", label: "Price: High to Low", icon: "💎" },
  { value: "views_desc", label: "Most Viewed", icon: "👁️" },
  { value: "likes_desc", label: "Most Liked", icon: "❤️" },
  { value: "featured", label: "Featured First", icon: "⭐" },
  { value: "premium", label: "Premium First", icon: "🌟" },
];

const CONDITION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

const POST_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "premium", label: "Premium" },
  { value: "featured", label: "Featured" },
  { value: "normal", label: "Normal" },
];

const USER_TYPE_OPTIONS = [
  { value: "", label: "All users" },
  { value: "verified", label: "Verified sellers" },
  { value: "premium", label: "Premium users" },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar", "Chandigarh", "Dadra & Nagar Haveli",
  "Daman & Diu", "Delhi", "Jammu & Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

export default function AllPostsFilterPanel({
  open,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
  activeFilterCount,
}) {
  const { t } = useTranslation();
  const tr = useCallback((key, fallback) => t(key, { defaultValue: fallback }), [t]);

  // Local filter state (edits are applied on "Apply" button click)
  const [localFilters, setLocalFilters] = useState({ ...filters });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [datePreset, setDatePreset] = useState("");

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters({ ...filters });
  }, [filters, open]);

  const updateLocal = useCallback((key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = useCallback(() => {
    onApplyFilters(localFilters);
    onClose();
  }, [localFilters, onApplyFilters, onClose]);

  const handleClear = useCallback(() => {
    const cleared = {
      search: "", category: "All", subcategory: "All", categoryGroup: "",
      condition: "", sortBy: "", latestWindow: "", location: "",
      minPrice: "", maxPrice: "", priceRange: "", startDate: "", endDate: "",
      verifiedOnly: false, page: 1,
    };
    setLocalFilters(cleared);
    onClearFilters();
    onClose();
  }, [onClearFilters, onClose]);

  const handleDatePreset = useCallback((preset) => {
    setDatePreset(preset);
    if (preset === "today") {
      const today = new Date().toISOString().split("T")[0];
      updateLocal("startDate", today);
      updateLocal("endDate", today);
    } else if (preset === "7days") {
      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      updateLocal("startDate", start.toISOString().split("T")[0]);
      updateLocal("endDate", end.toISOString().split("T")[0]);
    } else if (preset === "30days") {
      const end = new Date();
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      updateLocal("startDate", start.toISOString().split("T")[0]);
      updateLocal("endDate", end.toISOString().split("T")[0]);
    } else if (preset === "") {
      updateLocal("startDate", "");
      updateLocal("endDate", "");
    }
  }, [updateLocal]);

  const handleStateSelect = useCallback((state) => {
    updateLocal("location", state);
    setShowLocationPicker(false);
  }, [updateLocal]);

  const activeLocalCount = useMemo(() => {
    let count = 0;
    if (localFilters.minPrice) count++;
    if (localFilters.maxPrice) count++;
    if (localFilters.location) count++;
    if (localFilters.condition) count++;
    if (localFilters.startDate || localFilters.endDate) count++;
    if (localFilters.verifiedOnly) count++;
    if (localFilters.sortBy) count++;
    return count;
  }, [localFilters]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {tr("filters", "Filters")}
              </h2>
              {activeLocalCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeLocalCount} {tr("active", "active")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeLocalCount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {tr("clear_all", "Clear all")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* ─── Sort ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("sort_by", "Sort by")}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateLocal("sortBy", localFilters.sortBy === opt.value ? "" : opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    localFilters.sortBy === opt.value
                      ? "bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="truncate">{tr(`sort_${opt.value}`, opt.label)}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* ─── Price Range ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <IndianRupee className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("price_range", "Price range")}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder={tr("min", "Min")}
                  value={localFilters.minPrice}
                  onChange={(e) => updateLocal("minPrice", e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <span className="text-slate-300 dark:text-slate-600 shrink-0">—</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder={tr("max", "Max")}
                  value={localFilters.maxPrice}
                  onChange={(e) => updateLocal("maxPrice", e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            {localFilters.minPrice && localFilters.maxPrice && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                ₹{Number(localFilters.minPrice).toLocaleString("en-IN")} — ₹{Number(localFilters.maxPrice).toLocaleString("en-IN")}
              </div>
            )}
          </section>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* ─── Date ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("date", "Date")}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDatePreset(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    datePreset === opt.value || (opt.value === "" && !datePreset)
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tr(`date_${opt.value || "any"}`, opt.label)}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) => updateLocal("startDate", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-slate-400 text-sm">to</span>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) => updateLocal("endDate", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
          </section>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* ─── Location ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("location", "Location")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationPicker(!showLocationPicker)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-left focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <span className={localFilters.location ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}>
                {localFilters.location || tr("select_state", "Select state")}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showLocationPicker ? "rotate-180" : ""}`} />
            </button>
            {showLocationPicker && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                <button
                  type="button"
                  onClick={() => handleStateSelect("")}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700"
                >
                  {tr("all_locations", "All locations")}
                </button>
                {INDIAN_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => handleStateSelect(state)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      localFilters.location === state
                        ? "bg-violet-50 text-violet-700 font-medium dark:bg-violet-900/20 dark:text-violet-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* ─── Condition ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("condition", "Condition")}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateLocal("condition", localFilters.condition === opt.value ? "" : opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    localFilters.condition === opt.value
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tr(`condition_${opt.value || "any"}`, opt.label)}
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* ─── Post Type ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("post_type", "Post type")}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {POST_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateLocal("postType", localFilters.postType === opt.value ? "" : opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    localFilters.postType === opt.value
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tr(`post_type_${opt.value || "all"}`, opt.label)}
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* ─── User Type ─── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {tr("user_type", "User type")}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {USER_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value === "verified") {
                      updateLocal("verifiedOnly", !localFilters.verifiedOnly);
                    } else if (opt.value === "premium") {
                      updateLocal("premiumOnly", !localFilters.premiumOnly);
                    } else {
                      updateLocal("verifiedOnly", false);
                      updateLocal("premiumOnly", false);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    (opt.value === "verified" && localFilters.verifiedOnly) ||
                    (opt.value === "premium" && localFilters.premiumOnly) ||
                    (opt.value === "" && !localFilters.verifiedOnly && !localFilters.premiumOnly)
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tr(`user_type_${opt.value || "all"}`, opt.label)}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex-1 py-3 rounded-xl border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {tr("reset", "Reset")}
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold shadow-lg shadow-violet-200 dark:shadow-violet-900/30 hover:shadow-xl transition-shadow"
            >
              <Search className="w-4 h-4 mr-1.5" />
              {tr("apply_filters", "Apply Filters")}
              {activeLocalCount > 0 && (
                <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">
                  {activeLocalCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
