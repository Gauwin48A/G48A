import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Navigation,
  Sliders,
  RefreshCw,
  Image,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SellerTrustBadges from "@/components/SellerTrustBadges";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/services/api";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { useLocation as useLocationContext } from "@/context/LocationContext";
import { getApiOriginBase } from "@/lib/networkConfig";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
} from "@/utils/categoryModeFilters";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import { impactLight } from "@/services/nativeHapticsService";

const RADIUS_OPTIONS = [1, 2, 5, 10, 25, 50, 100];

const distanceBadge = (value) => {
  const distance = parseFloat(value);
  if (distance < 1) return "bg-green-500";
  if (distance < 5) return "bg-blue-500";
  if (distance < 10) return "bg-yellow-500";
  return "bg-orange-500";
};

const normalizeCategory = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export default function NearbyPosts() {
  const { t } = useTranslation();
  const { density, setDensity } = usePageDensity("mhub_nearby_density");
  const densityClass = density === "compact" ? "mhub-compact" : "";
  const tr = useCallback(
    (key, fallback, options = {}) =>
      t(key, { defaultValue: fallback, ...options }),
    [t],
  );
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(10);
  const [permissionState, setPermissionState] = useState("prompt");
  const [showMap, setShowMap] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024;
  });

  const {
    activeCategory: categoryModeCategory,
    activeApp,
    hasSelection: hasCategoryMode,
    categories: categoryModeCategories,
  } = useCategoryMode();

  const {
    latitude,
    longitude,
    requestLocation,
    permissionDenied,
    userSkipped,
  } = useLocationContext();

  const locationReady = Number.isFinite(latitude) && Number.isFinite(longitude);
  const locationBlocked = permissionDenied || userSkipped;
  const resolveMessage = useCallback(
    (value, fallbackKey) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      const key = value?.key ?? fallbackKey;
      const fallback = value?.fallback ?? "";
      return key ? tr(key, fallback || key) : fallback;
    },
    [tr],
  );
  const errorMessage = useMemo(
    () => resolveMessage(error),
    [resolveMessage, error],
  );
  const hasError = Boolean(errorMessage);

  const requestFreshLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loc = await requestLocation();
      if (loc) {
        setPermissionState("granted");
      }
    } catch (err) {
      const message = String(err?.message || "").toLowerCase();
      if (message.includes("https") || message.includes("secure")) {
        setError({
          key: "location_https_required",
          fallback:
            "Web location requires HTTPS (or localhost in development).",
        });
      } else if (message.includes("denied")) {
        setError({
          key: "enable_location_access",
          fallback: "Enable location access",
        });
      } else {
        setError({
          key: "failed_load_nearby_retry",
          fallback: "Failed to load nearby listings. Please retry.",
        });
      }
      setPermissionState("denied");
    } finally {
      setLoading(false);
    }
  }, [requestLocation]);

  useEffect(() => {
    if (locationReady) {
      setPermissionState("granted");
      setError(null);
      return;
    }
    if (locationBlocked) {
      setPermissionState("denied");
      setLoading(false);
      return;
    }
    requestFreshLocation();
  }, [locationBlocked, locationReady, requestFreshLocation]);

  useEffect(() => {
    if (!locationReady) return;

    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get("/nearby", {
          params: { lat: latitude, long: longitude, radius }
        });
        const payload = response?.data ?? response;
        if (!active) return;
        if (payload.success) {
          setPosts(payload.posts || []);
        } else {
          setError({
            key: "failed_fetch_nearby",
            fallback:
              payload.error || "Failed to fetch nearby listings. Please retry.",
          });
        }
      } catch {
        if (active) {
          setError({
            key: "failed_load_nearby_retry",
            fallback: "Failed to load nearby listings. Please retry.",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [latitude, longitude, locationReady, radius, t]);

  const activeCategoryKey = useMemo(
    () => normalizeCategory(categoryModeCategory?.name),
    [categoryModeCategory?.name],
  );
  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const displayPosts = useMemo(() => {
    return posts.filter((post) =>
      matchesCategoryModeItem(post, {
        activeCategory: hasCategoryMode ? categoryModeCategory : null,
        activeAppMatcher,
      }),
    );
  }, [activeAppMatcher, categoryModeCategory, hasCategoryMode, posts]);

  const isFilteredEmpty =
    (Boolean(hasCategoryMode && activeCategoryKey) ||
      Boolean(activeAppMatcher?.activeApp)) &&
    posts.length > 0 &&
    displayPosts.length === 0;

  const markerPositions = useMemo(
    () =>
      displayPosts.map((_, idx) => ({
        top: 18 + (idx * 17) % 60,
        left: 10 + (idx * 29) % 70,
      })),
    [displayPosts],
  );

  return (
    <div className={`min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950 ${densityClass}`}>
      <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-teal-600 dark:from-[#0b1220] dark:via-[#0f2a2a] dark:to-[#0b1220] px-4 py-6 dark:bg-gradient-to-r">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-white dark:text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white dark:text-white">
                  {t("nearby_posts_title")}
                </h1>
                <p className="text-green-100 text-sm dark:text-green-200">{t("find_items_close")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PageDensityToggle
                value={density}
                onChange={setDensity}
                className="[&>span]:text-white/80 [&_select]:bg-white/15 [&_select]:text-white [&_select]:border-white/30"
              />
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 dark:text-white dark:hover:bg-slate-900/20"
                onClick={requestFreshLocation}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 dark:bg-slate-900/10">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-white dark:text-white" />
              <span className="text-white font-medium dark:text-white">
                {t("search_radius")}: {radius} km
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {RADIUS_OPTIONS.map((value) => (
                <button
                  key={value}
                  onClick={() => { impactLight(); setRadius(value); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    radius === value
                      ? "bg-white text-green-600 shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {value} km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {hasCategoryMode && categoryModeCategory?.name && (
        <div className="max-w-6xl mx-auto px-4 pt-4 page-shell page-pad">
          <div className="mhub-premium-surface rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100">
                {tr("category_mode_label", "Category mode")}:{" "}
                {categoryModeCategory.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300">
                {tr(
                  "nearby_category_filter_hint",
                  "Nearby results are filtered to this category.",
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-emerald-200 text-emerald-700 dark:border-emerald-600/40 dark:text-emerald-300"
              onClick={() => navigate("/category-mode")}
            >
              {tr("switch_category", "Switch category")}
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 page-shell page-pad">
        {permissionState === "prompt" && !locationReady && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center mb-6 dark:bg-blue-950/20 dark:border dark:border-blue-600/40 dark:text-center">
            <Navigation className="w-12 h-12 mx-auto mb-4 text-blue-500 dark:text-blue-300" />
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
              {t("enable_location_access")}
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              {t("location_permission_desc") ||
                "We use your location to surface nearby listings. You can change this anytime in settings."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={requestFreshLocation}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white"
              >
                {t("allow_location") || "Allow location"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPermissionState("denied")}
              >
                {t("not_now") || "Not now"}
              </Button>
            </div>
          </div>
        )}
        {permissionState === "denied" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center mb-6 dark:bg-yellow-950/20 dark:border dark:border-yellow-600/40 dark:text-center">
            <Navigation className="w-12 h-12 mx-auto mb-4 text-yellow-500 dark:text-yellow-300" />
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              {t("location_access_required")}
            </h3>
            <p className="text-yellow-600 dark:text-yellow-300 mb-4">
              {t("need_location_msg")}
            </p>
            <Button
              onClick={requestFreshLocation}
              className="bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-800/30 dark:hover:bg-yellow-700/40 dark:text-white"
            >
              {t("enable_location")}
            </Button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card
                key={`nearby-skeleton-${idx}`}
                className="overflow-hidden mhub-premium-surface rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse dark:border"
              >
                <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 dark:bg-gray-900" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900" />
                  <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900" />
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {hasError && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center dark:bg-red-950/20 dark:border dark:border-red-600/40 dark:text-center">
            <p className="text-red-600 dark:text-red-400 dark:text-red-300">{errorMessage}</p>
            <Button onClick={requestFreshLocation} className="mt-4" variant="outline">
              {tr("try_again", "Try again")}
            </Button>
          </div>
        )}

                {!loading && !hasError && displayPosts.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white dark:text-gray-100">
                {t("nearby_listings") || "Nearby listings"}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap((prev) => !prev)}
              >
                {showMap ? t("hide_map") || "Hide map" : t("show_map") || "Show map"}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
              <div className="order-2 lg:order-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayPosts.map((post) => {
                    const rawImage = post.images?.[0] || post.image_url || "";
                    const imageUrl = rawImage
                      ? rawImage.startsWith("http")
                        ? rawImage
                        : `${getApiOriginBase()}${rawImage}`
                      : "";
                    const rating = Number(post.rating || post.seller_rating || 0);
                    const reviews = Number(
                      post.review_count || post.reviews_count || post.reviewCount || 0,
                    );
                    const sellerId =
                      post.seller_id || post.user_id || post.user?.id || null;
                    const trustPayload = post.trust || post.user?.trust || null;
                    const riskState =
                      post.risk_state || post.user?.risk_state || null;
                    const underReview =
                      post.under_review ?? post.user?.under_review ?? null;
                    return (
                      <Card
                        key={post.post_id}
                        onClick={() => { impactLight(); navigate(`/post/${post.post_id}`); }}
                        className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden mhub-premium-surface rounded-2xl border border-gray-200 dark:border-gray-700 dark:border"
                      >
                        <div className="relative">
                          <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center dark:bg-gray-950">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={post.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-300">
                                <Image className="w-10 h-10 mb-2" />
                                <span className="text-xs font-medium">
                                  {t("image_unavailable") || "Image coming soon"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div
                            className={`absolute top-3 right-3 ${distanceBadge(
                              post.distance_km,
                            )} text-white px-3 py-1 rounded-full text-sm font-medium shadow`}
                          >
                            {post.distance_text}
                          </div>
                          {post.seller_verified && (
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 dark:bg-green-800/30 dark:text-white">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {t("verified")}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 dark:text-gray-100">
                            {post.title}
                          </h3>
                          {rating > 0 && (
                            <div className="flex items-center gap-1 text-amber-500 text-xs mb-2 dark:text-amber-300">
                              <Star className="w-3.5 h-3.5" />
                              <span>{rating.toFixed(1)}</span>
                              {reviews > 0 && (
                                <span className="text-gray-400 dark:text-gray-300">
                                  ({reviews} {t("reviews") || "reviews"})
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2 dark:text-green-300">
                            ₹{post.price?.toLocaleString()}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 dark:text-gray-300">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {post.location || tr("unknown", "Unknown")}
                            </span>
                            <span>{post.category_name}</span>
                          </div>
                          {post.seller_name && (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 dark:text-gray-200">
                              {t("seller_label")}: {post.seller_name}
                              {post.seller_rating > 0 && (
                                <span className="ml-2 text-yellow-500 dark:text-yellow-300">
                                  ★ {parseFloat(post.seller_rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          )}
                          <SellerTrustBadges className="mt-2" size="sm" sellerId={sellerId} trust={trustPayload} riskState={riskState} underReview={underReview} />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div
                className={`order-1 lg:order-2 ${showMap ? "block" : "hidden"} lg:block`}
              >
                <div className="relative h-[320px] lg:h-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 overflow-hidden dark:border dark:border-emerald-600/40 dark:bg-gradient-to-br">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, rgba(16,185,129,0.35) 1px, transparent 0)",
                    }}
                  />
                  <div className="absolute top-4 left-4 rounded-xl bg-white/90 px-3 py-2 text-xs shadow dark:bg-slate-900/90">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">{t("your_area") || "Your area"}</p>
                    <p className="text-emerald-600 dark:text-emerald-300">{t("nearby_preview") || "Nearby preview"}</p>
                  </div>
                  {markerPositions.slice(0, 6).map((pos, idx) => (
                    <div
                      key={`marker-${idx}`}
                      className="absolute"
                      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                    >
                      <div className="h-3 w-3 rounded-full bg-emerald-600 shadow dark:bg-emerald-700/40" />
                      <div className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                        {displayPosts[idx]?.price
                          ? `Rs ${Number(displayPosts[idx].price).toLocaleString("en-IN")}`
                          : t("listing") || "Listing"}
                      </div>
                    </div>
                  ))}
                  <div className="absolute bottom-4 left-4 text-[11px] text-emerald-700 dark:text-emerald-300">
                    {t("map_preview_note") || "Map preview (approximate)"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !hasError && displayPosts.length === 0 && locationReady && (
          <div className="text-center py-16 dark:text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2 dark:text-gray-200">
              {isFilteredEmpty
                ? tr(
                    "nearby_filtered_empty_title",
                    "No {{category}} listings nearby",
                    {
                      category:
                        categoryModeCategory?.name ||
                        tr("category", "category"),
                    },
                  )
                : tr("no_posts_radius", "No posts within {{radius}} km", {
                    radius,
                  })}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 dark:text-gray-300">
              {isFilteredEmpty
                ? tr(
                    "nearby_filtered_empty_desc",
                    "Try switching category or expanding your radius.",
                  )
                : tr(
                    "increase_radius",
                    "Increase your radius to see more listings.",
                  )}
            </p>
            <Button
              onClick={() =>
                isFilteredEmpty ? navigate("/category-mode") : setRadius(50)
              }
              variant="outline"
            >
              {isFilteredEmpty
                ? tr("switch_category", "Switch category")
                : tr("search_50km", "Search within 50 km")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


