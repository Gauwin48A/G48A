import e, {
  useState as n,
  useEffect as F,
  useCallback as L,
  useRef as ke,
  useMemo as $e,
} from "react";
import { Link as _e, useNavigate as qe, useLocation as Lr } from "react-router-dom";
import { Button as d } from "@/components/ui/button";
import {
  Card as _,
  CardContent as C,
  CardHeader as ee,
  CardTitle as te,
} from "@/components/ui/card";
import { Badge as z } from "@/components/ui/badge";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import {
  Avatar as Xe,
  AvatarFallback as Ze,
  AvatarImage as Qe,
} from "@/components/ui/avatar";
import { Input as P } from "@/components/ui/input";
import { Label as x } from "@/components/ui/label";
import {
  Shield as se,
  Copy as Re,
  Edit as et,
  Phone as tt,
  Mail as rt,
  MapPin as Ce,
  Calendar as at,
  Camera as st,
  User as B,
  Settings as oe,
  Bell as Pe,
  Lock as ie,
  CreditCard as Se,
  Star as le,
  CheckCircle as ne,
  ChevronRight as K,
  Sparkles as Le,
  Award as ot,
  TrendingUp as it,
  LayoutDashboard as lt,
  Rss as nt,
  XCircle as XCircleIcon,
} from "lucide-react";
import { useToast as mt } from "@/hooks/use-toast";
import { getInitials as gi } from "@/lib/userDisplay";
import "../i18n";
import { useTranslation as ct } from "react-i18next";
import { usePageDensity } from "@/hooks/usePageDensity";
import gt from "../components/LanguageSelector";
import AccountDataActions from "@/components/AccountDataActions";
import { getChannelByUser as ut } from "../lib/api";
import h from "@/services/api";
import { useAuth as pt } from "@/context/AuthContext";
import { useCategoryMode } from "@/context/CategoryModeContext";
import {
  hasAuthSession as ft,
  getUserId as xt,
  isAuthenticated as vt,
} from "@/utils/authStorage";
import { fetchCategoriesCached as bt } from "@/services/categoriesService";
import { fetchUserPreferencesCached, clearUserPreferencesCache } from "@/services/preferencesService";
import {
  hasUserSnapshotChanged as ht,
  mergeProfileIntoAuthUser as yt,
} from "@/lib/profileSync";
import {
  buildActiveAppMatcher as Gt,
  normalizeCategoryText as Pt,
} from "@/utils/categoryModeFilters";
import {
  PageEmptyState as Nt,
  PageErrorState as H,
  PageLoadingState as T,
} from "@/components/page-state/PageStateBlocks";
import { getCurrentLocation as wt } from "@/services/locationService";
import { subscribeSubscriptionUpdated } from "@/utils/appStateEvents";
import { normalizeTrustPayload, isComplaintRiskState } from "@/hooks/useTrustScore";
import { isNativeCameraAvailable, takePhoto, pickFromGallery, dataUrlToFile } from "@/services/nativeCameraService";
import { impactLight } from "@/services/nativeHapticsService";

const PREFERENCE_RADIUS_STORAGE_KEY = "profile_preferences_radius_km";
const DEFAULT_PREFERENCE_RADIUS_KM = "25";
const FORCE_PREMIUM_CENTREPAGE = true;

