import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Grid3X3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageEmptyState } from "@/components/page-state/PageStateBlocks";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { getCategoryIcon, getSubcategoryIcon } from "@/constants/categoryIcons";
import { useCmsPage } from "@/hooks/useCmsPage";

const GROUP_STYLES = {
  electronics: { label: "Electronics", accent: "from-blue-500 to-indigo-600", description: "Phones, laptops, gadgets" },
  fashion: { label: "Fashion", accent: "from-pink-500 to-rose-600", description: "Clothing, footwear, accessories" },
  vehicles: { label: "Vehicles", accent: "from-emerald-500 to-teal-600", description: "Cars, bikes, parts" },
  others: { label: "Others", accent: "from-slate-600 to-slate-800", description: "Home, jobs, services and more" },
};
const FALLBACK_ACCENTS = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-teal-600",
  "from-amber-500 to-orange-600",
];
const PLAN_META = {
  premium: { label: "Premium", badgeClass: "bg-amber-500 text-white" },
  silver: { label: "Silver", badgeClass: "bg-slate-500 text-white" },
  bronze: { label: "Bronze", badgeClass: "bg-orange-500 text-white" },
  basic: { label: "Basic", badgeClass: "bg-slate-600 text-white" },
};
const PREFERRED_GROUPS = ["electronics", "fashion", "vehicles", "others"];

const normalizeValue = (value) => String(value || "").trim().toLowerCase();
const titleCase = (value) =>
  String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const normalizePlan = (value) => {
  const normalized = normalizeValue(value);
  if (!normalized) return "";
  if (normalized.includes("premium")) return "premium";
  if (normalized.includes("silver")) return "silver";
  if (normalized.includes("bronze")) return "bronze";
  if (normalized.includes("basic") || normalized.includes("free")) return "basic";
  return normalized;
};
const normalizeGroupKey = (value) => {
  const normalized = normalizeValue(value);
  if (!normalized) return "";
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) return "electronics";
  if (normalized.startsWith("fashion")) return "fashion";
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) return "vehicles";
  if (normalized === "other" || normalized === "others") return "others";
  return normalized;
};
const resolveGroupFromName = (value) => {
  const normalized = normalizeValue(value);
  if (!normalized) return "others";
  if (normalized.includes("electronic") || normalized.includes("mobile")) return "electronics";
  if (normalized.includes("fashion")) return "fashion";
  if (normalized.includes("vehicle") || normalized.includes("auto")) return "vehicles";
  return "others";
};
const resolveGroupForCategory = (category) =>
  normalizeGroupKey(category?.category_group || category?.categoryGroup) ||
  resolveGroupFromName(category?.name);
const getCategoryCount = (category) =>
  Number(category?.product_count ?? category?.post_count ?? category?.count ?? 0) || 0;
const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};
const buildPostFlowPath = (tierKey) =>
  `/category-hub${buildQueryString({ flow: "post", tier: tierKey || "" })}`;
const sortSubcategories = (list) =>
  [...(Array.isArray(list) ? list : [])].sort((left, right) => {
    const orderDiff = Number(left?.display_order ?? 0) - Number(right?.display_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const popularityDiff =
      Number(right?.popularity_score ?? right?.post_count ?? 0) -
      Number(left?.popularity_score ?? left?.post_count ?? 0);
    if (popularityDiff !== 0) return popularityDiff;
    return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, { sensitivity: "base" });
  });

function buildGroups(categories) {
  const grouped = new Map();
  (Array.isArray(categories) ? categories : []).forEach((category) => {
    const key = resolveGroupForCategory(category);
    const current = grouped.get(key) || { key, categories: [], count: 0 };
    current.categories.push(category);
    current.count += getCategoryCount(category);
    grouped.set(key, current);
  });
  return Array.from(grouped.values())
    .map((group, index) => {
      const style = GROUP_STYLES[group.key] || {};
      const subcategories = sortSubcategories(
        group.categories.flatMap((category) =>
          (Array.isArray(category?.subcategories) ? category.subcategories : []).map((subcategory) => ({
            ...subcategory,
            category_id: subcategory?.category_id || category?.category_id || category?.id || null,
            category_name: subcategory?.category_name || category?.name || "",
          })),
        ),
      );
      return {
        key: group.key,
        label: style.label || (group.categories.length === 1 ? group.categories[0]?.name || titleCase(group.key) : titleCase(group.key)),
        accent: style.accent || FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length],
        description: style.description || `${group.categories.length} categories available`,
        count: group.count,
        categories: group.categories,
        primaryCategory: group.categories.length === 1 ? group.categories[0] : null,
        subcategories,
      };
    })
    .sort((left, right) => {
      const leftIndex = PREFERRED_GROUPS.indexOf(left.key);
      const rightIndex = PREFERRED_GROUPS.indexOf(right.key);
      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      }
      return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
    });
}

