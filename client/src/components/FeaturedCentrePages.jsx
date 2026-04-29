import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getFeaturedCentrePages } from "@/lib/api";

const normalizeText = (value) => String(value || "").trim();
const isNativeRuntime = () => {
  if (typeof window === "undefined") return false;
  try {
    if (
      typeof window.Capacitor?.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    ) {
      return true;
    }
  } catch {
    // Ignore runtime detection failures and fallback to UA.
  }
  if (window.__MHUB_ANDROID_WEB_REPLICA__ === true) return true;
  const ua = String(window.navigator?.userAgent || "").toLowerCase();
  return ua.includes("mhubandroidwebreplica") || (ua.includes("android") && /\bwv\b/.test(ua));
};

export default function FeaturedCentrePages({
  limit = 6,
  category,
  compact = false,
  className = "",
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headerTitle =
    t("featured_centrepages", { defaultValue: "Featured CentrePages" }) ||
    "Featured CentrePages";
  const headerSubtitle = t("featured_centrepages_subtitle", {
    defaultValue: "Premium sellers spotlighted for extra visibility.",
  });

  const queryParams = useMemo(() => {
    const params = { limit };
    if (normalizeText(category)) {
      params.category = normalizeText(category);
    }
    return params;
  }, [limit, category]);
  const nativeRuntime = useMemo(() => isNativeRuntime(), []);
  const requestTimeoutMs = nativeRuntime ? 6000 : 12000;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
    const loadFeatured = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getFeaturedCentrePages(queryParams, {
          signal: controller.signal,
        });
        const payload = response?.data ?? response;
        const list = Array.isArray(payload?.channels)
          ? payload.channels
          : Array.isArray(payload)
            ? payload
            : [];
        if (!active) return;
        setCentres(list);
      } catch (err) {
        if (!active) return;
        const aborted =
          err?.name === "CanceledError" ||
          err?.name === "AbortError" ||
          err?.code === "ERR_CANCELED";
        if (aborted) {
          setCentres([]);
          setError(
            nativeRuntime
              ? ""
              : t("featured_centrepages_unavailable", {
                  defaultValue: "Featured CentrePages are unavailable right now.",
                }),
          );
          return;
        }
        setCentres([]);
        setError(
          err?.message ||
            t("featured_centrepages_unavailable", {
              defaultValue: "Featured CentrePages are unavailable right now.",
            }),
        );
      } finally {
        clearTimeout(timeoutId);
        if (active) setLoading(false);
      }
    };
    loadFeatured();
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [queryParams, requestTimeoutMs, nativeRuntime, t]);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-5 w-56 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
                <div className="mt-3 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || centres.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {headerTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {headerSubtitle}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/centre")}
        >
          {t("view_all_centrepages", { defaultValue: "View all CentrePages" })}
        </Button>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        }
      >
        {centres.slice(0, limit).map((centre) => {
          const centreId = centre.channel_id || centre.id;
          const imageUrl = resolveMediaUrl(centre.logo_url || centre.cover_url || "", "/placeholder.svg");
          const categoryLabel = normalizeText(centre.category) || t("category", { defaultValue: "Category" });
          return (
            <Card
              key={centreId}
              className="group hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/centre/${centreId}`)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt={centre.name || "CentrePage"}
                    className="h-12 w-12 rounded-full object-cover bg-slate-100"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {centre.name || t("centre_page", { defaultValue: "CentrePage" })}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
                      {categoryLabel}
                    </p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                    <Star className="h-3 w-3" />
                    {t("premium", { defaultValue: "Premium" })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {centre.description || t("no_description", { defaultValue: "No description yet." })}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {centre.follower_count || 0} {t("followers", { defaultValue: "Followers" })}
                  </span>
                  <span className="text-slate-400">
                    {centre.location || t("location_unknown", { defaultValue: "Location unknown" })}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
