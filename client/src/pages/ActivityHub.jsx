import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageCircle, Star, ShoppingCart, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageErrorState, PageLoadingState } from "@/components/page-state/PageStateBlocks";
import { useAuth } from "@/context/AuthContext";
import { getUserId } from "@/utils/authStorage";
import { useCmsPage } from "@/hooks/useCmsPage";

const ActivityHub = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tr = (key, fallback, options = {}) =>
    t(key, { defaultValue: fallback, ...options });
  const userId = getUserId(user);

  const { data: cmsContent, loading: cmsLoading, error: cmsError } = useCmsPage(
    "activity-hub"
  );

  const iconMap = useMemo(
    () => ({
      "message-circle": MessageCircle,
      "shopping-cart": ShoppingCart,
      star: Star,
      "map-pin": MapPin,
    }),
    []
  );

  const FALLBACK_ITEMS = useMemo(
    () => [
      {
        key: "chat",
        icon: "message-circle",
        labelKey: "activity_chat",
        fallbackLabel: "Messages",
        descKey: "activity_chat_desc",
        fallbackDesc: "View your conversations and messages",
        path: "/chat",
        requiresAuth: true,
      },
      {
        key: "offers",
        icon: "shopping-cart",
        labelKey: "activity_offers",
        fallbackLabel: "Offers & Negotiations",
        descKey: "activity_offers_desc",
        fallbackDesc: "Manage your price negotiations",
        path: "/offers",
        requiresAuth: true,
      },
      {
        key: "reviews",
        icon: "star",
        labelKey: "activity_reviews",
        fallbackLabel: "Reviews",
        descKey: "activity_reviews_desc",
        fallbackDesc: "Check your ratings and reviews",
        path: "/reviews",
        requiresAuth: true,
        requiresUserId: true,
        pathTemplate: "/profile/{userId}",
        fallbackPath: "/profile",
      },
      {
        key: "nearby",
        icon: "map-pin",
        labelKey: "activity_nearby",
        fallbackLabel: "Nearby Listings",
        descKey: "activity_nearby_desc",
        fallbackDesc: "Discover listings in your area",
        path: "/all-posts?sort=nearby",
      },
    ],
    [],
  );

  const items = useMemo(
    () =>
      Array.isArray(cmsContent?.items) && cmsContent.items.length > 0
        ? cmsContent.items
        : FALLBACK_ITEMS,
    [cmsContent, FALLBACK_ITEMS],
  );

  const title = cmsContent?.titleKey
    ? tr(cmsContent.titleKey, cmsContent.titleFallback || "Activity Hub")
    : tr("activity_hub_title", "Activity Hub");
  const description = cmsContent?.descriptionKey
    ? tr(
        cmsContent.descriptionKey,
        cmsContent.descriptionFallback ||
          "Quick access to your conversations, offers, reviews, and nearby listings."
      )
    : tr(
        "activity_hub_desc",
        "Quick access to your conversations, offers, reviews, and nearby listings."
      );

  const resolveItemPath = (item) => {
    if (!item) return "/activity";
    const template = item.pathTemplate || item.path || "";
    if (item.requiresUserId && template.includes("{userId}")) {
      if (!userId) return item.fallbackPath || "/profile";
      return template.replace("{userId}", userId);
    }
    return template || item.fallbackPath || "/activity";
  };

  if (cmsLoading && items.length === 0) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 flex items-center justify-center dark:bg-gray-950">
        <PageLoadingState
          title={tr("loading", "Loading...")}
          description={tr("activity_hub_loading", "Loading your activity shortcuts.")}
          marker="activity-hub-loading"
        />
      </div>
    );
  }

  if (cmsError && items.length === 0) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 flex items-center justify-center dark:bg-gray-950">
        <PageErrorState
          title={tr("activity_hub_unavailable", "Activity hub unavailable")}
          description={cmsError}
          marker="activity-hub-error"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[640px] mx-auto px-4 py-8 space-y-6 page-shell page-pad">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-200">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{tr("no_activities", "No activities available")}</p>
            </div>
          ) : (
          items.map((item) => {
            const Icon = iconMap[item.icon] || MessageCircle;
            const resolvedPath = resolveItemPath(item);
            const requiresUserId = Boolean(item.requiresUserId);
            const disabled = Boolean(item.disabled) || (requiresUserId && !userId);
            return (
              <Card
                key={item.key}
                className="p-4 flex flex-col gap-3 mhub-premium-surface rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center dark:bg-blue-950/20">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {tr(item.labelKey || item.key, item.fallbackLabel || item.label)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {tr(item.descKey || "", item.fallbackDesc || item.description || "")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {item.requiresAuth
                      ? tr("members_only", "Members only")
                      : tr("available", "Available")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(resolvedPath)}
                    disabled={disabled}
                  >
                    {tr("open", "Open")}
                  </Button>
                </div>
              </Card>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityHub;