export default function CategoryModeSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const tr = (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });
  const { categories, loading, selectCategory, selectSubcategory, clearCategory } = useCategoryMode();
  const { user } = useAuth();
  const { data: cmsContent } = useCmsPage("category-mode-select");
  const [activeGroup, setActiveGroup] = useState(null);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [subscriptionState, setSubscriptionState] = useState({ loading: false, currentPlan: "", postCredits: 0, subscription: null });

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isPostFlow = normalizeValue(params.get("flow")) === "post";
  const tierParam = params.get("tier") || "";
  const isForYouMode =
    params.get("mode") === "for-you" ||
    (location?.state?.returnTo || "").startsWith("/for-you");
  const basePath = isForYouMode ? "/for-you" : "/all-posts";
  const groups = useMemo(() => buildGroups(categories), [categories]);
  const groupOverrides = useMemo(
    () => (Array.isArray(cmsContent?.groups) ? cmsContent.groups : []),
    [cmsContent],
  );
  const mergedGroups = useMemo(() => {
    if (!groupOverrides.length) return groups;
    return groups.map((group) => {
      const match = groupOverrides.find(
        (entry) => normalizeGroupKey(entry?.key || entry?.group || "") === group.key,
      );
      return match ? { ...group, ...match, key: group.key } : group;
    });
  }, [groups, groupOverrides]);
  const groupByKey = useMemo(
    () => new Map(mergedGroups.map((group) => [group.key, group])),
    [mergedGroups],
  );
  const activeGroupData = activeGroup ? groupByKey.get(activeGroup) || null : null;
  const planMetaMap = useMemo(
    () => ({
      ...PLAN_META,
      ...(cmsContent?.planMeta && typeof cmsContent.planMeta === "object"
        ? cmsContent.planMeta
        : {}),
    }),
    [cmsContent],
  );

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setSubscriptionState((current) => ({ ...current, loading: true }));
    api.get("/subscriptions/my")
      .then((response) => {
        if (!mounted) return;
        setSubscriptionState({
          loading: false,
          currentPlan: response?.currentPlan || response?.current_plan || user?.current_plan || user?.tier || "",
          postCredits: response?.postCredits || user?.post_credits || 0,
          subscription: response?.subscription || null,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setSubscriptionState({
          loading: false,
          currentPlan: user?.current_plan || user?.tier || "",
          postCredits: user?.post_credits || 0,
          subscription: null,
        });
      });
    return () => { mounted = false; };
  }, [user?.current_plan, user?.post_credits, user?.tier, user?.user_id]);

  useEffect(() => {
    if (loading) return;
    if (!isPostFlow) {
      setActiveGroup(null);
      return;
    }
    const groupParam = normalizeGroupKey(params.get("group") || params.get("category_group") || params.get("categoryGroup"));
    const categoryIdParam = params.get("category_id") || params.get("categoryId") || "";
    const categoryParam = params.get("category") || "";
    const hasExplicitHubSelection = Boolean(groupParam || categoryIdParam || categoryParam);
    if (!hasExplicitHubSelection) {
      setActiveGroup(null);
      return;
    }
    const resolvedCategory =
      (categoryIdParam && categories.find((category) => String(category?.category_id || category?.id || "") === String(categoryIdParam))) ||
      (categoryParam && categories.find((category) => normalizeValue(category?.name) === normalizeValue(categoryParam))) ||
      null;
    const nextGroup =
      groupParam ||
      (resolvedCategory ? resolveGroupForCategory(resolvedCategory) : "");
    setActiveGroup(nextGroup && groupByKey.has(nextGroup) ? nextGroup : null);
  }, [categories, groupByKey, isPostFlow, loading, params]);

  const planKey = normalizePlan(subscriptionState.currentPlan || user?.current_plan || user?.tier || "") || "basic";
    const planMeta = planMetaMap[planKey] || planMetaMap.basic;
  const postCredits = Number(subscriptionState.postCredits || user?.post_credits || 0) || 0;
  const subscriptionExpiresAt = subscriptionState.subscription?.expiresAt ? new Date(subscriptionState.subscription.expiresAt) : null;
  const canPost =
    planKey !== "basic"
      ? Boolean(subscriptionState.subscription && subscriptionState.subscription.isActive !== false && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date()))
      : postCredits > 0;

  const updateHubQuery = (mutate) => {
    const next = new URLSearchParams(location.search);
    mutate(next);
    const query = next.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ""}`, { replace: true });
  };

  const handleSelectGroup = (group) => {
    if (group.primaryCategory) {
      const categoryId = group.primaryCategory?.category_id || group.primaryCategory?.id || null;
      selectCategory({ name: group.primaryCategory?.name || group.label, category_id: categoryId, id: categoryId });
    } else {
      clearCategory();
    }
    if (!isPostFlow) {
      const query = buildQueryString(
        group.primaryCategory
          ? {
              category_id: group.primaryCategory?.category_id || group.primaryCategory?.id || "",
              mode: isForYouMode ? "for-you" : "",
            }
          : {
              category_group: group.key,
              mode: isForYouMode ? "for-you" : "",
            },
      );
      navigate(`${basePath}${query}`);
      return;
    }
    setActiveGroup(group.key);
    setSubcategorySearch("");
    updateHubQuery((next) => {
      next.set("group", group.key);
      next.delete("category_id");
      next.delete("category");
      next.delete("subcategory_id");
      next.delete("subcategory");
      if (isForYouMode) next.set("mode", "for-you");
    });
  };

  const handleBack = () => {
    setActiveGroup(null);
    setSubcategorySearch("");
    clearCategory();
    updateHubQuery((next) => {
      next.delete("group");
      next.delete("category_id");
      next.delete("category");
      next.delete("subcategory_id");
      next.delete("subcategory");
      next.delete("category_group");
    });
  };

  const handleSelectSubcategory = (subcategory) => {
    const categoryId = subcategory?.category_id || activeGroupData?.primaryCategory?.category_id || activeGroupData?.primaryCategory?.id || "";
    const categoryName = subcategory?.category_name || activeGroupData?.primaryCategory?.name || "";
    const subcategoryId = subcategory?.subcategory_id || subcategory?.id || "";
    if (categoryName) {
      selectCategory({ name: categoryName, category_id: categoryId, id: categoryId });
    }
    selectSubcategory({ name: subcategory?.name || "", subcategory_id: subcategoryId, category_id: categoryId });
    const query = buildQueryString({
      category_id: categoryId,
      subcategory_id: subcategoryId,
      mode: isForYouMode ? "for-you" : "",
      tier: isPostFlow ? tierParam : "",
    });
    navigate(`${isPostFlow ? "/add-post" : basePath}${query}`);
  };

  const filteredSubcategories = useMemo(() => {
    const term = normalizeValue(subcategorySearch);
    const list = activeGroupData?.subcategories || [];
    if (!term) return list;
    return list.filter((subcategory) =>
      normalizeValue(subcategory?.name).includes(term) ||
      normalizeValue(subcategory?.category_name).includes(term),
    );
  }, [activeGroupData?.subcategories, subcategorySearch]);

  if (activeGroupData && isPostFlow) {
    const HeroIcon = getCategoryIcon(activeGroupData.primaryCategory?.name || activeGroupData.label, Grid3X3);
    const showCategoryName = (activeGroupData.categories?.length || 0) > 1;
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14 page-shell page-pad">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${activeGroupData.accent} px-6 py-8 text-white shadow-2xl`}>
            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <button type="button" onClick={handleBack} className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition dark:bg-slate-900/20 dark:text-xs dark:hover:bg-slate-900/30">
                  <ArrowLeft className="h-3 w-3" />{tr("back", "Back")}
                </button>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 dark:bg-slate-900/15"><HeroIcon className="h-5 w-5" /></span>
                  <div>
                    <h1 className="text-2xl font-extrabold md:text-3xl dark:text-2xl dark:md:text-3xl">{activeGroupData.primaryCategory?.name || activeGroupData.label}</h1>
                    <p className="text-sm text-white/80 dark:text-sm dark:text-white/80">{isPostFlow ? tr("pick_subcategory_post", "Pick a subcategory to prefill your post") : tr("pick_subcategory_browse", "Pick a subcategory to start browsing")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/15 text-white border-white/20 dark:bg-slate-900/15 dark:text-white dark:border-white/20">{(activeGroupData.subcategories || []).length} {tr("subcategories", "subcategories")}</Badge>
                  <Badge className="bg-white/15 text-white border-white/20 dark:bg-slate-900/15 dark:text-white dark:border-white/20">{activeGroupData.count || 0} {tr("listings", "listings")}</Badge>
                </div>
              </div>
              {!isPostFlow && (
                <Button variant="outline" onClick={() => navigate(`${basePath}${buildQueryString(activeGroupData.primaryCategory ? { category_id: activeGroupData.primaryCategory?.category_id || activeGroupData.primaryCategory?.id || "", mode: isForYouMode ? "for-you" : "" } : { category_group: activeGroupData.key, mode: isForYouMode ? "for-you" : "" })}`)} className="border-white/40 bg-white/10 text-white hover:bg-white/20 dark:border-white/40 dark:bg-slate-900/10 dark:text-white dark:hover:bg-slate-900/20">
                  {tr("view_all_in_group", "View all")}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 dark:bg-slate-900/10" />
          </div>
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white dark:text-lg dark:text-slate-100">{tr("subcategories", "Subcategories")}</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-xs dark:text-slate-300">{loading ? tr("loading", "Loading...") : `${filteredSubcategories.length} ${tr("results", "results")}`}</span>
            </div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input value={subcategorySearch} onChange={(event) => setSubcategorySearch(event.target.value)} placeholder={tr("search_subcategories", "Search subcategories")} className="h-10 rounded-full" />
              {subcategorySearch ? <Button type="button" variant="outline" onClick={() => setSubcategorySearch("")} className="h-10 rounded-full">{tr("clear", "Clear")}</Button> : null}
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => <Card key={`subcategory-skeleton-${index}`} className="border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 animate-pulse dark:border dark:border-slate-700 dark:bg-slate-900"><div className="h-20 rounded-xl bg-slate-100 dark:bg-[var(--surface-2)] dark:bg-slate-950" /></Card>)}
              </div>
            ) : filteredSubcategories.length === 0 ? (
              <Card className="border border-slate-200 bg-white/80 dark:border-gray-700 dark:bg-gray-900/60 dark:border dark:border-slate-700 dark:bg-slate-900/80"><CardContent className="p-6 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-center dark:text-sm dark:text-slate-300">{subcategorySearch ? tr("no_subcategory_match", "No matching subcategories.") : tr("no_subcategories", "No subcategories available yet.")}</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {filteredSubcategories.map((subcategory) => {
                  const Icon = getSubcategoryIcon(subcategory?.name || "", subcategory?.category_name, Package);
                  const count = Number(subcategory?.post_count ?? subcategory?.popularity_score ?? subcategory?.count ?? 0);
                  return (
                    <button key={`${subcategory?.subcategory_id || subcategory?.id || subcategory?.name}-${subcategory?.category_name || ""}`} type="button" onClick={() => handleSelectSubcategory(subcategory)} className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/60 dark:border dark:border-slate-700 dark:bg-slate-900 dark:text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-[var(--surface-2)] dark:bg-slate-950 dark:text-slate-200"><Icon className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 dark:text-sm dark:text-slate-100">{subcategory?.name || tr("subcategory", "Subcategory")}</p>
                          {showCategoryName && subcategory?.category_name ? <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 dark:text-[11px] dark:text-slate-300">{subcategory.category_name}</p> : null}
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 dark:text-[11px] dark:text-slate-300">{count > 0 ? `${count} ${tr("listings", "listings")}` : tr("browse_now", "Browse now")}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14 page-shell page-pad">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-[var(--surface-2)] dark:text-slate-200 dark:bg-slate-900/80 dark:text-xs"><Grid3X3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />{isPostFlow ? tr("post_flow", "Post flow") : tr("browse_flow", "Browse flow")}</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl dark:text-3xl dark:text-slate-100 dark:md:text-4xl">{tr("pick_category_title", "Pick a category to start")}</h1>
          <p className="text-base text-slate-600 dark:text-slate-300 dark:text-base dark:text-slate-200">{isPostFlow ? tr("pick_category_subtitle", "Choose a category group to see the full subcategory grid.") : tr("pick_category_browse_subtitle", "Choose a category group to start browsing listings.")}</p>
        </div>
        {user && !isPostFlow ? (
          <Card className="mt-6 border border-slate-200/70 bg-white/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 dark:border dark:border-slate-700/70 dark:bg-slate-900/90">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-xs dark:text-slate-300">{tr("welcome", "Welcome")}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-sm">{tr("current_plan", "Current plan")}:</span>
                  <Badge className={planMeta.badgeClass}>{tr(planKey, planMeta.label)}</Badge>
                  {planKey === "basic" ? <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-xs dark:text-slate-300">{tr("post_credits", "Post credits")}: {postCredits}</span> : null}
                </div>
              </div>
              <Button onClick={() => navigate(canPost ? buildPostFlowPath(planKey) : `/tier-selection?returnTo=${encodeURIComponent(buildPostFlowPath(planKey))}`)} disabled={subscriptionState.loading} className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 hover:bg-blue-700 dark:bg-blue-700/40 dark:text-sm dark:text-white dark:hover:bg-blue-700/40">
                {subscriptionState.loading ? tr("loading", "Loading...") : canPost ? tr("post_now", "Post now") : tr("upgrade", "Upgrade")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Card key={`group-skeleton-${index}`} className="overflow-hidden border-0 shadow-lg dark:border-0"><CardContent className="animate-pulse px-6 py-6"><div className="h-24 rounded-2xl bg-slate-200 dark:bg-[var(--surface-2)] dark:bg-slate-900" /></CardContent></Card>)}</div>
        ) : groups.length === 0 ? (
          <PageEmptyState
            marker="empty"
            className="mt-8"
            title={tr("no_categories", "No category groups available yet.")}
            description={tr("no_categories_hint", "Check back soon or browse all posts to keep exploring.")}
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40"
                  onClick={() => navigate("/all-posts")}
                >
                  {tr("browse_all_posts", "Browse all posts")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  {tr("refresh", "Refresh")}
                </Button>
              </div>
            )}
          />
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {mergedGroups.map((group) => {
              const Icon = getCategoryIcon(group.label, Package);
              return (
                <button key={group.key} type="button" onClick={() => handleSelectGroup(group)} className="text-left dark:text-left">
                  <Card className="overflow-hidden border-0 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-0">
                    <CardContent className={`relative bg-gradient-to-r ${group.accent} px-6 py-6 text-white`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 dark:bg-slate-900/20"><Icon className="h-5 w-5" /></div>
                          <h2 className="mt-4 text-xl font-bold dark:text-xl">{tr(group.label.toLowerCase().replace(/\s+/g, "_"), group.label)}</h2>
                          <p className="text-sm text-white/85 dark:text-sm dark:text-white/85">{group.description}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold dark:bg-slate-900/20 dark:text-xs">{group.count > 0 ? `${group.count} ${tr("listings", "listings")}` : tr("explore", "Explore")}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className="bg-white/15 text-white border-white/20 dark:bg-slate-900/15 dark:text-white dark:border-white/20">{(group.subcategories || []).length} {tr("subcategories", "subcategories")}</Badge>
                        <Badge className="bg-white/15 text-white border-white/20 dark:bg-slate-900/15 dark:text-white dark:border-white/20">{(group.categories || []).length} {tr("categories", "categories")}</Badge>
                      </div>
                      <ArrowRight className="mt-6 h-5 w-5 text-white/90 dark:text-white/90" />
                      <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-white/10 dark:bg-slate-900/10" />
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