const ProfilePage = () => {
  const { toast: u } = mt(),
    { t } = ct(),
    tr = (key, fallback, options = {}) =>
      t(key, { defaultValue: fallback, ...options }),
    resolveMessage = L(
      (r, a) => {
        if (!r) return "";
        if (typeof r === "string") return r;
        const o = r?.key ?? a;
        const s = r?.fallback ?? "";
        return o ? tr(o, s || o) : s;
      },
      [tr],
    ),
    { user: y, setUser: E, loading: O, refreshAuth: rr } = pt(),
    {
      activeCategory: categoryModeCategory,
      activeApp,
      hasSelection: hasCategoryMode,
      categories: categoryModeCategories,
    } = useCategoryMode(),
    p = qe(),
    route = Lr(),
    [m, N] = n(null),
    [de, w] = n(null),
    [Be, j] = n(!0),
    [Te, V] = n(!1),
    [f, me] = n({}),
    [A, ce] = n({}),
    [c, I] = n({ location: "", minPrice: "", maxPrice: "", subcategories: [] }),
    [ge, ue] = n([]),
    [J, pe] = n(!1),
    [Ee, Y] = n(null),
    [je, Ae] = n("overview"),
    [sectionCollapse, setSectionCollapse] = n({
      finishProfile: !0,
      quickActions: !1,
    }),
    { density, setDensity } = usePageDensity("mhub_profile_density"),
    [$, Ie] = n({
      postCount: 0,
      rank: "Bronze",
      memberDays: 0,
      successfulSales: 0,
      averageRating: "0.0",
      reviewCount: 0,
      responseRate: null,
      verifiedStatus: !1,
      trustScore: null,
      trustLevel: "",
      trustLabel: "",
      riskState: null,
      underReview: !1,
    }),
    [, setRecentPosts] = n([]),
    [Ue, fe] = n(!0),
    [xe, ve] = n(null),
    [De, q] = n(!0),
    [be, U] = n(null),
    [he, ye] = n(!1),
    [Ne, v] = n(null),
    [preferenceLocationSearch, setPreferenceLocationSearch] = n(""),
    [preferenceRadiusKm, setPreferenceRadiusKm] = n(() => {
      if (typeof window === "undefined") return DEFAULT_PREFERENCE_RADIUS_KM;
      try {
        return (
          localStorage.getItem(PREFERENCE_RADIUS_STORAGE_KEY) ||
          DEFAULT_PREFERENCE_RADIUS_KM
        );
      } catch {
        return DEFAULT_PREFERENCE_RADIUS_KM;
      }
    }),
    [detectingPreferenceLocation, setDetectingPreferenceLocation] = n(!1),
    b = ke(0),
    refreshAttemptedRef = ke(!1),
    W = ke(y),
    S = L((r) => {
      const a = r?.id ?? r?.user_id ?? null;
      return a == null || a === "" ? null : String(a);
    }, []),
    Me = xt(y),
    G = $e(() => vt(y), [y, Me]),
    isPremiumPlan = $e(
      () =>
        FORCE_PREMIUM_CENTREPAGE ||
        String(y?.current_plan || y?.tier || "").toLowerCase() === "premium",
      [y],
    ),
    categoryModeCategoryId = $e(() => {
      if (!hasCategoryMode || !categoryModeCategory?.name) return null;
      if (categoryModeCategory?.id) return String(categoryModeCategory.id);
      const normalized = String(categoryModeCategory.name)
        .trim()
        .toLowerCase();
      const match = (Array.isArray(categoryModeCategories)
        ? categoryModeCategories
        : []
      ).find((item) => {
        const name = String(
          item?.name || item?.title || item?.label || item?.category_name || "",
        )
          .trim()
          .toLowerCase();
        return name === normalized;
      });
      const id = match?.category_id || match?.id;
      return id ? String(id) : null;
    }, [
      hasCategoryMode,
      categoryModeCategory?.id,
      categoryModeCategory?.name,
      categoryModeCategories,
    ]);
  const scopedPreferenceAppMatcher = $e(
    () => Gt(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );
  const scopedPreferenceSubcategories = $e(() => {
    const source = Array.isArray(ge) ? ge : [];
    return source.filter((item) => {
      const itemCategoryId =
        item?.category_id != null ? String(item.category_id) : "";
      const itemCategoryName = Pt(item?.category_name || "");
      if (categoryModeCategoryId) {
        return itemCategoryId === String(categoryModeCategoryId);
      }
      if (scopedPreferenceAppMatcher?.activeApp) {
        if (
          itemCategoryId &&
          scopedPreferenceAppMatcher.categoryIds.has(itemCategoryId)
        ) {
          return !0;
        }
        if (
          itemCategoryName &&
          scopedPreferenceAppMatcher.categoryNames.has(itemCategoryName)
        ) {
          return !0;
        }
        return !1;
      }
      return !0;
    });
  }, [categoryModeCategoryId, ge, scopedPreferenceAppMatcher]);
  const scopedPreferenceSelected = $e(() => {
    const selected = Array.isArray(c.subcategories) ? c.subcategories : [];
    if (!(categoryModeCategoryId || scopedPreferenceAppMatcher?.activeApp)) {
      return selected;
    }
    const scopedNames = new Set(
      scopedPreferenceSubcategories.map((item) => Pt(item?.name || "")),
    );
    return selected.filter((item) => scopedNames.has(Pt(item)));
  }, [
    c.subcategories,
    categoryModeCategoryId,
    scopedPreferenceAppMatcher?.activeApp,
    scopedPreferenceSubcategories,
  ]);
  const profileErrorMessage = $e(() => resolveMessage(de), [resolveMessage, de]);
  const centreChannelId = $e(() => {
    const channel = Ee?.channel || Ee || null;
    return (
      channel?.channel_id ||
      channel?.id ||
      channel?.channelId ||
      null
    );
  }, [Ee]);
  const categoriesErrorMessage = $e(
    () => resolveMessage(xe),
    [resolveMessage, xe],
  );
  const preferencesErrorMessage = $e(
    () => resolveMessage(be),
    [resolveMessage, be],
  );
  const contactsErrorMessage = $e(
    () => resolveMessage(Ne),
    [resolveMessage, Ne],
  );
  F(() => {
    W.current = y;
  }, [y]);
  F(() => {
    refreshAttemptedRef.current = !1;
  }, [y]);
  F(() => {
    document.title = "MHub - Profile";
    return () => {
      document.title = "MHub";
    };
  }, []);
  F(() => {
    const params = new URLSearchParams(route.search || "");
    const tab = params.get("tab");
    if (
      tab &&
      (tab === "overview" ||
        tab === "personal" ||
        tab === "preferences" ||
        tab === "settings")
    ) {
      Ae(tab);
    }
    if (params.get("edit") === "1") {
      Ae("personal");
      V(!0);
      return;
    }
    if (!tab || tab === "overview") {
      requestAnimationFrame(() => {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "auto" });
        }
      });
    }
  }, [route.search]);
  const X = L(async () => {
    const r = b.current + 1;
    b.current = r;
    const a = localStorage.getItem("userProfile");
    if (a)
      try {
        N(JSON.parse(a));
      } catch {}
    if ((j(!0), w(null), !ft() && !G)) {
      r === b.current &&
        (w({
          key: "profile_login_required",
          fallback: "You must be logged in to view your profile.",
        }),
        j(!1));
      return;
    }
    try {
        const s = await h.get("/profile", { skipActiveAppFilter: true });
      if (r !== b.current) return;
      if (s && typeof s == "object" && !s.error) {
        const l = S(s);
        l && localStorage.setItem("userId", l);
        const g = yt(W.current, s, S);
          localStorage.setItem("userProfile", JSON.stringify(s)),
          localStorage.setItem("user", JSON.stringify(g)),
          N(g),
          ht(W.current, g) && typeof E === "function" && E(g),
          me({
            full_name: s.full_name || s.name || "",
            phone: s.phone || "",
            address: s.address || "",
            avatar_url: s.avatar_url || "",
            bio: s.bio || "",
          });
      }
    } catch (s) {
      if (r !== b.current) return;
      if (import.meta.env.DEV) console.error("Profile fetch error:", s);
      const l = s?.status || s?.response?.status;
      if ((l === 401 || l === 403) && rr && !refreshAttemptedRef.current) {
        refreshAttemptedRef.current = !0;
        try {
          const g = await rr();
          if (g) return X();
        } catch {}
      }
      if (l === 401 || l === 403) {
        N(null),
          w(null),
          p("/login", { replace: !0, state: { returnTo: "/profile" } });
        return;
      }
      l >= 500
        ? w({
            key: "profile_temporarily_unavailable",
            fallback:
              "Profile is temporarily unavailable. Please retry in a moment.",
          })
        : w({
            key: "profile_unavailable_desc",
            fallback: "We could not load your profile right now. Please retry.",
          });
    } finally {
      r === b.current && j(!1);
    }
  }, [p, S, E, G]);
  F(() => {
    if (!O) {
      if (!G) {
        j(!1), w(null), N(null);
        return;
      }
      return (
        X(),
        () => {
          b.current += 1;
        }
      );
    }
  }, [O, G, X]);
  const k = L(async ({ force: r = !1, guard: a = () => !0 } = {}) => {
    fe(!0), ve(null);
    try {
      const o = await bt({ force: r, includeSubcategories: !0 });
      if (!a()) return;
      ue(
        (Array.isArray(o) ? o : [])
          .flatMap((s) =>
            (Array.isArray(s?.subcategories) ? s.subcategories : []).map((l) => ({
              ...l,
              category_id: l?.category_id || s?.category_id || s?.id || null,
              category_name: l?.category_name || s?.name || "",
            })),
          )
          .sort((s, l) => {
            const categoryDiff = String(s?.category_name || "").localeCompare(
              String(l?.category_name || ""),
              void 0,
              { sensitivity: "base" },
            );
            if (categoryDiff !== 0) return categoryDiff;
            return String(s?.name || "").localeCompare(String(l?.name || ""), void 0, {
              sensitivity: "base",
            });
          }),
      );
    } catch {
      if (!a()) return;
      ue([]),
        ve({
          key: "profile_subcategories_unavailable",
          fallback:
            "Subcategory preferences are temporarily unavailable. Please retry.",
        });
    } finally {
      a() && fe(!1);
    }
  }, []);
  F(() => {
    let r = !0;
    return (
      k({ guard: () => r }),
      () => {
        r = !1;
      }
    );
  }, [k]);
  const Z = L(
    async ({ guard: r = () => !0 } = {}) => {
      const a = S(m);
      if (!a) {
        r() && (q(!1), U(null), Y(null));
        return;
      }
      const hasToken = Boolean(ft());
      const canFetchProtectedStats = hasToken;
      r() && (q(!0), U(null));
      const hasProfileTrust = Boolean(
        m?.trust ||
          m?.trust_score ||
          m?.trustScore ||
          m?.risk_state ||
          m?.under_review,
      );
      const trustRequest = hasProfileTrust
        ? Promise.resolve(null)
        : h.get(`/posts/trust/${a}`, { skipActiveAppFilter: true });
      const [o, s, l, g, M, trustResult] = await Promise.allSettled([
        hasToken
          ? fetchUserPreferencesCached({ userId: a })
          : Promise.resolve(null),
        hasToken ? ut(a) : Promise.resolve(null),
        h.get("/posts/mine", {
          params: {
            userId: a,
            limit: 4,
            page: 1,
            sortBy: "updated_at",
            sortOrder: "desc",
          },
          skipActiveAppFilter: true,
        }),
        canFetchProtectedStats
          ? h.get(`/rewards/user/${a}`, { skipActiveAppFilter: true })
          : Promise.resolve(null),
        canFetchProtectedStats
          ? h.get(`/reviews/user/${a}`, { skipActiveAppFilter: true })
          : Promise.resolve(null),
        trustRequest,
      ]);
      if (!r()) return;
      if (o.status === "fulfilled" && o.value) {
        const preferenceData = o.value;
        I({
          location: preferenceData.location ?? "",
          minPrice: preferenceData.minPrice ?? preferenceData.min_price ?? "",
          maxPrice: preferenceData.maxPrice ?? preferenceData.max_price ?? "",
          subcategories: Array.isArray(preferenceData.subcategories)
            ? preferenceData.subcategories
            : Array.isArray(preferenceData.categories)
              ? preferenceData.categories
              : [],
        });
        setPreferenceLocationSearch(preferenceData.location ?? "");
      } else if (hasToken)
        U({
          key: "profile_recommendation_unavailable",
          fallback:
            "Recommendation preferences are temporarily unavailable. Please retry.",
        });
      else U(null);
      s.status === "fulfilled" ? Y(s.value || null) : Y(null);
      const R = l.status === "fulfilled" ? l.value : { total: 0, posts: [] },
        Oe = g.status === "fulfilled" ? g.value?.user ?? g.value ?? { rank: "Bronze" } : { rank: "Bronze" },
        reviewsPayload =
          M.status === "fulfilled" ? M.value?.stats || {} : {},
        trustPayloadFromProfile = normalizeTrustPayload(
          m?.trust ||
            ((m?.trustScore || m?.trustLevel || m?.trustLabel || m?.risk_state || m?.under_review)
              ? {
                  score: m?.trustScore ?? m?.trust_score ?? m?.score,
                  level: m?.trustLevel ?? m?.level,
                  label: m?.trustLabel ?? m?.label,
                  risk_state: m?.risk_state,
                  under_review: m?.under_review,
                }
              : null),
        ),
        trustPayloadFromRewards = normalizeTrustPayload(
          Oe?.trust ||
            ((Oe?.trustScore || Oe?.trustLevel || Oe?.trustLabel || Oe?.risk_state || Oe?.under_review)
              ? {
                  score: Oe?.trustScore ?? Oe?.trust_score ?? Oe?.score,
                  level: Oe?.trustLevel ?? Oe?.level,
                  label: Oe?.trustLabel ?? Oe?.label,
                  risk_state: Oe?.risk_state,
                  under_review: Oe?.under_review,
                }
              : null),
        ),
        trustPayloadFromApi =
          trustResult.status === "fulfilled"
            ? normalizeTrustPayload(trustResult.value)
            : null,
        resolvedTrustPayload =
          trustPayloadFromProfile || trustPayloadFromRewards || trustPayloadFromApi,
        recentPostsList = Array.isArray(R?.posts) ? R.posts : [],
        Ve = R?.total || recentPostsList.length,
        Je = Oe?.rank || Oe?.tier || "Bronze",
        trustScoreValue = Number.isFinite(Number(resolvedTrustPayload?.score))
          ? Math.round(Number(resolvedTrustPayload?.score))
          : null,
        trustLevelValue = String(resolvedTrustPayload?.level || "").trim().toLowerCase(),
        trustLabelValue = String(resolvedTrustPayload?.label || "").trim(),
        riskStateValue = resolvedTrustPayload?.riskState || null,
        underReviewValue =
          resolvedTrustPayload?.underReview ??
          (riskStateValue ? isComplaintRiskState(riskStateValue) : !1),
        averageRatingValue = Number(
          reviewsPayload?.averageRating ?? m?.rating ?? 0,
        ),
        reviewCount = Number(reviewsPayload?.totalReviews || 0),
        responseRateValue = Number(
          Oe?.responseRate ??
            Oe?.response_rate ??
            m?.responseRate ??
            m?.response_rate ??
            Number.NaN,
        ),
        successfulSales = Number(Oe?.activityStats?.salesCount || 0),
        Ye = m?.created_at
          ? Math.floor(
              (Date.now() - new Date(m.created_at).getTime()) /
                (1e3 * 60 * 60 * 24),
            )
          : 0;
      setRecentPosts(recentPostsList),
        Ie({
          postCount: Ve,
          rank: Je,
          memberDays: Ye,
          successfulSales: successfulSales,
          averageRating: Number.isFinite(averageRatingValue)
            ? averageRatingValue.toFixed(1)
            : "0.0",
          reviewCount: reviewCount,
          responseRate: Number.isFinite(responseRateValue)
            ? responseRateValue
            : null,
          verifiedStatus: Boolean(
            m?.verified ?? m?.kyc_verified ?? m?.kycVerified,
          ),
          trustScore: trustScoreValue,
          trustLevel: trustLevelValue,
          trustLabel: trustLabelValue,
          riskState: riskStateValue,
          underReview: Boolean(underReviewValue),
        }),
        q(!1);
    },
    [S, m, categoryModeCategoryId, activeApp],
  );
  F(() => {
    let r = !0;
    return (
      Z({ guard: () => r }),
      () => {
        r = !1;
      }
    );
  }, [Z]);
  F(() => subscribeSubscriptionUpdated(() => {
    Z();
  }), [Z]);
  F(() => {
    setPreferenceLocationSearch(c.location || "");
  }, [c.location]);
  F(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PREFERENCE_RADIUS_STORAGE_KEY, preferenceRadiusKm);
    } catch {}
  }, [preferenceRadiusKm]);
  const D = (r) => {
      const { name: a, value: o } = r.target;
      me((s) => ({ ...s, [a]: o }));
    },
    Q = (r) => {
      const { name: a, value: o } = r.target;
      I((s) => ({ ...s, [a]: o }));
    },
    Fe = () => {
      Z(), k({ force: !0 });
    },
    we = L(async () => {
      const r = m?.user_id || m?.id;
      if (!r) {
        v({
          key: "profile_data_unavailable",
          fallback:
            "Profile data is unavailable. Reload your profile and try again.",
        });
        return;
      }
      ye(!0),
        v(null),
        u({
          title: t("syncing_contacts_title") || "Syncing Contacts...",
          description:
            t("syncing_contacts_desc") || "Please allow access if prompted.",
        });
      try {
        const { syncNativeContacts: a } = await import(
            "../services/mobileContacts"
          ),
          o = await a(r);
        if (o?.skipped) {
          if (o.reason === "web-platform") {
            v({
              key: "contacts_sync_native_only",
              fallback: "Contact sync is available in the native app.",
            });
            return;
          }
          if (o.reason === "permission-denied") {
            v({
              key: "contacts_permission_required",
              fallback: "Contacts permission is required to continue.",
            });
            return;
          }
          v({
            key: "contacts_sync_none_found",
            fallback: "No syncable contacts were found. Please retry later.",
          });
          return;
        }
        u({
          title: t("sync_complete_title") || "Sync Complete",
          description:
            t("sync_complete_desc") || "Your contacts have been processed.",
        });
      } catch (a) {
        if (import.meta.env.DEV) console.error("[Profile] Contact sync failed:", a),
          v({
            key: "contacts_sync_failed",
            fallback: "Unable to sync contacts right now. Please retry.",
          });
      } finally {
        ye(!1);
      }
    }, [u, m?.id, m?.user_id]),
    ze = () => {
      const r = {};
      return (
        (!f.full_name || f.full_name.length < 2) &&
          (r.full_name =
            t("profile_name_min_chars") ||
            "Name must be at least 2 characters"),
        f.phone &&
          !/^[6-9][0-9]{9}$/.test(f.phone) &&
          (r.phone = tr("invalid_phone_number", "Invalid phone number")),
        r
      );
    },
    Ke = async (r) => {
      r.preventDefault();
      const a = ze();
      if ((ce(a), !(Object.keys(a).length > 0)))
        try {
          const o = await h.post("/profile/update", { ...f });
          N((s) => {
            const l = {
              ...s,
              ...o,
              name: o?.name ?? o?.full_name ?? s?.name ?? s?.full_name ?? "",
            };
            return (
              localStorage.setItem("userProfile", JSON.stringify(l)),
              localStorage.setItem("user", JSON.stringify(l)),
              E(l),
              l
            );
          }),
            V(!1),
            u({
              title:
                t("profile_updated_successfully") ||
                "Profile updated successfully!",
            });
        } catch (o) {
          ce({ form: tr("update_failed", "Update failed") });
        }
    },
    applyPreferenceLocation = (r) => {
      setPreferenceLocationSearch(r);
      I((a) => ({ ...a, location: r }));
    },
    detectCurrentPreferenceLocation = async () => {
      setDetectingPreferenceLocation(!0);
      try {
        const r = await wt({ targetAccuracy: 250 });
        const a =
          r?.displayName ||
          r?.area ||
          r?.locality ||
          r?.city ||
          r?.address?.city ||
          "";
        if (!a) throw new Error("Location unavailable");
        applyPreferenceLocation(a);
        u({
          title: tr("location_updated", "Location updated"),
          description: tr(
            "location_updated_desc",
            "Your current area has been added to personalization.",
          ),
        });
      } catch (r) {
        u({
          title: tr("location_unavailable", "Location unavailable"),
          description:
            r?.response?.data?.error ||
            tr(
              "location_unavailable_desc",
              "We could not detect your location right now.",
            ),
          variant: "destructive",
        });
      } finally {
        setDetectingPreferenceLocation(!1);
      }
    },
    He = async (r) => {
      r.preventDefault();
      try {
        const a = await h.post("/profile/preferences/update", { ...c });
        if (Me) {
          clearUserPreferencesCache(Me);
        }
        I({
          location: a.location ?? "",
          minPrice: a.min_price ?? a.minPrice ?? "",
          maxPrice: a.max_price ?? a.maxPrice ?? "",
          subcategories: Array.isArray(a.subcategories)
            ? a.subcategories
            : Array.isArray(a.categories)
              ? a.categories
              : [],
        }),
          setPreferenceLocationSearch(a.location ?? ""),
          pe(!1),
          u({
            title: t("preferences_saved_title") || "Preferences saved!",
            description:
              t("preferences_saved_desc") ||
              "Your recommendations will now be personalized.",
          });
      } catch (a) {
        u({
          title: t("error_saving_preferences") || "Error saving preferences",
          description: t("error_saving_preferences_desc") || "Failed to save preferences. Please try again.",
          variant: "destructive",
        });
      }
    };
  if (O)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center mhub-premium-page",
      },
      e.createElement(
        "div",
        { className: "w-full max-w-md px-4 page-shell page-pad" },
        e.createElement(T, {
          title: t("loading") || "Loading...",
          description:
            t("profile_auth_loading_desc") || "Checking your account session.",
          marker: "loading",
        }),
      ),
    );
  if (!G)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:from-[#0b1220] dark:via-[#1b2542] dark:to-[#0b1220] dark:bg-gradient-to-br",
      },
      e.createElement(
        "div",
        { className: "pt-10 pb-6 px-6 text-center dark:text-center" },
        e.createElement(
          "div",
          {
            className:
              "w-24 h-24 mx-auto mb-3 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl dark:bg-gradient-to-br",
          },
          e.createElement(B, { className: "w-12 h-12 text-white dark:text-white" }),
        ),
        e.createElement(
          "h1",
          { className: "text-4xl font-bold text-white mb-3 dark:text-white" },
          t("profile") || "Profile",
        ),
        e.createElement(
          "p",
          { className: "text-white/80 text-lg max-w-md mx-auto dark:text-white/80" },
          t("profile_desc") || "Manage your account, preferences, and settings",
        ),
      ),
      e.createElement(
        "div",
        { className: "max-w-lg mx-auto px-6 space-y-4 page-shell page-pad" },
        e.createElement(
          _e,
          {
            to: "/login?returnTo=%2Fprofile",
            className:
              "block mhub-premium-surface rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300",
          },
          e.createElement(
            "div",
            { className: "flex items-center gap-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg dark:bg-gradient-to-br",
              },
              e.createElement(ne, { className: "w-7 h-7 text-white dark:text-white" }),
            ),
            e.createElement(
              "div",
              { className: "flex-1" },
              e.createElement(
                "h3",
                { className: "text-xl font-bold text-slate-900 dark:text-slate-100" },
                t("login") || "Login",
              ),
              e.createElement(
                "p",
                { className: "text-slate-600 dark:text-slate-300 text-sm dark:text-slate-200" },
                t("login_desc") || "Already have an account? Sign in here",
              ),
            ),
            e.createElement(K, { className: "w-6 h-6 text-slate-300 dark:text-slate-300" }),
          ),
        ),
        e.createElement(
          _e,
          {
            to: "/signup?returnTo=%2Fprofile",
            className:
              "block mhub-premium-surface backdrop-blur-xl rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300",
          },
          e.createElement(
            "div",
            { className: "flex items-center gap-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg dark:bg-gradient-to-br",
              },
              e.createElement(Le, { className: "w-7 h-7 text-white dark:text-white" }),
            ),
            e.createElement(
              "div",
              { className: "flex-1" },
              e.createElement(
                "h3",
                { className: "text-xl font-bold text-white dark:text-white" },
                t("signup") || "Create Account",
              ),
              e.createElement(
                "p",
                { className: "text-white/70 text-sm dark:text-white/70" },
                t("signup_desc") || "New user? Join us in just a few steps",
              ),
            ),
            e.createElement(K, { className: "w-6 h-6 text-white/60 dark:text-white/60" }),
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "max-w-lg mx-auto px-6 mt-3 page-shell page-pad" },
        e.createElement(
          "p",
          { className: "text-center text-white/60 text-sm mb-3 dark:text-center dark:text-white/60" },
          t("features") || "Features you unlock with an account",
        ),
        e.createElement(
          "div",
          { className: "grid grid-cols-3 gap-4" },
          [
            { icon: le, label: t("wishlist") || "Wishlist" },
            { icon: Pe, label: t("alerts") || "Alerts" },
            { icon: oe, label: t("settings") || "Settings" },
          ].map((r, a) =>
            e.createElement(
              "div",
              { key: a, className: "bg-white/10 rounded-xl p-4 text-center dark:bg-slate-900/10 dark:text-center" },
              e.createElement(r.icon, {
                className: "w-6 h-6 mx-auto mb-2 text-white/80 dark:text-white/80",
              }),
              e.createElement(
                "p",
                { className: "text-white/80 text-xs font-medium dark:text-white/80" },
                r.label,
              ),
            ),
        ),
      ),
    ));
  if (Be)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center mhub-premium-page",
      },
      e.createElement(
        "div",
        { className: "w-full max-w-md px-4 page-shell page-pad" },
        e.createElement(T, {
          title: t("loading_profile") || "Loading profile...",
          description:
            t("profile_loading_desc") || "Fetching your profile details.",
          marker: "loading",
        }),
      ),
    );
  if (profileErrorMessage || !m)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center mhub-premium-page",
      },
      e.createElement(
        "div",
        { className: "w-full max-w-md px-4 page-shell page-pad" },
        e.createElement(H, {
          title: t("profile_not_found") || "Profile not found",
          description:
            profileErrorMessage ||
            t("profile_unavailable_desc") ||
            "We could not load your profile right now. Please retry.",
          onRetry: X,
          retryLabel: t("retry") || "Retry",
          marker: "error",
        }),
      ),
    );
  const i = m;
  const emailVerified = !!(
    i?.email_verified ??
    i?.is_email_verified ??
    i?.emailVerified
  );
  const phoneVerified = !!(
    i?.phone_verified ??
    i?.is_phone_verified ??
    i?.phoneVerified
  );
  const kycVerified = !!(i?.kyc_verified ?? i?.kycVerified ?? i?.verified);
  const emailDisplay = i?.email
    ? String(i.email)
    : tr("email_missing_prompt", "Add your email");
  const emailMuted = !i?.email;
  const totalListings = Number($.postCount ?? 0);
  const listingCountValue = Number.isFinite(totalListings) ? totalListings : 0;
  const memberSinceLabel =
    $.memberDays > 0
      ? tr("member_since_days", "{{count}} days", { count: $.memberDays })
      : tr("new_member", "New member");
  const profileTabClass = (tab) =>
    "rewards-tab-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 " +
    (je === tab
      ? "active border-transparent bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 text-white shadow-md ring-1 ring-white/30"
      : "border-[var(--chip-border)] bg-[var(--chip-bg)] text-slate-600 hover:bg-[var(--surface-2)] hover:border-indigo-200 hover:text-slate-900 dark:text-slate-200");
  const toggleSection = (key) =>
    setSectionCollapse((r) => ({
      ...r,
      [key]: !r[key],
    }));
  const editProfileDetails = () => {
    Ae("personal");
    V(!0);
  };

  // Native camera avatar upload helper
  const handleNativeAvatarUpload = async (source = "gallery") => {
    impactLight();
    try {
      const photo = source === "camera" ? await takePhoto() : await pickFromGallery();
      if (!photo?.dataUrl) return;
      const file = dataUrlToFile(photo.dataUrl, `avatar.${photo.format || "jpg"}`);
      const formData = new FormData();
      formData.append("avatar", file);
      const s = await h.post("/profile/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (s?.avatar_url) {
        N((l) => {
          const g = { ...l, avatar_url: s.avatar_url };
          localStorage.setItem("userProfile", JSON.stringify(g));
          localStorage.setItem("user", JSON.stringify(g));
          typeof E === "function" && E(g);
          return g;
        });
        u({ title: t("profile_picture_updated") || "Profile picture updated!" });
      } else {
        u({ title: t("upload_failed") || "Upload failed", variant: "destructive" });
      }
    } catch (err) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("User cancelled")) return;
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        u({ title: t("login_required") || "Please login to upload.", variant: "destructive" });
        return;
      }
      u({ title: t("upload_error") || "Upload error", variant: "destructive" });
    }
  };

  const triggerAvatarUpload = () => {
    if (isNativeCameraAvailable()) {
      handleNativeAvatarUpload("gallery");
    } else {
      document.getElementById("avatar-upload")?.click();
    }
  };
  const profileChecklistItems = [
    {
      key: "email",
      label: tr("verify_email", "Verify email"),
      description: emailVerified
        ? tr("email_verified_ready", "Email trust signal is already active.")
        : i?.email
          ? tr("verify_email_desc", "Verify your email to strengthen account trust.")
          : tr("add_email_desc", "Add an email so buyers can recognize your account."),
      done: emailVerified,
      actionLabel: i?.email
        ? tr("verify_now", "Verify now")
        : tr("add_email", "Add email"),
      onClick: i?.email ? () => p("/verification") : editProfileDetails,
    },
    {
      key: "phone",
      label: tr("verify_phone", "Verify phone"),
      description: phoneVerified
        ? tr("phone_verified_ready", "Phone trust signal is already active.")
        : i?.phone
          ? tr("verify_phone_desc", "Verify your phone for stronger buyer confidence.")
          : tr("add_phone_desc", "Add a phone number to help buyers trust your profile."),
      done: phoneVerified,
      actionLabel: i?.phone
        ? tr("verify_now", "Verify now")
        : tr("add_phone", "Add phone"),
      onClick: i?.phone ? () => p("/verification") : editProfileDetails,
    },
    {
      key: "kyc",
      label: tr("kyc", "KYC"),
      description: kycVerified
        ? tr("kyc_verified_ready", "KYC is complete and visible on your profile.")
        : tr("kyc_verify_desc", "Finish KYC to unlock the strongest trust badge."),
      done: kycVerified,
      actionLabel: tr("verify_now", "Verify now"),
      onClick: () => p("/verification"),
    },
    {
      key: "avatar",
      label: tr("profile_photo", "Profile photo"),
      description: i?.avatar_url
        ? tr("profile_photo_ready", "Your profile photo is already helping recognition.")
        : tr("profile_photo_desc", "Add a profile photo so buyers recognize you faster."),
      done: Boolean(i?.avatar_url),
      actionLabel: tr("add_photo", "Add photo"),
      onClick: triggerAvatarUpload,
    },
    {
      key: "bio",
      label: tr("bio", "Bio"),
      description: i?.bio
        ? tr("bio_ready", "Your bio helps explain what kind of seller you are.")
        : tr("bio_desc", "Add a short bio so buyers know what to expect from you."),
      done: Boolean(String(i?.bio || "").trim()),
      actionLabel: tr("add_bio", "Add bio"),
      onClick: editProfileDetails,
    },
  ];
  const profileChecklistDoneCount = profileChecklistItems.filter((r) => r.done).length;
  const profileChecklistTotal = profileChecklistItems.length;
  const profileCompletionPercent = profileChecklistTotal
    ? Math.round((profileChecklistDoneCount / profileChecklistTotal) * 100)
    : 0;
  const nextProfileAction = profileChecklistItems.find((r) => !r.done) || null;
  const profileCompletionHint = nextProfileAction
    ? tr("finish_profile_hint", "Finish a few details to unlock more trust.")
    : tr("profile_all_set", "Everything important is already filled in.");
  const profileDisplayName = i?.name || i?.full_name || tr("profile", "Profile");
  const trustScore = Number.isFinite(Number($?.trustScore))
    ? Number($?.trustScore)
    : null;
  const trustLevel =
    String($?.trustLevel || "").trim().toLowerCase() ||
    (trustScore !== null
      ? trustScore >= 70
        ? "verified"
        : trustScore >= 40
          ? "new"
          : "risky"
      : "");
  const trustLabel =
    (String($?.trustLabel || "").trim() ||
      (trustScore !== null
        ? trustScore >= 70
          ? tr("verified_seller", "Verified Seller")
          : trustScore >= 40
            ? tr("new_seller", "New Seller")
            : tr("risky_seller", "Risky Seller")
        : "")) || "";
  const trustBadgeClass =
    trustLevel === "verified"
      ? "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-emerald-500/20 text-emerald-50 border border-emerald-200/40"
      : trustLevel === "risky"
        ? "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-rose-500/20 text-rose-50 border border-rose-200/40"
        : trustLevel
          ? "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-amber-500/20 text-amber-50 border border-amber-200/40"
          : "";
  const profileRiskState = $?.riskState || $?.risk_state || null;
  const profileFrozen = profileRiskState?.status === "frozen";
  const profileUnderReview =
    $?.underReview ??
    (profileRiskState ? isComplaintRiskState(profileRiskState) : !1);
  const planNameRaw = String(i?.current_plan || i?.tier || "basic")
    .trim()
    .toLowerCase();
  const currentPlanLabel = planNameRaw
    ? planNameRaw.charAt(0).toUpperCase() + planNameRaw.slice(1)
    : tr("basic_plan", "Basic");
  const subscriptionExpiryLabel = (() => {
    if (!i?.subscription_expiry) return tr("not_available", "Not available");
    const r = new Date(i.subscription_expiry);
    return Number.isNaN(r.getTime())
      ? tr("not_available", "Not available")
      : r.toLocaleDateString();
  })();
  const profileUpdatedLabel = (() => {
    if (!i?.updated_at) return tr("not_available", "Not available");
    const r = new Date(i.updated_at);
    return Number.isNaN(r.getTime())
      ? tr("not_available", "Not available")
      : r.toLocaleDateString();
  })();
  const suggestedLocations = (() => {
    const base = [
      c.location,
      preferenceLocationSearch,
      categoryModeCategory?.name ? `${categoryModeCategory.name} hub` : "",
      "Delhi",
      "Mumbai",
      "Bangalore",
      "Chennai",
      "Kolkata",
      "Hyderabad",
      "Pune",
      "Ahmedabad",
      "Jaipur",
    ]
      .filter(Boolean)
      .map((r) => String(r).trim());
    const unique = [...new Set(base)];
    const query = String(preferenceLocationSearch || "").trim().toLowerCase();
    if (!query) return unique.slice(0, 6);
    return unique
      .filter((r) => r.toLowerCase().includes(query))
      .slice(0, 6);
  })();
  const personalizationPreviewLines = [
    c.location
      ? tr("preview_location", "Prioritize listings near {{value}} within {{count}} km.", {
          value: c.location,
          count: preferenceRadiusKm,
        })
      : tr("preview_location_any", "Show listings from any location until you choose one."),
    scopedPreferenceSelected?.length
      ? tr("preview_subcategories", "Push {{count}} preferred subcategories higher in your feed.", {
          count: scopedPreferenceSelected.length,
        })
      : tr("preview_subcategories_any", "Use all subcategories until you save preferences."),
    tr("preview_budget", "Balance results between \u20B9{{min}} and \u20B9{{max}}.", {
      min: c.minPrice || 0,
      max: c.maxPrice || "100000",
    }),
  ];
  const budgetMinValue = Number.isFinite(Number(c.minPrice))
    ? Number(c.minPrice)
    : 0;
  const budgetMaxValue = Number.isFinite(Number(c.maxPrice))
    ? Number(c.maxPrice)
    : 100000;
  const formatCurrency = (value) =>
    `\u20B9${Number(value).toLocaleString("en-IN")}`;
  const budgetLabel = `${formatCurrency(budgetMinValue)} - ${formatCurrency(
    budgetMaxValue,
  )}`;
  const preferencesSnapshotItems = [
    {
      key: "location",
      icon: Ce,
      label: tr("location", "Location"),
      value: c.location || tr("not_set", "Not set"),
    },
    {
      key: "radius",
      icon: it,
      label: tr("radius", "Radius"),
      value: `${preferenceRadiusKm || DEFAULT_PREFERENCE_RADIUS_KM} km`,
    },
    {
      key: "budget",
      icon: Se,
      label: tr("budget", "Budget"),
      value: budgetLabel,
    },
  ];
  const marketplacePulseItems = [
    {
      key: "listings",
      icon: lt,
      label: tr("listings", "Listings"),
      value: listingCountValue,
    },
    {
      key: "rating",
      icon: le,
      label: tr("rating", "Rating"),
      value: $.averageRating,
    },
    {
      key: "reviews",
      icon: ot,
      label: tr("reviews", "Reviews"),
      value: $.reviewCount,
    },
    {
      key: "response_rate",
      icon: Pe,
      label: tr("response_rate", "Response rate"),
      value:
        $.responseRate === null
          ? tr("tracking_soon", "Tracking soon")
          : tr("response_rate_value", "{{count}}%", {
              count: Math.round($.responseRate),
            }),
    },
  ];
  return e.createElement(
    "div",
    {
      className:
        `profile-surface min-h-screen mhub-premium-page pb-32 sm:pb-36 page-fade-in ${density === "compact" ? "mhub-compact" : ""}`,
      style: { "--top-nav-height": "0px" },
    },
    e.createElement(
      "div",
      { className: "relative overflow-hidden" },
      e.createElement("div", {
        className: "absolute inset-0 profile-hero-bg",
      }),
      e.createElement("div", {
        className: "absolute inset-0 opacity-10",
        style: {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        },
      }),
      e.createElement(
        "div",
        {
          className:
            "relative max-w-6xl mx-auto px-4 py-2 sm:px-6 sm:py-2",
        },
        e.createElement(
          "div",
          { className: "mb-1.5 max-w-2xl text-left text-white dark:text-left dark:text-white" },
          e.createElement(
            "p",
            {
              className:
                "text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 mb-1 dark:text-white/70",
            },
            tr("profile_banner_label", "Your profile"),
          ),
          e.createElement(
            "h1",
            {
              className:
                "text-lg sm:text-xl md:text-2xl font-bold text-white dark:text-white",
            },
            tr("profile_dashboard_title", "Your profile dashboard"),
          ),
          e.createElement(
            "p",
            { className: "text-sm sm:text-base text-white/80 mt-1 dark:text-white/80" },
            tr(
              "profile_dashboard_subtitle",
              "Manage your account, preferences, and settings",
            ),
          ),
        ),
        e.createElement(
          "div",
          {
            className:
              "rewards-hero-card rounded-2xl p-2 sm:p-3 text-white page-fade-in page-fade-in-delay-1 dark:text-white",
          },
          e.createElement(
            "div",
            {
              className:
                "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-start gap-3",
            },
            e.createElement(
              "div",
              {
                className:
                  "flex flex-col sm:flex-row items-center sm:items-start gap-3",
              },
              e.createElement(
                "div",
                {
                  className: "profile-avatar-ring relative group shrink-0",
                  style: {
                    "--ring-offset": `${283 - Math.round((profileCompletionPercent / 100) * 283)}`,
                  },
                },
                e.createElement(
                  "svg",
                  {
                    className:
                      "ring-svg w-[72px] h-[72px] sm:w-[88px] sm:h-[88px]",
                    viewBox: "0 0 96 96",
                    "aria-hidden": "true",
                  },
                  e.createElement("circle", {
                    className: "ring-track",
                    cx: "48",
                    cy: "48",
                    r: "45",
                  }),
                  e.createElement("circle", {
                    className: "ring-fill",
                    cx: "48",
                    cy: "48",
                    r: "45",
                  }),
                ),
                e.createElement(
                  Xe,
                  {
                    className:
                      "h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-white/50 shadow-2xl",
                  },
                  i.avatar_url
                    ? e.createElement(Qe, { src: i.avatar_url })
                    : e.createElement(
                        Ze,
                        {
                          className:
                            "text-3xl font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 dark:text-white dark:bg-gradient-to-br",
                        },
                        gi(i?.name || i?.full_name, "U"),
                      ),
                ),
                e.createElement("input", {
                  type: "file",
                  id: "avatar-upload",
                  accept: "image/*",
                  className: "hidden",
                  onChange: async (r) => {
                    const a = r.target.files?.[0];
                    if (!a) return;
                    const o = new FormData();
                    o.append("avatar", a);
                    try {
                      const s = await h.post("/profile/upload-avatar", o, {
                        headers: { "Content-Type": "multipart/form-data" },
                      });
                      s?.avatar_url
                        ? (N((l) => {
                            const g = { ...l, avatar_url: s.avatar_url };
                            return (
                              localStorage.setItem(
                                "userProfile",
                                JSON.stringify(g),
                              ),
                              localStorage.setItem("user", JSON.stringify(g)),
                              typeof E === "function" && E(g),
                              g
                            );
                          }),
                          u({
                            title:
                              t("profile_picture_updated") ||
                              "Profile picture updated!",
                          }))
                        : u({
                            title: t("upload_failed") || "Upload failed",
                            variant: "destructive",
                          });
                    } catch (err) {
                      const status = err?.response?.status;
                      if (status === 401 || status === 403) {
                        u({
                          title:
                            t("login_required") || "Please login to upload.",
                          variant: "destructive",
                        });
                        return;
                      }
                      const backendMessage =
                        err?.response?.data?.error ||
                        err?.response?.data?.message ||
                        "";
                      u({
                        title: t("upload_error") || "Upload error",
                        description: backendMessage || undefined,
                        variant: "destructive",
                      });
                    } finally {
                      if (r?.target) {
                        r.target.value = "";
                      }
                    }
                  },
                }),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () =>
                      triggerAvatarUpload(),
                    className:
                      "absolute -bottom-1 -right-1 w-7 h-7 bg-white/95 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition ring-2 ring-white/60 group-hover:bg-blue-50 dark:bg-slate-900/95 dark:group-hover:bg-blue-950/20",
                    "aria-label":
                      t("change_profile_photo") || "Change profile photo",
                  },
                  e.createElement(st, { className: "w-4 h-4 text-blue-600 dark:text-blue-300" }),
                ),
              ),
              e.createElement(
                "div",
                { className: "text-center sm:text-left min-w-0 dark:text-center dark:sm:text-left" },
                e.createElement(
                  "h2",
                  {
                    className:
                      "text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight break-words dark:text-white",
                    title: profileDisplayName,
                  },
                  profileDisplayName,
                ),
                e.createElement(
                  "p",
                  {
                    className:
                      emailMuted
                        ? "text-white/70 italic mt-1 truncate max-w-[260px] sm:max-w-md md:max-w-full"
                        : "text-white/85 mt-1 truncate max-w-[260px] sm:max-w-md md:max-w-full",
                    title: i.email || emailDisplay,
                  },
                  emailDisplay,
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2",
                  },
                  e.createElement(
                    z,
                    {
                      className: i.verified
                        ? "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-emerald-500/20 text-emerald-50 border border-emerald-200/40"
                        : "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-amber-500/20 text-amber-50 border border-amber-200/40",
                    },
                    e.createElement(se, { className: "w-3 h-3 mr-1" }),
                    " ",
                    i.verified
                      ? tr("verified", "Verified")
                      : tr("unverified", "Unverified"),
                  ),
                  e.createElement(
                    z,
                    {
                      className:
                        "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-white/15 text-white border border-white/20 dark:bg-slate-900/15 dark:text-white dark:border dark:border-white/20",
                    },
                    e.createElement(B, { className: "w-3 h-3 mr-1" }),
                    " ",
                    t(i.role?.toLowerCase()) || i.role || t("member"),
                  ),
                  trustLabel &&
                    e.createElement(
                      z,
                      { className: trustBadgeClass },
                      e.createElement(ot, { className: "w-3 h-3 mr-1" }),
                      " ",
                      trustLabel,
                      trustScore !== null ? ` \u00B7 ${trustScore}` : "",
                    ),
                  profileFrozen
                    ? e.createElement(
                        z,
                        {
                          className:
                            "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-rose-600/80 text-white border border-rose-500/60",
                        },
                        e.createElement(XCircleIcon, { className: "w-3 h-3 mr-1" }),
                        " ",
                        tr("account_frozen", "Account Frozen"),
                      )
                    : profileUnderReview
                      ? e.createElement(
                          z,
                          {
                            className:
                              "inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-amber-500/80 text-white border border-amber-400/60",
                          },
                          e.createElement(it, { className: "w-3 h-3 mr-1" }),
                          " ",
                          tr("seller_under_review", "Under Review"),
                        )
                      : null,
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3",
                  },
                  !i.verified &&
                    e.createElement(
                      d,
                      {
                        type: "button",
                        onClick: () => p("/verification"),
                        className:
                          "h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 dark:bg-gradient-to-r dark:text-white",
                      },
                      e.createElement(se, { className: "w-4 h-4 mr-2" }),
                      tr("verify_now", "Verify now"),
                    ),
                  e.createElement(
                    d,
                    {
                      type: "button",
                      onClick: () => V(!0),
                      className:
                        i.verified
                          ? "h-9 px-4 rounded-xl bg-white/90 text-slate-900 hover:bg-white font-bold shadow-md border border-white/40"
                          : "h-9 px-4 rounded-xl border border-white/40 text-white/90 hover:bg-white/15 font-semibold",
                    },
                    e.createElement(et, { className: "w-4 h-4 mr-2" }),
                    tr("edit_profile", "Edit profile"),
                  ),
                  e.createElement(PageDensityToggle, {
                    value: density,
                    onChange: setDensity,
                    label: tr("view", "View"),
                    className: "text-left",
                  }),
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "w-full lg:justify-self-end self-start text-left lg:text-right lg:w-[260px] dark:text-left dark:lg:text-right",
              },
              e.createElement(
                "div",
                {
                    className:
                      "rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white shadow-md dark:border dark:border-white/20 dark:bg-slate-900/10 dark:text-white",
                    "data-density": "extra",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "flex items-center justify-between text-xs text-white/80 dark:text-white/80",
                  },
                  e.createElement(
                    "span",
                    null,
                    tr("profile_completion", "Profile completion"),
                  ),
                  e.createElement(
                    "span",
                    null,
                    tr("profile_completion_value", "{{count}}%", {
                      count: profileCompletionPercent,
                    }),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "mt-2 h-2.5 w-full rounded-full bg-white/20 overflow-hidden dark:bg-slate-900/20",
                    role: "progressbar",
                    "aria-label": tr(
                      "profile_completion",
                      "Profile completion",
                    ),
                    "aria-valuenow": profileCompletionPercent,
                    "aria-valuemin": 0,
                    "aria-valuemax": 100,
                  },
                  e.createElement("div", {
                    className:
                      "h-full rounded-full progress-bar-green transition-[width] duration-700 ease-out",
                    style: { width: profileCompletionPercent + "%" },
                  }),
                ),
                e.createElement(
                  "p",
                  { className: "mt-2 text-[11px] text-white/80 dark:text-white/80" },
                  profileCompletionHint,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    e.createElement(
      "div",
      { className: "max-w-6xl mx-auto px-4" },
      e.createElement("div", {
        className:
          "h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent dark:via-slate-700/60 dark:bg-gradient-to-r",
      }),
    ),
    e.createElement(
      "div",
      {
        id: "profile-details",
        "data-active-tab": je,
        className:
          "max-w-6xl mx-auto px-4 mt-3 sm:mt-4 pb-6 relative z-10 scroll-mt-24",
      },
        e.createElement(
          "div",
          { className: "w-full space-y-5" },
          e.createElement(
            "div",
            {
              className: "profile-tabs-sticky rewards-tabs-sticky sticky z-30 mb-4",
              style: { top: "calc(var(--top-nav-height, 0px) + 12px)" },
            },
            e.createElement(
              "div",
              {
                className:
                  "rounded-2xl bg-white/95 border border-slate-200 shadow-sm px-2.5 py-2 dark:bg-gray-900/70 dark:border-gray-700 dark:bg-slate-900/95 dark:border dark:border-slate-700",
              },
              e.createElement(
                "div",
                { className: "flex items-center justify-between px-2" },
                e.createElement(
                  "p",
                  {
                    className:
                      "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300",
                  },
                  tr("jump_to_section", "Jump to section"),
                ),
                e.createElement(
                  "span",
                  { className: "text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-300" },
                  tr("sticky_tabs_hint", "Scroll to switch"),
                ),
              ),
              e.createElement(
                "div",
                {
                  role: "navigation",
                  "aria-label": tr("profile_sections", "Profile sections"),
                  className:
                    "rewards-tab-bar mt-2 w-full flex gap-1.5 overflow-x-auto rounded-[18px] bg-slate-50 p-1.5 shadow-none border border-slate-200 scrollbar-hide dark:bg-gray-800 dark:border-gray-700 dark:bg-slate-950 dark:border dark:border-slate-700",
                },
                e.createElement(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": je === "overview",
                    onClick: () => Ae("overview"),
                    className: profileTabClass("overview"),
                  },
                  e.createElement(
                    "span",
                    { className: "inline-flex items-center gap-1.5" },
                    e.createElement(lt, { className: "w-4 h-4" }),
                    tr("overview", "Overview"),
                  ),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": je === "personal",
                    onClick: () => Ae("personal"),
                    className: profileTabClass("personal"),
                  },
                  e.createElement(
                    "span",
                    { className: "inline-flex items-center gap-1.5" },
                    e.createElement(B, { className: "w-4 h-4" }),
                    tr("personal", "Personal"),
                  ),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": je === "preferences",
                    onClick: () => Ae("preferences"),
                    className: profileTabClass("preferences"),
                  },
                  e.createElement(
                    "span",
                    { className: "inline-flex items-center gap-1.5" },
                    e.createElement(oe, { className: "w-4 h-4" }),
                    tr("preferences", "Preferences"),
                  ),
                ),
                e.createElement(
                  "button",
                  {
                    type: "button",
                    "aria-pressed": je === "settings",
                    onClick: () => Ae("settings"),
                    className: profileTabClass("settings"),
                  },
                  e.createElement(
                    "span",
                    { className: "inline-flex items-center gap-1.5" },
                    e.createElement(ie, { className: "w-4 h-4" }),
                    tr("settings", "Settings"),
                  ),
                ),
              ),
            ),
          ),
        je === "overview" &&
          e.createElement(
                  "div",
                  {
                    className: "space-y-5",
                    "data-profile-tab": "overview",
                  },
                e.createElement(
        "div",
        {
          className:
            "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:border dark:border-slate-700 dark:bg-slate-900",
        },
                  e.createElement(
                    "div",
                    { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "span",
                        {
                          className:
                            "flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300",
                        },
                        e.createElement(lt, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300",
                          },
                          tr("quick_actions", "Quick actions"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "mt-1 text-xs text-slate-600 dark:text-slate-300 dark:text-slate-200",
                          },
                          tr(
                            "quick_actions_desc",
                            "Jump straight to the actions you use most.",
                          ),
                        ),
                      ),
                    ),
                    e.createElement(
                      "button",
                          {
                            type: "button",
                            onClick: () => toggleSection("quickActions"),
                            className:
                              "inline-flex items-center gap-1.5 rounded-full profile-chip px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-[var(--surface-2)] dark:text-slate-200 dark:hover:bg-[var(--surface-2)]",
                            "aria-expanded": !sectionCollapse.quickActions,
                            "aria-controls": "quick-actions-body",
                          },
                      sectionCollapse.quickActions
                        ? tr("expand", "Expand")
                        : tr("collapse", "Collapse"),
                      e.createElement(K, {
                        className:
                          `w-3.5 h-3.5 transition-transform ${sectionCollapse.quickActions ? "" : "rotate-90"}`,
                      }),
                    ),
                  ),
                  !sectionCollapse.quickActions &&
                    e.createElement(
                      "div",
                      {
                        className:
                          "mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                        id: "quick-actions-body",
                      },
            e.createElement(
              d,
              {
                onClick: () => p("/my-home"),
                variant: "ghost",
              className:
                  "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-indigo-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-indigo-500",
                style: { "--card-accent": "linear-gradient(90deg,#6366f1,#8b5cf6)" },
              },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-indigo-900/40 dark:text-indigo-200 dark:ring-white/10 dark:bg-indigo-950/20 dark:text-indigo-300",
              },
                        e.createElement(lt, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        { className: "text-left min-w-0 dark:text-left" },
                        e.createElement(
                          "p",
                          { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                          tr("my_home", "My Home"),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200" },
                          tr("access_dashboard", "Access your personal dashboard"),
                        ),
                      ),
                    ),
          e.createElement(
            d,
            {
              onClick: () => p("/my-feed"),
              variant: "ghost",
              className:
                "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-sky-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-sky-500",
              style: { "--card-accent": "linear-gradient(90deg,#38bdf8,#0ea5e9)" },
            },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-white/10 dark:bg-sky-950/20 dark:text-sky-300",
              },
                        e.createElement(nt, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        { className: "text-left min-w-0 dark:text-left" },
                        e.createElement(
                          "p",
                          { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                          tr("my_feed", "My Feed"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200",
                          },
                          tr("view_feed", "View your personalized feed"),
                        ),
                      ),
                    ),
          e.createElement(
            d,
            {
              onClick: () => p(i?.user_id || i?.id ? `/reviews/${i.user_id || i.id}` : "/profile"),
              variant: "ghost",
              className:
                "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-amber-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-amber-500",
              style: { "--card-accent": "linear-gradient(90deg,#f59e0b,#fbbf24)" },
            },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-white/10 dark:bg-amber-950/20 dark:text-amber-300",
              },
              e.createElement(le, { className: "w-5 h-5" }),
            ),
            e.createElement(
              "div",
              { className: "text-left min-w-0 dark:text-left" },
              e.createElement(
                "p",
                { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                tr("my_reviews", "My Reviews"),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200",
                },
                tr("view_reputation_desc", "Check public ratings and trust signals"),
              ),
            ),
          ),
          e.createElement(
            d,
            {
              onClick: () => {
                if (isPremiumPlan) {
                  const target = centreChannelId
                    ? `/centre/${centreChannelId}`
                    : "/centre/create";
                  p(target);
                  return;
                }
                p("/tier-selection");
              },
              variant: "ghost",
              className:
                "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-indigo-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-indigo-500",
              style: { "--card-accent": "linear-gradient(90deg,#6366f1,#8b5cf6)" },
            },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-indigo-900/40 dark:text-indigo-200 dark:ring-white/10 dark:bg-indigo-950/20 dark:text-indigo-300",
              },
              e.createElement(Le, { className: "w-5 h-5" }),
            ),
            e.createElement(
              "div",
              { className: "text-left min-w-0 dark:text-left" },
              e.createElement(
                "p",
                { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                isPremiumPlan
                  ? centreChannelId
                    ? tr("view_centre_page", "View CentrePage")
                    : tr("create_centre_page", "Create CentrePage")
                  : tr("unlock_centre_page", "Unlock CentrePage"),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200",
                },
                isPremiumPlan
                  ? centreChannelId
                    ? tr("manage_centre_page_desc", "Manage your CentrePage presence")
                    : tr("create_centre_page_desc", "Set up your premium seller profile")
                  : tr(
                      "upgrade_premium_centre_desc",
                      "Upgrade to Premium to create your CentrePage",
                    ),
              ),
            ),
          ),
          e.createElement(
            d,
            {
              onClick: () => p("/saledone"),
              variant: "ghost",
              className:
                "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-emerald-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-emerald-500",
              style: { "--card-accent": "linear-gradient(90deg,#10b981,#34d399)" },
            },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-white/10 dark:bg-emerald-950/20 dark:text-emerald-300",
              },
                        e.createElement(ne, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        { className: "text-left min-w-0 dark:text-left" },
                        e.createElement(
                          "p",
                          { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                          tr("btn_sale_done", "Sale Done"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200",
                          },
                          tr("sale_done_desc", "Mark a sale as completed"),
                        ),
                      ),
                    ),
          e.createElement(
            d,
            {
              onClick: () => p("/saleundone"),
              variant: "ghost",
              className:
                "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-rose-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-rose-500",
              style: { "--card-accent": "linear-gradient(90deg,#fb7185,#f43f5e)" },
            },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-white/10 dark:bg-rose-950/20 dark:text-rose-300",
              },
                        e.createElement(XCircleIcon, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        { className: "text-left min-w-0 dark:text-left" },
                        e.createElement(
                          "p",
                          { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                          tr("btn_sale_undone", "Sale Undone"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200",
                          },
                          tr("profile_sale_undone_desc", "Report an issue with a sale"),
                        ),
                      ),
                    ),
          e.createElement(
            d,
            {
              onClick: () => p("/offers"),
              variant: "ghost",
              className:
                "quick-action-card group relative min-h-[92px] !h-auto !py-4 !px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 justify-start border-t-4 border-t-violet-500 dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900 dark:border-t-4 dark:border-t-violet-500",
              style: { "--card-accent": "linear-gradient(90deg,#a78bfa,#8b5cf6)" },
            },
            e.createElement(
              "span",
              {
                className:
                  "quick-action-icon flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700 ring-1 ring-white/70 transition group-hover:scale-105 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-white/10 dark:bg-violet-950/20 dark:text-violet-300",
              },
                        e.createElement(it, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        { className: "text-left min-w-0 dark:text-left" },
                        e.createElement(
                          "p",
                          { className: "font-semibold text-base text-slate-900 dark:text-white truncate dark:text-slate-100" },
                          tr("my_offers", "My Offers"),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-slate-600 dark:text-slate-300 break-words dark:text-slate-200",
                          },
                          tr("my_offers_desc", "Review negotiations and incoming offers"),
                        ),
                      ),
                    ),
                    ),
                  ),
                ),
                hasCategoryMode &&
                  categoryModeCategory?.name &&
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex flex-col gap-3 rounded-2xl profile-panel border-indigo-200/60 dark:border-indigo-500/30 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-600/60",
                    },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300",
                        },
                        e.createElement(Le, { className: "h-5 w-5" }),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                          },
                          tr("category_mode", "Category mode"),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-sm font-semibold text-slate-800 dark:text-white dark:text-slate-100" },
                          categoryModeCategory.name,
                        ),
                        e.createElement(
                          "p",
                          { className: "text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300" },
                          tr(
                            "profile_category_mode_hint",
                            "Profile stats are filtered to this category.",
                          ),
                        ),
                      ),
                    ),
                    e.createElement(
                      d,
                      {
                        type: "button",
                        variant: "outline",
                        onClick: () => p("/category-mode"),
                      },
                      tr("switch_category", "Switch category"),
                    ),
                  ),
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 page-fade-in page-fade-in-delay-3 dark:border dark:border-slate-700 dark:bg-slate-900",
                    "data-density": "extra",
                  },
                  e.createElement(
                    "div",
                    { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "span",
                        {
                          className:
                            "flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 dark:bg-violet-950/20 dark:text-violet-300",
                        },
                        e.createElement(Le, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300",
                          },
                          tr("finish_profile", "Profile completion"),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-sm text-slate-600 dark:text-slate-400 dark:text-slate-200" },
                          tr(
                            "finish_profile_desc",
                            "Convert missing trust signals into clear next actions.",
                          ),
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "flex flex-col gap-2 sm:items-end sm:text-right sm:min-w-[240px] dark:sm:text-right",
                      },
                      e.createElement(
                        "div",
                        {
                          className:
                            "flex flex-wrap items-center gap-2 sm:justify-end w-full",
                        },
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-sm font-semibold text-violet-700 dark:text-violet-200 dark:text-violet-300",
                          },
                          profileCompletionPercent,
                          "% ",
                          tr("complete", "complete"),
                        ),
                        e.createElement(
                          z,
                          {
                            className:
                              "self-start rounded-full bg-violet-600 text-white border-0 shadow-sm dark:bg-violet-500 dark:bg-violet-700/40 dark:text-white dark:border-0",
                          },
                          profileChecklistDoneCount,
                          "/",
                          profileChecklistTotal,
                        ),
                        e.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: () => toggleSection("finishProfile"),
                            className:
                              "inline-flex items-center gap-1.5 rounded-full profile-chip px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-[var(--surface-2)] dark:text-slate-200 dark:hover:bg-[var(--surface-2)]",
                            "aria-expanded": !sectionCollapse.finishProfile,
                            "aria-controls": "finish-profile-body",
                          },
                          sectionCollapse.finishProfile
                            ? tr("expand", "Expand")
                            : tr("collapse", "Collapse"),
                          e.createElement(K, {
                            className:
                              `w-3.5 h-3.5 transition-transform ${sectionCollapse.finishProfile ? "" : "rotate-90"}`,
                          }),
                        ),
                      ),
                      e.createElement(
                        "div",
                        {
                          className:
                            "h-2.5 w-full sm:w-52 rounded-full bg-violet-100/80 overflow-hidden dark:bg-violet-900/40 dark:bg-violet-950/80",
                          role: "progressbar",
                          "aria-label": tr(
                            "profile_completion",
                            "Profile completion",
                          ),
                          "aria-valuenow": profileCompletionPercent,
                          "aria-valuemin": 0,
                          "aria-valuemax": 100,
                        },
                        e.createElement("div", {
                          className:
                            "h-full rounded-full bg-violet-500 transition-[width] duration-700 ease-out dark:bg-violet-800/30",
                          style: { width: profileCompletionPercent + "%" },
                        }),
                      ),
                      nextProfileAction
                        ? e.createElement(
                            "p",
                            {
                              className:
                                "text-[11px] text-slate-600 dark:text-slate-300 dark:text-slate-200",
                            },
                            tr("profile_next_step", "Next: {{step}}", {
                              step: nextProfileAction.label,
                            }),
                          )
                        : e.createElement(
                            "p",
                            {
                              className:
                                "text-[11px] text-slate-600 dark:text-slate-300 dark:text-slate-200",
                            },
                            tr(
                              "profile_all_set",
                              "Everything important is already filled in.",
                            ),
                          ),
                    ),
                  ),
                  !sectionCollapse.finishProfile &&
                    e.createElement(
                      "div",
                      { className: "mt-4 space-y-3", id: "finish-profile-body" },
                      profileChecklistItems.map((r) =>
                        e.createElement(
                          "div",
                          {
                            key: r.key,
                            className:
                              `checklist-item ${r.done ? "done" : ""} rounded-2xl border border-l-4 p-4 shadow-sm transition-all duration-200 dark:border dark:border-l-4${r.done ? "border-emerald-300/70 border-l-emerald-400 bg-emerald-50/80 dark:border-emerald-700/40 dark:bg-emerald-900/20" : "border-slate-200 border-l-indigo-300 bg-[var(--surface-1)] hover:border-indigo-300 hover:bg-[var(--surface-2)] dark:border-slate-700 dark:bg-[var(--surface-2)] dark:hover:bg-slate-800/60"}`,
                          },
                          e.createElement(
                            "div",
                            { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
                            e.createElement(
                              "div",
                              { className: "min-w-0" },
                              e.createElement(
                                "div",
                                { className: "flex items-center gap-2" },
                                r.done
                                  ? e.createElement(ne, { className: "h-4 w-4 text-emerald-600 dark:text-emerald-300" })
                                  : e.createElement(XCircleIcon, { className: "h-4 w-4 text-amber-500 dark:text-amber-300" }),
                                e.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-sm font-semibold text-slate-800 dark:text-white dark:text-slate-100",
                                  },
                                  r.label,
                                ),
                              ),
                              e.createElement(
                                "p",
                                {
                                  className:
                                    "mt-1 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-200",
                                },
                                r.description,
                              ),
                            ),
                            r.done
                              ? e.createElement(
                                  z,
                                  {
                                    className:
                                      "self-start min-w-[96px] justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300",
                                  },
                                  tr("done", "Done"),
                                )
                              : e.createElement(
                                  d,
                                  {
                                    type: "button",
                                    size: "sm",
                                    variant: "outline",
                                    onClick: r.onClick,
                                    className:
                                      "min-w-[96px] justify-center rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950",
                                  },
                                  r.actionLabel,
                                ),
                          ),
                        ),
                      ),
                    ),
                ),
              e.createElement(
                "div",
                { className: "grid gap-3 lg:grid-cols-2" },
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:border dark:border-slate-700 dark:bg-slate-900",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200",
                      },
                      tr("preferences_snapshot", "Preferences Snapshot"),
                    ),
                    e.createElement(
                      d,
                      {
                        type: "button",
                        variant: "ghost",
                        size: "sm",
                        onClick: () => Ae("preferences"),
                        className: "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200",
                      },
                      tr("edit", "Edit"),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5" },
                    preferencesSnapshotItems.map((item) =>
                      e.createElement(
                        "div",
                        {
                          key: item.key,
                          className:
                            "flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 px-2.5 py-2 dark:border dark:border-slate-700/70 dark:bg-slate-950/80",
                        },
                        e.createElement(
                          "div",
                          {
                              className:
                                "flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-slate-600 dark:bg-slate-900 dark:text-slate-200",
                          },
                          e.createElement(item.icon, { className: "h-4 w-4" }),
                        ),
                        e.createElement(
                          "div",
                          { className: "min-w-0" },
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                            },
                            item.label,
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-sm font-semibold text-slate-800 truncate dark:text-slate-100",
                            },
                            item.value,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:border dark:border-slate-700 dark:bg-slate-900",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200",
                      },
                      tr("marketplace_pulse", "Marketplace Pulse"),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5" },
                    marketplacePulseItems.map((item) =>
                      e.createElement(
                        "div",
                        {
                          key: item.key,
                          className:
                            "rounded-xl border border-slate-200/70 bg-slate-50/80 px-2.5 py-2 dark:border dark:border-slate-700/70 dark:bg-slate-950/80",
                        },
                        e.createElement(
                          "div",
                          { className: "flex items-center justify-between" },
                          e.createElement(
                            "div",
                            {
                              className:
                                "flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200",
                            },
                            e.createElement(item.icon, { className: "h-4 w-4" }),
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right dark:text-slate-300 dark:text-right",
                            },
                            item.label,
                          ),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "mt-2 text-lg font-bold text-slate-900 dark:text-slate-100",
                          },
                          item.value,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              e.createElement("div", {
                className:
                  "my-4 h-px bg-slate-200/80 dark:bg-slate-700/60 dark:bg-slate-900/80",
              }),
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 page-fade-in page-fade-in-delay-2 dark:border dark:border-slate-700 dark:bg-slate-900",
                  },
                  e.createElement(
                    "div",
                    { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "span",
                        {
                          className:
                            "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300",
                        },
                        e.createElement(ot, { className: "w-5 h-5" }),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          "p",
                          {
                            className:
                              "text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300",
                          },
                          tr("account_status", "Account status"),
                        ),
                        e.createElement(
                          "p",
                          { className: "text-sm text-slate-600 dark:text-slate-400 dark:text-slate-200" },
                          tr(
                            "account_status_desc",
                            "Keep plan, verification, and profile freshness visible at a glance.",
                          ),
                        ),
                      ),
                    ),
                    e.createElement(
                      z,
                      {
                        className:
                          "self-start bg-emerald-600 text-white border-0 dark:bg-emerald-500 dark:bg-emerald-700/40 dark:text-white dark:border-0",
                      },
                      currentPlanLabel,
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
                    },
                    [
                      {
                        key: "plan",
                        icon: Se,
                        label: tr("current_plan", "Current plan"),
                        value: currentPlanLabel,
                        tone:
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                      },
                      {
                        key: "expiry",
                        icon: at,
                        label: tr("subscription_expiry", "Subscription expiry"),
                        value: subscriptionExpiryLabel,
                        tone:
                          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
                      },
                      {
                        key: "updated",
                        icon: et,
                        label: tr("profile_last_updated", "Profile last updated"),
                        value: profileUpdatedLabel,
                        tone:
                          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                      },
                      {
                        key: "member",
                        icon: ot,
                        label: tr("member_since", "Member since"),
                        value: memberSinceLabel,
                        tone:
                          "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
                      },
                      {
                        key: "listings",
                        icon: lt,
                        label: tr("listings", "Listings"),
                        value: listingCountValue,
                        tone:
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                      },
                    ].map((r) =>
              e.createElement(
                "div",
                {
                  key: r.key,
                  className:
                    "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900/40 dark:border dark:border-slate-700 dark:bg-slate-900",
                },
                        e.createElement(
                          "div",
                          { className: "flex items-center gap-2 text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                          e.createElement(
                            "span",
                            {
                              className:
                                `flex h-8 w-8 items-center justify-center rounded-lg ${r.tone}`,
                            },
                            e.createElement(r.icon, { className: "h-4 w-4" }),
                          ),
                          e.createElement(
                            "span",
                            {
                              className:
                                "text-[11px] font-bold uppercase tracking-[0.12em]",
                            },
                            r.label,
                          ),
                        ),
                        e.createElement(
                          "p",
                          {
                            className:
                              "mt-3 text-base font-semibold text-slate-900 dark:text-white dark:text-slate-100",
                          },
                          r.value,
                        ),
                      ),
                    ),
                  ),
                ),
              
        je === "personal" &&
          e.createElement(
            _,
            {
              "data-profile-tab": "personal",
              className:
                "mhub-premium-surface border border-slate-200/80 dark:border-gray-700/70 shadow-xl rounded-2xl dark:border dark:border-slate-700/80",
            },
            e.createElement(
              ee,
              {
                className:
                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-600/40 dark:border-gray-700/70 pb-3 dark:border-b dark:border-slate-700/70",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-3" },
                e.createElement(
                  "span",
                  {
                    className:
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 dark:bg-blue-950/20 dark:text-blue-300",
                  },
                  e.createElement(B, { className: "w-5 h-5" }),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    te,
                    { className: "text-lg font-bold text-slate-900 dark:text-white dark:text-slate-100" },
                    tr("personal_information", "Personal information"),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                    tr(
                      "personal_information_desc",
                      "Keep your contact details up to date for buyers.",
                    ),
                  ),
                ),
              ),
              !Te &&
                e.createElement(
                  d,
                  {
                    size: "sm",
                    variant: "outline",
                    onClick: editProfileDetails,
                    className:
                      "rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950",
                  },
                  tr("edit_profile", "Edit profile"),
                ),
            ),
            e.createElement(
              C,
              { className: "space-y-3" },
              Te
                ? e.createElement(
                    "form",
                    { onSubmit: Ke, className: "space-y-5" },
                    e.createElement(
                      "div",
                      { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          x,
                          {
                            htmlFor: "full_name",
                            className:
                              "text-sm font-semibold text-slate-700 dark:text-slate-200",
                          },
                          t("full_name") || "Full Name",
                        ),
                        e.createElement(P, {
                          id: "full_name",
                          name: "full_name",
                          value: f.full_name,
                          onChange: D,
                          placeholder: tr("full_name_placeholder", "Your name"),
                          className:
                            "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                        }),
                        A.full_name &&
                          e.createElement(
                            "p",
                            { className: "text-rose-600 text-xs mt-1 dark:text-rose-300" },
                            A.full_name,
                          ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          x,
                          {
                            htmlFor: "phone",
                            className:
                              "text-sm font-semibold text-slate-700 dark:text-slate-200",
                          },
                          t("phone") || "Phone",
                        ),
                        e.createElement(P, {
                          id: "phone",
                          name: "phone",
                          type: "tel",
                          value: f.phone,
                          onChange: D,
                          placeholder: tr(
                            "phone_placeholder",
                            "10-digit mobile number",
                          ),
                          className:
                            "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                        }),
                        A.phone &&
                          e.createElement(
                            "p",
                            { className: "text-rose-600 text-xs mt-1 dark:text-rose-300" },
                            A.phone,
                          ),
                      ),
                      e.createElement(
                        "div",
                        null,
                        e.createElement(
                          x,
                          {
                            htmlFor: "address",
                            className:
                              "text-sm font-semibold text-slate-700 dark:text-slate-200",
                          },
                          t("address") || "Address",
                        ),
                        e.createElement(P, {
                          id: "address",
                          name: "address",
                          value: f.address,
                          onChange: D,
                          placeholder: tr(
                            "address_placeholder",
                            "City, State",
                          ),
                          className:
                            "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                        }),
                      ),
                      e.createElement(
                        "div",
                        { className: "md:col-span-2" },
                        e.createElement(
                          x,
                          {
                            htmlFor: "bio",
                            className:
                              "text-sm font-semibold text-slate-700 dark:text-slate-200",
                          },
                          t("bio") || "Bio",
                        ),
                        e.createElement(P, {
                          id: "bio",
                          name: "bio",
                          value: f.bio,
                          onChange: D,
                          className:
                            "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                          placeholder:
                            t("about_yourself") || "Tell us about yourself...",
                        }),
                        e.createElement(
                          "p",
                          {
                            className:
                              "mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300",
                          },
                          tr("bio_character_counter", "{{count}} characters", {
                            count: String(f.bio || "").length,
                          }),
                        ),
                      ),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-col sm:flex-row gap-3 pt-2" },
                      e.createElement(
                        d,
                        {
                          type: "submit",
                          className:
                            "flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white font-semibold shadow-lg hover:shadow-xl dark:bg-gradient-to-r dark:text-white",
                        },
                        t("save_changes") || "Save Changes",
                      ),
                      e.createElement(
                        d,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => V(!1),
                          className:
                            "flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950",
                        },
                        t("cancel") || "Cancel",
                      ),
                    ),
                  )
                : e.createElement(
                    "div",
                    { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "p-4 rounded-2xl profile-subpanel border-blue-200/60 dark:border-blue-500/30 shadow-sm hover:shadow-md transition dark:border-blue-600/60",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(
                          "span",
                          {
                            className:
                              "flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-200 dark:bg-blue-950/20 dark:text-blue-300",
                          },
                          e.createElement(B, {
                            className: "w-5 h-5",
                          }),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                          },
                          tr("full_name", "Full name"),
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                        },
                        i.name || i.full_name || "-",
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "p-4 rounded-2xl profile-subpanel border-sky-200/60 dark:border-sky-500/30 shadow-sm hover:shadow-md transition dark:border-sky-600/60",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(
                          "span",
                          {
                            className:
                              "flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-900/40 dark:text-sky-200 dark:bg-sky-950/20 dark:text-sky-300",
                          },
                          e.createElement(rt, {
                            className: "w-5 h-5",
                          }),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                          },
                          tr("email", "Email"),
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                        },
                        i.email || "-",
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "p-4 rounded-2xl profile-subpanel border-emerald-200/60 dark:border-emerald-500/30 shadow-sm hover:shadow-md transition dark:border-emerald-600/60",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(
                          "span",
                          {
                            className:
                              "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300",
                          },
                          e.createElement(tt, {
                            className: "w-5 h-5",
                          }),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                          },
                          tr("phone", "Phone"),
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                        },
                        i.phone || "-",
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className:
                          "p-4 rounded-2xl profile-subpanel border-amber-200/60 dark:border-amber-500/30 shadow-sm hover:shadow-md transition dark:border-amber-600/60",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(
                          "span",
                          {
                            className:
                              "flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-900/40 dark:text-amber-200 dark:bg-amber-950/20 dark:text-amber-300",
                          },
                          e.createElement(Ce, {
                            className: "w-5 h-5",
                          }),
                        ),
                        e.createElement(
                          "span",
                          {
                            className:
                              "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                          },
                          tr("address", "Address"),
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                        },
                        i.address || "-",
                      ),
                    ),
                  ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-4 p-4 rounded-2xl profile-panel border-indigo-200/60 dark:border-indigo-500/30 shadow-sm dark:border-indigo-600/60",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm dark:bg-indigo-700/40",
                      },
                      e.createElement(se, { className: "w-5 h-5 text-white dark:text-white" }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
                        },
                        tr("your_user_id", "Your user ID"),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-bold text-indigo-700 dark:text-indigo-300 font-mono text-lg",
                        },
                        i.user_id || i.id || m?.user_id || m?.id || "-",
                      ),
                    ),
                  ),
                  e.createElement(
                    d,
                    {
                      size: "sm",
                      variant: "default",
                      onClick: () => {
                        const r = i.user_id || i.id || m?.user_id || m?.id;
                        r &&
                          (navigator.clipboard.writeText(String(r)),
                          u({
                            title: tr("copied_to_clipboard_title", "Copied!"),
                            description: tr(
                              "user_id_copied",
                              "User ID copied to clipboard",
                            ),
                          }));
                      },
                      className:
                        "rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 border-0 dark:bg-indigo-700/40 dark:text-white dark:hover:bg-indigo-700/40 dark:border-0",
                    },
                    e.createElement(Re, { className: "w-4 h-4 mr-1" }),
                    " ",
                    t("copy") || "Copy",
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "mt-2 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300",
                  },
                  e.createElement(Le, {
                    className: "mt-0.5 h-3.5 w-3.5 text-indigo-500/80 dark:text-indigo-300/80",
                  }),
                  e.createElement(
                    "p",
                    null,
                    tr(
                      "use_id_for_forms",
                      "Use this ID for account-related forms and support requests.",
                    ),
                  ),
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-4 p-4 rounded-2xl profile-panel border-emerald-200/60 dark:border-emerald-500/30 shadow-sm dark:border-emerald-600/60",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm dark:bg-emerald-700/40",
                      },
                      e.createElement(ne, { className: "w-5 h-5 text-white dark:text-white" }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-green-800 dark:text-green-300 dark:text-green-200",
                        },
                        t("verification_status"),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-sm text-green-600 dark:text-green-400 dark:text-green-300",
                        },
                        i.verified
                          ? t("account_verified") || "Your account is verified"
                          : t("verify_for_features") ||
                              "Verify your account for more features",
                      ),
                    ),
                  ),
                  !i.verified &&
                    e.createElement(
                      d,
                      {
                        size: "sm",
                        onClick: () => p("/verification"),
                        className:
                          "rounded-full bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700/40 dark:hover:bg-emerald-700/40 dark:text-white",
                      },
                      t("verify_now"),
                    ),
                ),
              ),
            ),
          ),
        je === "preferences" &&
          e.createElement(
            _,
            {
              "data-profile-tab": "preferences",
              className:
                "mhub-premium-surface border border-slate-200/80 dark:border-gray-700/70 shadow-xl rounded-2xl dark:border dark:border-slate-700/80",
            },
            e.createElement(
              ee,
              {
                className:
                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-600/40 dark:border-gray-700/70 pb-3 dark:border-b dark:border-slate-700/70",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-3" },
                e.createElement(
                  "span",
                  {
                    className:
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300",
                  },
                  e.createElement(Le, { className: "w-5 h-5" }),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    te,
                    {
                      className:
                        "text-lg font-bold text-slate-900 dark:text-white dark:text-slate-100",
                    },
                    t("recommendation_preferences") ||
                      "Recommendation Preferences",
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                    tr(
                      "preferences_desc_short",
                      "Tune what shows up in your For You feed and All Posts.",
                    ),
                  ),
                ),
              ),
              e.createElement(
                d,
                {
                  size: "sm",
                  variant: "outline",
                  onClick: () => pe(!J),
                  className:
                    "rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950",
                },
                J ? t("cancel") || "Cancel" : t("edit") || "Edit",
              ),
            ),
            e.createElement(
              C,
              { className: "space-y-4" },
              De
                ? e.createElement(T, {
                    title: tr(
                      "profile_loading_recommendation_preferences",
                      "Loading recommendation preferences",
                    ),
                    description: tr(
                      "profile_loading_recommendation_preferences_desc",
                      "Fetching your current preference settings.",
                    ),
                    marker: "profile-preferences-loading",
                  })
                : preferencesErrorMessage
                  ? e.createElement(H, {
                      title: tr(
                        "profile_recommendation_preferences_unavailable",
                        "Recommendation preferences unavailable",
                      ),
                      description: preferencesErrorMessage,
                      onRetry: Fe,
                      retryLabel: tr("retry", "Retry"),
                      marker: "profile-preferences-error",
                      secondaryAction: e.createElement(
                        d,
                        {
                          variant: "outline",
                          "data-ux-action": "profile_preferences_clear_error",
                          onClick: () => U(null),
                        },
                        t("continue_anyway") || "Continue anyway",
                      ),
                    })
                  : J
                    ? e.createElement(
                        "form",
                        { onSubmit: He, className: "space-y-5" },
                        e.createElement(
                          "div",
                          {
                            className:
                              "rounded-2xl profile-panel p-4 shadow-sm",
                          },
                          e.createElement(
                            "div",
                            { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" },
                            e.createElement(
                              x,
                              {
                                className:
                                  "text-sm font-semibold text-slate-700 dark:text-slate-200",
                              },
                              t("preferred_location") || "Preferred Location",
                            ),
                            e.createElement(
                              d,
                              {
                                type: "button",
                                size: "sm",
                                variant: "outline",
                                onClick: detectCurrentPreferenceLocation,
                                disabled: detectingPreferenceLocation,
                                className:
                                  "rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950",
                              },
                              detectingPreferenceLocation
                                ? tr("detecting_location", "Detecting...")
                                : tr("use_current_location", "Use current location"),
                            ),
                          ),
                          e.createElement(P, {
                            name: "location",
                            value: preferenceLocationSearch,
                            onChange: (r) => applyPreferenceLocation(r.target.value),
                            className:
                              "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                            list: "profile-location-suggestions",
                            placeholder:
                              t("search_city") || "Search for your city...",
                          }),
                          e.createElement(
                            "datalist",
                            { id: "profile-location-suggestions" },
                            suggestedLocations.map((r) =>
                              e.createElement("option", { key: r, value: r }),
                            ),
                          ),
                          suggestedLocations.length > 0 &&
                            e.createElement(
                              "div",
                              { className: "mt-3 flex flex-wrap gap-2" },
                              suggestedLocations.map((r) =>
                                e.createElement(
                                  d,
                                  {
                                    key: r,
                                    type: "button",
                                    size: "sm",
                                    variant: c.location === r ? "default" : "outline",
                                    onClick: () => applyPreferenceLocation(r),
                                    className:
                                      c.location === r
                                        ? "rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                                        : "rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200",
                                  },
                                  r,
                                ),
                              ),
                            ),
                          e.createElement(
                            "div",
                            { className: "mt-4" },
                            e.createElement(
                              x,
                              {
                                className:
                                  "text-sm font-semibold text-slate-700 dark:text-slate-200",
                              },
                              tr("search_radius", "Search radius"),
                            ),
                            e.createElement(
                              "div",
                              { className: "mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2" },
                              ["5", "10", "25", "50"].map((r) =>
                                e.createElement(
                                  d,
                                  {
                                    key: r,
                                    type: "button",
                                    size: "sm",
                                    variant:
                                      preferenceRadiusKm === r ? "default" : "outline",
                                    onClick: () => setPreferenceRadiusKm(r),
                                    className:
                                      preferenceRadiusKm === r
                                        ? "rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                                        : "rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200",
                                  },
                                  r,
                                  " km",
                                ),
                              ),
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "rounded-2xl profile-panel p-4 shadow-sm",
                          },
                          e.createElement(
                            x,
                            {
                              className:
                                "text-sm font-semibold text-slate-700 dark:text-slate-200",
                            },
                            t("preferred_subcategories") || "Preferred Subcategories",
                          ),
                          e.createElement(
                            "p",
                            { className: "mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300" },
                            t("select_subcategories_desc") ||
                              "Select subcategories to see in For You page",
                          ),
                          Ue
                            ? e.createElement(T, {
                                title: tr(
                                  "loading_subcategories",
                                  "Loading subcategories",
                                ),
                                description: tr(
                                  "loading_subcategories_desc",
                                  "Getting subcategory options for personalization.",
                                ),
                                marker: "profile-categories-loading",
                              })
                            : categoriesErrorMessage
                              ? e.createElement(H, {
                                  title: tr(
                                    "profile_subcategory_options_unavailable",
                                    "Subcategory options unavailable",
                                  ),
                                  description: categoriesErrorMessage,
                                  onRetry: () => k({ force: !0 }),
                                  retryLabel: tr("retry", "Retry"),
                                  marker: "profile-categories-error",
                                  secondaryAction: e.createElement(
                                    d,
                                    {
                                      variant: "outline",
                                      "data-ux-action":
                                        "profile_categories_retry",
                                      onClick: () => k({ force: !0 }),
                                    },
                                    tr("retry_subcategories", "Retry subcategories"),
                                  ),
                                })
                              : scopedPreferenceSubcategories.length === 0
                                ? e.createElement(Nt, {
                                    title: tr(
                                      "profile_no_subcategories_available",
                                      "No subcategories available",
                                    ),
                                    description: tr(
                                      "profile_no_subcategories_available_desc",
                                      "Try again in a moment to load subcategory options.",
                                    ),
                                    marker: "profile-categories-empty",
                                    action: e.createElement(
                                      d,
                                      {
                                        variant: "outline",
                                        "data-ux-action":
                                          "profile_categories_retry",
                                        onClick: () => k({ force: !0 }),
                                      },
                                      tr(
                                        "retry_subcategories",
                                        "Retry subcategories",
                                      ),
                                    ),
                                  })
                                : e.createElement(
                                    "div",
                                    {
                                      className:
                                        "mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5",
                                    },
                                    scopedPreferenceSubcategories.map((r) =>
                                      e.createElement(
                                        "label",
                                        {
                                          key: r.subcategory_id || r.name,
                                          className: `group flex items-start gap-3 rounded-2xl border p-3.5 transition-all profile-subpanel dark:border ${c.subcategories?.includes(r.name) ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-200/60 dark:border-indigo-400 dark:bg-indigo-900/30" : "hover:border-indigo-200 hover:bg-[var(--surface-2)] dark:hover:border-indigo-400/70"}`,
                                        },
                                        e.createElement("input", {
                                          type: "checkbox",
                                          checked:
                                            c.subcategories?.includes(r.name) ||
                                            !1,
                                          onChange: (a) => {
                                            const o = r.name;
                                            I((s) => ({
                                              ...s,
                                              subcategories: a.target.checked
                                                ? [...(s.subcategories || []), o]
                                                : (s.subcategories || []).filter(
                                                    (l) => l !== o,
                                                  ),
                                            }));
                                          },
                                          className:
                                            "mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 dark:text-indigo-300",
                                        }),
                                        e.createElement(
                                          "div",
                                          { className: "min-w-0" },
                                          e.createElement(
                                            "p",
                                            {
                                              className:
                                                "text-sm font-semibold text-slate-800 dark:text-slate-100 truncate",
                                            },
                                            r.name,
                                          ),
                                          r.category_name &&
                                            e.createElement(
                                              "p",
                                              {
                                                className:
                                                  "text-xs text-slate-500 dark:text-slate-400 dark:text-slate-300",
                                              },
                                              r.category_name,
                                            ),
                                        ),
                                      ),
                                    ),
                                  ),
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "rounded-2xl profile-panel p-4 shadow-sm",
                          },
                          e.createElement(
                            "div",
                            { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
                            e.createElement(
                              "div",
                              null,
                              e.createElement(
                                x,
                                {
                                  className:
                                    "text-sm font-semibold text-slate-700 dark:text-slate-200",
                                },
                                t("min_price") || "Min Price",
                                " (\u20B9)",
                              ),
                              e.createElement(P, {
                                name: "minPrice",
                                type: "number",
                                value: c.minPrice,
                                onChange: Q,
                                className:
                                  "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                                placeholder: "0",
                              }),
                            ),
                            e.createElement(
                              "div",
                              null,
                              e.createElement(
                                x,
                                {
                                  className:
                                    "text-sm font-semibold text-slate-700 dark:text-slate-200",
                                },
                                t("max_price") || "Max Price",
                                " (\u20B9)",
                              ),
                              e.createElement(P, {
                                name: "maxPrice",
                                type: "number",
                                value: c.maxPrice,
                                onChange: Q,
                                className:
                                  "mt-2 rounded-xl profile-input shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                                placeholder: "100000",
                              }),
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "rounded-2xl profile-panel border-indigo-200/60 dark:border-indigo-500/30 p-4 dark:border-indigo-600/60",
                          },
                          e.createElement(
                            "div",
                            { className: "flex items-center gap-2" },
                            e.createElement(
                              "span",
                              {
                                className:
                                  "flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm dark:bg-indigo-700/40 dark:text-white",
                              },
                              e.createElement(Le, { className: "h-4 w-4" }),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-sm font-semibold text-indigo-900 dark:text-indigo-100 dark:text-indigo-200",
                              },
                              tr("live_preview", "Live preview"),
                            ),
                          ),
                          e.createElement(
                            "div",
                            { className: "mt-3 space-y-2" },
                            personalizationPreviewLines.map((r, a) =>
                              e.createElement(
                                "p",
                                {
                                  key: `${r}-${a}`,
                                  className:
                                    "text-xs text-indigo-800 dark:text-indigo-100/90 dark:text-indigo-200",
                                },
                                r,
                              ),
                            ),
                          ),
                        ),
                        e.createElement(
                          d,
                          {
                            type: "submit",
                            className:
                              "w-full rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white font-semibold shadow-lg hover:shadow-xl dark:bg-gradient-to-r dark:text-white",
                          },
                          t("save_preferences") || "Save Preferences",
                        ),
                      )
                    : e.createElement(
                        "div",
                        { className: "space-y-4" },
                        e.createElement(
                          "div",
                          {
                            className:
                              "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4",
                          },
                          e.createElement(
                            "div",
                            {
                              className:
                                "rewards-stat-card rounded-2xl profile-subpanel p-4 text-center shadow-sm dark:text-center",
                              style: {
                                "--card-accent":
                                  "linear-gradient(90deg,#6366f1,#3b82f6)",
                              },
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300",
                              },
                              e.createElement(Ce, { className: "w-5 h-5" }),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-300",
                              },
                              t("location") || "Location",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "mt-1 text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                              },
                              c.location || t("any") || "Any",
                            ),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "rewards-stat-card rounded-2xl profile-subpanel p-4 text-center shadow-sm dark:text-center",
                              style: {
                                "--card-accent":
                                  "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                              },
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 dark:bg-sky-950/20 dark:text-sky-300",
                              },
                              e.createElement(Le, { className: "w-5 h-5" }),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-300",
                              },
                              tr("search_radius", "Search radius"),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "mt-1 text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                              },
                              preferenceRadiusKm,
                              " km",
                            ),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "rewards-stat-card rounded-2xl profile-subpanel p-4 text-center shadow-sm dark:text-center",
                              style: {
                                "--card-accent":
                                  "linear-gradient(90deg,#34d399,#10b981)",
                              },
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300",
                              },
                              e.createElement(Se, { className: "w-5 h-5" }),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-300",
                              },
                              t("min_price") || "Min Price",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "mt-1 text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                              },
                              "\u20B9",
                              c.minPrice || "0",
                            ),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "rewards-stat-card rounded-2xl profile-subpanel p-4 text-center shadow-sm dark:text-center",
                              style: {
                                "--card-accent":
                                  "linear-gradient(90deg,#f59e0b,#fbbf24)",
                              },
                            },
                            e.createElement(
                              "div",
                              {
                                className:
                                  "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:bg-amber-950/20 dark:text-amber-300",
                              },
                              e.createElement(it, { className: "w-5 h-5" }),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-300",
                              },
                              t("max_price") || "Max Price",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "mt-1 text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                              },
                              "\u20B9",
                              c.maxPrice || "\u221E",
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "rounded-2xl profile-subpanel p-4 shadow-sm",
                          },
                          e.createElement(
                            "div",
                            { className: "flex items-center justify-between" },
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-300",
                              },
                              t("preferred_subcategories") ||
                                "Preferred Subcategories",
                            ),
                            scopedPreferenceSelected &&
                            scopedPreferenceSelected.length > 0
                              ? e.createElement(
                                  "span",
                                  {
                                    className:
                                      "rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300",
                                  },
                                  tr("selected_count", "{{count}} selected", {
                                    count: scopedPreferenceSelected.length,
                                  }),
                                )
                              : e.createElement(
                                  "span",
                                  {
                                    className:
                                      "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:bg-slate-950",
                                  },
                                  tr("all_subcategories", "All"),
                                ),
                          ),
                          scopedPreferenceSelected &&
                          scopedPreferenceSelected.length > 0
                            ? e.createElement(
                                "div",
                                { className: "mt-3 flex flex-wrap gap-2" },
                                scopedPreferenceSelected.map((r) =>
                                  e.createElement(
                                    z,
                                    {
                                      key: r,
                                      className:
                                        "bg-indigo-100/90 text-indigo-700 dark:bg-indigo-800/80 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-500/30 px-3 py-1 dark:bg-indigo-950/90 dark:text-indigo-300 dark:border dark:border-indigo-600/60",
                                    },
                                    r,
                                  ),
                                ),
                              )
                            : e.createElement(
                                "p",
                                {
                                  className:
                                "mt-2 text-xs italic text-slate-500 dark:text-slate-400 dark:text-slate-300",
                              },
                              tr(
                                "no_subcategories_selected",
                                "No subcategories selected - showing all",
                              ),
                            ),
                        ),
                        e.createElement(
                          "div",
                          {
                            className:
                              "rounded-2xl profile-panel border-indigo-200/60 dark:border-indigo-500/30 p-4 dark:border-indigo-600/60",
                          },
                          e.createElement(
                            "div",
                            { className: "flex items-center gap-2" },
                            e.createElement(
                              "span",
                              {
                                className:
                                  "flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm dark:bg-indigo-700/40 dark:text-white",
                              },
                              e.createElement(Le, { className: "h-4 w-4" }),
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-sm font-semibold text-indigo-900 dark:text-indigo-100 dark:text-indigo-200",
                              },
                              tr("live_preview", "Live preview"),
                            ),
                          ),
                          e.createElement(
                            "div",
                            { className: "mt-2 space-y-2" },
                            personalizationPreviewLines.map((r, a) =>
                              e.createElement(
                                "p",
                                {
                                  key: `${r}-${a}`,
                                  className:
                                    "text-xs text-indigo-800 dark:text-indigo-100/90 dark:text-indigo-200",
                                },
                                r,
                              ),
                            ),
                          ),
                        ),
                      ),
            ),
          ),
        je === "settings" &&
          e.createElement(
            _,
            {
              "data-profile-tab": "settings",
              className:
                "mhub-premium-surface border border-slate-200/80 dark:border-gray-700/70 shadow-xl rounded-2xl dark:border dark:border-slate-700/80",
            },
            e.createElement(
              ee,
              {
                className:
                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-600/40 dark:border-gray-700/70 pb-3 dark:border-b dark:border-slate-700/70",
              },
              e.createElement(
                "div",
                { className: "flex items-center gap-3" },
                e.createElement(
                  "span",
                  {
                    className:
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200 dark:bg-slate-950",
                  },
                  e.createElement(ie, { className: "w-5 h-5" }),
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    te,
                    {
                      className:
                        "text-lg font-bold text-slate-900 dark:text-white dark:text-slate-100",
                    },
                    t("account_settings") || "Account Settings",
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                    tr(
                      "account_settings_desc",
                      "Manage security, notifications, privacy, and language.",
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              C,
              { className: "space-y-4" },
              he &&
                e.createElement(T, {
                  title: tr("syncing_contacts_title", "Syncing contacts"),
                  description: tr(
                    "syncing_contacts_desc",
                    "Checking permissions and syncing your contacts.",
                  ),
                  marker: "profile-settings-contacts-loading",
                }),
              contactsErrorMessage &&
                e.createElement(H, {
                  title: tr(
                    "contact_sync_unavailable",
                    "Contact sync unavailable",
                  ),
                  description: contactsErrorMessage,
                  onRetry: we,
                  retryLabel: tr("retry_sync", "Retry sync"),
                  marker: "profile-settings-contacts-error",
                  secondaryAction: e.createElement(
                    d,
                    {
                      variant: "outline",
                      "data-ux-action": "profile_contacts_sync_dismiss_error",
                      onClick: () => v(null),
                    },
                    tr("dismiss", "Dismiss"),
                  ),
                }),
              e.createElement(
                "button",
                {
                  type: "button",
                  "data-ux-action": "profile_contacts_sync_start",
                  onClick: we,
                  disabled: he,
                  className:
                    "w-full flex items-center justify-between p-4 rounded-2xl profile-panel border-emerald-200/60 dark:border-emerald-500/30 shadow-sm hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed text-left dark:border-emerald-600/60 dark:text-left",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-4" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-sm dark:bg-emerald-950/20",
                    },
                    e.createElement(B, { className: "w-5 h-5 text-emerald-600 dark:text-emerald-300" }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                      },
                      t("find_friends") || "Find Friends",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                      t("sync_contacts_desc") ||
                        "Sync contacts to connect with friends",
                    ),
                  ),
                ),
                e.createElement(K, { className: "w-5 h-5 text-emerald-400 dark:text-emerald-200" }),
              ),
              [
                {
                  icon: se,
                  labelKey: "security_settings",
                  labelFallback: "Security Settings",
                  descKey: "two_factor_auth",
                  descFallback: "Enable two-factor authentication",
                  action: "Setup",
                  link: "/security",
                  accent: "from-emerald-50 via-white to-slate-50",
                  border: "border-emerald-200/70 dark:border-emerald-800/60",
                  iconBg:
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                },
                {
                  icon: Pe,
                  labelKey: "notifications",
                  labelFallback: "Notifications",
                  descKey: "manage_push_notifications",
                  descFallback: "Manage push notifications",
                  action: "Configure",
                  link: "/notifications",
                  accent: "from-sky-50 via-white to-blue-50",
                  border: "border-sky-200/70 dark:border-sky-800/60",
                  iconBg:
                    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
                },
                {
                  icon: ie,
                  labelKey: "privacy_security",
                  labelFallback: "Privacy & Security",
                  descKey: "password_login_settings",
                  descFallback: "Password and login settings",
                  action: "Manage",
                  link: "/security",
                  accent: "from-indigo-50 via-white to-violet-50",
                  border: "border-indigo-200/70 dark:border-indigo-800/60",
                  iconBg:
                    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                },
                {
                  icon: Se,
                  labelKey: "payment_methods",
                  labelFallback: "Payment Methods",
                  descKey: "add_remove_payment_options",
                  descFallback: "Add or remove payment options",
                  action: "Update",
                  link: "/payment",
                  accent: "from-amber-50 via-white to-orange-50",
                  border: "border-amber-200/70 dark:border-amber-800/60",
                  iconBg:
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                },
              ].map((r, a) =>
                e.createElement(
                  "div",
                  {
                    key: a,
                    onClick: () => r.link && p(r.link),
                    className:
                      `flex items-center justify-between p-4 rounded-2xl border dark:border ${r.border} bg-gradient-to-br dark:bg-gradient-to-br ${r.accent} shadow-sm hover:shadow-md transition cursor-pointer`,
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-4" },
                    e.createElement(
                      "div",
                      {
                        className:
                          `w-10 h-10 rounded-xl ${r.iconBg} flex items-center justify-center shadow-sm`,
                      },
                      e.createElement(r.icon, { className: "w-5 h-5" }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                        },
                        tr(r.labelKey, r.labelFallback || r.labelKey),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                        tr(r.descKey, r.descFallback || r.descKey),
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    r.action &&
                      e.createElement(
                        "span",
                          {
                            className:
                              "hidden sm:inline-flex items-center rounded-full profile-chip px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-200",
                          },
                        r.action,
                      ),
                    e.createElement(K, { className: "w-5 h-5 text-slate-400 dark:text-slate-300" }),
                  ),
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "p-4 rounded-2xl profile-panel border-slate-200/70 dark:border-slate-600/40 shadow-sm dark:border-slate-700/70",
                },
                e.createElement(
                  "div",
                  {
                    className:
                      "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement(
                      "span",
                      {
                        className:
                          "flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300",
                      },
                      e.createElement(oe, { className: "w-5 h-5" }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-base font-bold text-slate-900 dark:text-white dark:text-slate-100",
                        },
                        t("language") || "Language",
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-slate-600 dark:text-slate-300 dark:text-slate-200" },
                        t("choose_language") ||
                          "Choose your preferred language",
                      ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "rounded-full bg-slate-900/90 px-1 py-1 shadow-sm dark:bg-slate-700/90",
                    },
                    e.createElement(gt, { compact: !0 }),
                  ),
                ),
              ),
              e.createElement(
                AccountDataActions,
                { className: "mt-8" },
              ),
            ),
          ),
        ),
      ));
};
var Jt = ProfilePage;
export { Jt as default };
