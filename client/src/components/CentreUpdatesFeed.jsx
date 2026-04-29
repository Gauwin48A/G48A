import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getFollowingCentreUpdates } from "@/lib/api";

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

const normalizeImageList = (update) => {
  const collected = [];
  const rawList = update?.image_urls ?? update?.imageUrls ?? null;
  if (Array.isArray(rawList)) {
    collected.push(...rawList);
  } else if (typeof rawList === "string" && rawList.trim()) {
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        collected.push(...parsed);
      } else {
        collected.push(rawList);
      }
    } catch {
      collected.push(rawList);
    }
  }
  const single = update?.image_url || update?.imageUrl;
  if (single) collected.unshift(single);
  return [...new Set(collected)]
    .map((url) => resolveMediaUrl(url, ""))
    .filter(Boolean);
};

export default function CentreUpdatesFeed({ limit = 8, className = "" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const nativeRuntime = useMemo(() => isNativeRuntime(), []);

  const headerTitle =
    t("centre_updates_feed", { defaultValue: "CentrePage Updates" }) ||
    "CentrePage Updates";
  const headerSubtitle = t("centre_updates_feed_subtitle", {
    defaultValue: "Latest updates from CentrePages you follow.",
  });

  const queryParams = useMemo(() => ({ limit }), [limit]);
  const requestTimeoutMs = nativeRuntime ? 6000 : 12000;

  const loadUpdates = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await getFollowingCentreUpdates(queryParams, { signal });
      const payload = response?.data ?? response;
      const list = Array.isArray(payload?.updates)
        ? payload.updates
        : Array.isArray(payload)
          ? payload
          : [];
      if (!mountedRef.current) return;
      setUpdates(list);
    } catch (err) {
      if (!mountedRef.current) return;
      const aborted =
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.code === "ERR_CANCELED";
      if (aborted) {
        setUpdates([]);
        setError(
          nativeRuntime
            ? ""
            : t("centre_updates_unavailable", {
                defaultValue: "Updates are unavailable right now.",
              }),
        );
        return;
      }
      setUpdates([]);
      setError(
        err?.message ||
          t("centre_updates_unavailable", {
            defaultValue: "Updates are unavailable right now.",
          }),
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [nativeRuntime, queryParams, t]);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
    loadUpdates(controller.signal).finally(() => clearTimeout(timeoutId));
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      mountedRef.current = false;
    };
  }, [loadUpdates, requestTimeoutMs]);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-5 w-52 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-28 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    if (nativeRuntime) {
      return null;
    }
    return (
      <Card className={`border border-rose-200 bg-rose-50/60 ${className}`}>
        <CardContent className="p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-rose-700">
            {t("centre_updates_error", { defaultValue: "Could not load updates" })}
          </p>
          <p className="text-xs text-rose-600">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
              loadUpdates(controller.signal).finally(() => clearTimeout(timeoutId));
            }}
          >
            {t("retry", { defaultValue: "Retry" })}
          </Button>
        </CardContent>
      </Card>
    );
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
        <Button variant="outline" size="sm" onClick={() => navigate("/centre")}>
          {t("explore_centrepages", { defaultValue: "Explore CentrePages" })}
        </Button>
      </div>

      {updates.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("centre_updates_empty", {
                defaultValue: "Follow CentrePages to see their latest updates here.",
              })}
            </p>
            <Button size="sm" onClick={() => navigate("/centre")}>
              {t("discover_centrepages", { defaultValue: "Discover CentrePages" })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {updates.slice(0, limit).map((update) => {
            const images = normalizeImageList(update);
            const coverImage = resolveMediaUrl(
              update.logo_url || update.cover_url || "",
              "/placeholder.svg",
            );
            const channelName =
              update.channel_name || t("centre_page", { defaultValue: "CentrePage" });
            const categoryLabel = normalizeText(update.category) ||
              t("category", { defaultValue: "Category" });
            const followerCount = Number(update.follower_count || 0);
            const createdAt = update.created_at
              ? new Date(update.created_at).toLocaleString()
              : "";

            return (
              <Card
                key={update.post_id || update.channel_id}
                className="group hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/centre/${update.channel_id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={coverImage}
                      alt={channelName}
                      className="h-12 w-12 rounded-full object-cover bg-slate-100"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {channelName}
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

                  {update.description ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                      {update.description}
                    </p>
                  ) : null}

                  {images.length > 0 ? (
                    <div
                      className={
                        images.length === 1
                          ? "rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
                          : "grid grid-cols-3 gap-2"
                      }
                    >
                      {images.slice(0, images.length === 1 ? 1 : 3).map((url, idx) => (
                        <div
                          key={`${update.post_id || update.channel_id}-img-${idx}`}
                          className={
                            images.length === 1
                              ? "aspect-[4/3]"
                              : "relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                          }
                        >
                          <img
                            src={url}
                            alt="Update"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {update.video_url ? (
                    <a
                      href={update.video_url}
                      onClick={(event) => event.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("view_video", { defaultValue: "View video" })}
                    </a>
                  ) : null}

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {followerCount} {t("followers", { defaultValue: "Followers" })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {createdAt}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
