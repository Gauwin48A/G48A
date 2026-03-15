import e, {
  useState as n,
  useEffect as F,
  useCallback as L,
  useRef as ke,
  useMemo as $e,
} from "react";
import { Link as _e, useNavigate as qe } from "react-router-dom";
import { Button as d } from "@/components/ui/button";
import {
  Card as _,
  CardContent as C,
  CardHeader as ee,
  CardTitle as te,
} from "@/components/ui/card";
import { Badge as z } from "@/components/ui/badge";
import {
  Tabs as We,
  TabsContent as re,
  TabsList as Ge,
  TabsTrigger as ae,
} from "@/components/ui/tabs";
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
  XCircle as dt,
} from "lucide-react";
import { useToast as mt } from "@/hooks/use-toast";
import { getInitials as gi } from "@/lib/userDisplay";
import "../i18n";
import { useTranslation as ct } from "react-i18next";
import gt from "../components/LanguageSelector";
import { getChannelByUser as ut } from "../lib/api";
import h from "@/services/api";
import { useAuth as pt } from "@/context/AuthContext";
import {
  getAccessToken as ft,
  getUserId as xt,
  isAuthenticated as vt,
} from "@/utils/authStorage";
import { fetchCategoriesCached as bt } from "@/services/categoriesService";
import {
  hasUserSnapshotChanged as ht,
  mergeProfileIntoAuthUser as yt,
} from "@/lib/profileSync";
import {
  PageEmptyState as Nt,
  PageErrorState as H,
  PageLoadingState as T,
} from "@/components/page-state/PageStateBlocks";
const wt = () => {
  const { toast: u } = mt(),
    { t } = ct(),
    tr = (key, fallback) => t(key, { defaultValue: fallback }),
    { user: y, setUser: E, loading: O, refreshAuth: rr } = pt(),
    p = qe(),
    [m, N] = n(null),
    [de, w] = n(null),
    [Be, j] = n(!0),
    [Te, V] = n(!1),
    [f, me] = n({}),
    [A, ce] = n({}),
    [c, I] = n({ location: "", minPrice: "", maxPrice: "", categories: [] }),
    [ge, ue] = n([]),
    [J, pe] = n(!1),
    [Ee, Y] = n(null),
    [je, Ae] = n("personal"),
    [$, Ie] = n({ postCount: 0, rank: "Bronze", memberDays: 0 }),
    [profileHealthOpen, setProfileHealthOpen] = n(!1),
    [Ue, fe] = n(!0),
    [xe, ve] = n(""),
    [De, q] = n(!0),
    [be, U] = n(""),
    [he, ye] = n(!1),
    [Ne, v] = n(""),
    b = ke(0),
    refreshAttemptedRef = ke(!1),
    W = ke(y),
    S = L((r) => {
      const a = r?.id ?? r?.user_id ?? null;
      return a == null || a === "" ? null : String(a);
    }, []),
    Me = xt(y),
    G = $e(() => vt(y), [y, Me]);
  const formatRank = L(
    (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      const rankMap = {
        bronze: tr("bronze", "Bronze"),
        silver: tr("silver", "Silver"),
        gold: tr("gold", "Gold"),
        platinum: tr("platinum", "Platinum"),
        diamond: tr("diamond", "Diamond"),
      };
      return rankMap[normalized] || value || tr("unknown", "Unknown");
    },
    [tr],
  );
  F(() => {
    W.current = y;
  }, [y]);
  F(() => {
    refreshAttemptedRef.current = !1;
  }, [y]);
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
        (w(
          t("profile_login_required") ||
            "You must be logged in to view your profile.",
        ),
        j(!1));
      return;
    }
    try {
      const s = await h.get("/profile");
      if (r !== b.current) return;
      if (s && typeof s == "object" && !s.error) {
        const l = S(s);
        l && localStorage.setItem("userId", l);
        const g = yt(W.current, s, S);
        localStorage.setItem("userProfile", JSON.stringify(s)),
          localStorage.setItem("user", JSON.stringify(g)),
          N(g),
          ht(W.current, g) && E(g),
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
      console.error("Profile fetch error:", s);
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
        ? w(
            t("profile_temporarily_unavailable") ||
              "Profile is temporarily unavailable. Please retry in a moment.",
          )
        : w(
            t("profile_unavailable_desc") ||
              "We could not load your profile right now. Please retry.",
          );
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
    fe(!0), ve("");
    try {
      const o = await bt({ force: r });
      if (!a()) return;
      ue(Array.isArray(o) ? o : []);
    } catch {
      if (!a()) return;
      ue([]),
        ve(
          t("profile_categories_unavailable") ||
            "Category preferences are temporarily unavailable. Please retry.",
        );
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
        r() && (q(!1), U(""), Y(null));
        return;
      }
      r() && (q(!0), U(""));
      const [o, s, l, g] = await Promise.allSettled([
        h.get("/profile/preferences"),
        ut(a),
        h.get(`/posts/mine?userId=${a}&limit=1&page=1`),
        h.get(`/rewards/user/${a}`),
      ]);
      if (!r()) return;
      if (o.status === "fulfilled" && o.value) {
        const M = o.value;
        I({
          location: M.location ?? "",
          minPrice: M.minPrice ?? M.min_price ?? "",
          maxPrice: M.maxPrice ?? M.max_price ?? "",
          categories: Array.isArray(M.categories) ? M.categories : [],
        });
      } else
        U(
          t("profile_recommendation_unavailable") ||
            "Recommendation preferences are temporarily unavailable. Please retry.",
        );
      s.status === "fulfilled" ? Y(s.value || null) : Y(null);
      const R = l.status === "fulfilled" ? l.value : { total: 0, posts: [] },
        Oe = g.status === "fulfilled" ? g.value : { tier: "Bronze" },
        Ve = R?.total || (Array.isArray(R?.posts) ? R.posts.length : 0),
        Je = Oe?.tier || "Bronze",
        Ye = m?.created_at
          ? Math.floor(
              (Date.now() - new Date(m.created_at).getTime()) /
                (1e3 * 60 * 60 * 24),
            )
          : 0;
      Ie({ postCount: Ve, rank: Je, memberDays: Ye }), q(!1);
    },
    [S, m],
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
        v(
          t("profile_data_unavailable") ||
            "Profile data is unavailable. Reload your profile and try again.",
        );
        return;
      }
      ye(!0),
        v(""),
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
            v(
              t("contacts_sync_native_only") ||
                "Contact sync is available in the native app.",
            );
            return;
          }
          if (o.reason === "permission-denied") {
            v(
              t("contacts_permission_required") ||
                "Contacts permission is required to continue.",
            );
            return;
          }
          v(
            t("contacts_sync_none_found") ||
              "No syncable contacts were found. Please retry later.",
          );
          return;
        }
        u({
          title: t("sync_complete_title") || "Sync Complete",
          description:
            t("sync_complete_desc") || "Your contacts have been processed.",
        });
      } catch (a) {
        console.error("[Profile] Contact sync failed:", a),
          v(
            t("contacts_sync_failed") ||
              "Unable to sync contacts right now. Please retry.",
          );
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
          ce({ form: o.message || "Update failed" });
        }
    },
    He = async (r) => {
      r.preventDefault();
      try {
        const a = await h.post("/profile/preferences/update", { ...c });
        I({
          location: a.location ?? "",
          minPrice: a.min_price ?? a.minPrice ?? "",
          maxPrice: a.max_price ?? a.maxPrice ?? "",
          categories: Array.isArray(a.categories) ? a.categories : [],
        }),
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
          description: a.message,
          variant: "destructive",
        });
      }
    };
  if (O)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800",
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
          "min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700",
      },
      e.createElement(
        "div",
        { className: "pt-16 pb-12 px-6 text-center" },
        e.createElement(
          "div",
          {
            className:
              "w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-2xl",
          },
          e.createElement(B, { className: "w-12 h-12 text-white" }),
        ),
        e.createElement(
          "h1",
          { className: "text-4xl font-bold text-white mb-3" },
          t("profile") || "Profile",
        ),
        e.createElement(
          "p",
          { className: "text-white/80 text-lg max-w-md mx-auto" },
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
              "block bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300",
          },
          e.createElement(
            "div",
            { className: "flex items-center gap-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg",
              },
              e.createElement(ne, { className: "w-7 h-7 text-white" }),
            ),
            e.createElement(
              "div",
              { className: "flex-1" },
              e.createElement(
                "h3",
                { className: "text-xl font-bold text-gray-900" },
                t("login") || "Login",
              ),
              e.createElement(
                "p",
                { className: "text-gray-500 text-sm" },
                t("login_desc") || "Already have an account? Sign in here",
              ),
            ),
            e.createElement(K, { className: "w-6 h-6 text-gray-400" }),
          ),
        ),
        e.createElement(
          _e,
          {
            to: "/signup?returnTo=%2Fprofile",
            className:
              "block bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/20 hover:scale-[1.02] transition-all duration-300",
          },
          e.createElement(
            "div",
            { className: "flex items-center gap-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg",
              },
              e.createElement(Le, { className: "w-7 h-7 text-white" }),
            ),
            e.createElement(
              "div",
              { className: "flex-1" },
              e.createElement(
                "h3",
                { className: "text-xl font-bold text-white" },
                t("signup") || "Create Account",
              ),
              e.createElement(
                "p",
                { className: "text-white/70 text-sm" },
                t("signup_desc") || "New user? Join us in just a few steps",
              ),
            ),
            e.createElement(K, { className: "w-6 h-6 text-white/60" }),
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "max-w-lg mx-auto px-6 mt-10 page-shell page-pad" },
        e.createElement(
          "p",
          { className: "text-center text-white/60 text-sm mb-6" },
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
              { key: a, className: "bg-white/10 rounded-xl p-4 text-center" },
              e.createElement(r.icon, {
                className: "w-6 h-6 mx-auto mb-2 text-white/80",
              }),
              e.createElement(
                "p",
                { className: "text-white/80 text-xs font-medium" },
                r.label,
              ),
            ),
          ),
        ),
      ),
    );
  if (Be)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800",
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
  if (de || !m)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-800",
      },
      e.createElement(
        "div",
        { className: "w-full max-w-md px-4 page-shell page-pad" },
        e.createElement(H, {
          title: t("profile_not_found") || "Profile not found",
          description:
            de ||
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
  const emailStepDone = emailVerified || (!emailVerified && !!i?.email);
  const phoneStepDone = phoneVerified || (!phoneVerified && !!i?.phone);
  const kycStepDone = kycVerified;
  const verificationTotal = 3;
  const verificationDone = [emailStepDone, phoneStepDone, kycStepDone].filter(
    Boolean,
  ).length;
  const verificationPercent = Math.round(
    (verificationDone / verificationTotal) * 100,
  );
  const emailLabel = emailVerified
    ? tr("email_verified", "Email verified")
    : tr("email_added", "Email added");
  const phoneLabel = phoneVerified
    ? tr("phone_verified", "Phone verified")
    : tr("phone_added", "Phone added");
  const kycLabel = kycVerified
    ? tr("kyc_verified", "KYC verified")
    : tr("kyc_pending", "KYC pending");
  const emailStatus = emailVerified
    ? tr("verified", "Verified")
    : i?.email
      ? tr("added", "Added")
      : tr("missing", "Missing");
  const phoneStatus = phoneVerified
    ? tr("verified", "Verified")
    : i?.phone
      ? tr("added", "Added")
      : tr("missing", "Missing");
  const kycStatus = kycVerified
    ? tr("verified", "Verified")
    : tr("pending", "Pending");
  return e.createElement(
    "div",
    {
      className: "min-h-screen bg-slate-50 dark:bg-gray-900",
    },
    e.createElement(
      "div",
      { className: "relative overflow-hidden" },
      e.createElement("div", {
        className:
          "absolute inset-0 bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500",
      }),
      e.createElement("div", {
        className: "absolute inset-0 opacity-10",
        style: {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        },
      }),
      e.createElement(
        "div",
        { className: "relative max-w-4xl mx-auto px-4 py-8 sm:py-10 sm:px-6 page-shell page-pad" },
        e.createElement(
          "div",
          {
            className: "grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)_minmax(240px,320px)] items-start gap-6",
          },
          e.createElement(
            "div",
            { className: "relative group justify-self-center md:justify-self-start" },
            e.createElement(
              Xe,
              {
                className:
                  "h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-white/30 shadow-xl",
              },
              i.avatar_url
                ? e.createElement(Qe, { src: i.avatar_url })
                : e.createElement(
                    Ze,
                    {
                      className:
                        "text-3xl font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600",
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
                          E(g),
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
                } catch {
                  u({
                    title: t("upload_error") || "Upload error",
                    variant: "destructive",
                  });
                }
              },
            }),
            e.createElement(
              "button",
              {
                onClick: () =>
                  document.getElementById("avatar-upload")?.click(),
                className:
                  "absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition group-hover:bg-blue-50",
                "aria-label": t("change_profile_photo") || "Change profile photo",
              },
              e.createElement(st, { className: "w-5 h-5 text-blue-600" }),
            ),
          ),
          e.createElement(
            "div",
            { className: "text-center md:text-left min-w-0" },
            e.createElement(
              "h1",
              {
                className:
                  "text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight break-words",
                title: i.name || i.full_name || "",
              },
              i.name || i.full_name,
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-white/80 mb-2 truncate max-w-[260px] sm:max-w-md md:max-w-full",
                title: i.email || "",
              },
              i.email,
            ),
            e.createElement(
              "div",
              {
                className:
                  "flex flex-wrap items-center justify-center md:justify-start gap-2",
              },
              e.createElement(
                z,
                {
                  className: i.verified
                    ? "bg-emerald-500/20 text-emerald-50 border border-emerald-200/40"
                    : "bg-amber-500/20 text-amber-50 border border-amber-200/40",
                },
                e.createElement(se, { className: "w-3 h-3 mr-1" }),
                " ",
                i.verified ? t("verified") || "Verified" : t("unverified"),
              ),
              !i.verified &&
                e.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => p("/verification"),
                    className:
                      "text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25",
                  },
                  t("verify_now") || "Verify now",
                ),
              e.createElement(
                z,
                { className: "bg-white/15 text-white border border-white/20" },
                e.createElement(le, { className: "w-3 h-3 mr-1" }),
                " ",
                t(i.role?.toLowerCase()) || i.role || t("member"),
              ),
              Ee &&
                e.createElement(
                  z,
                  { className: "bg-purple-500/80 text-white border-0" },
                  e.createElement(Le, { className: "w-3 h-3 mr-1" }),
                  " ",
                  t("channel_owner"),
                ),
            ),
          ),
          e.createElement(
            "div",
            {
              className: "w-full lg:justify-self-end text-left lg:text-right lg:w-[300px]",
            },
            e.createElement(
              "div",
              {
                className: "rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-white",
              },
              e.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-between text-xs text-white/80",
                },
                e.createElement(
                  "span",
                  null,
                  tr("profile_completion", "Profile") +
                    " " +
                    verificationPercent +
                    "% " +
                    (t("complete") || "complete"),
                ),
                e.createElement(
                  "span",
                  null,
                  verificationDone + "/" + verificationTotal,
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-2 h-2.5 w-full rounded-full bg-white/20 overflow-hidden",
                },
                e.createElement("div", {
                  className: "h-full rounded-full bg-emerald-400",
                  style: { width: verificationPercent + "%" },
                }),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-2 hidden sm:flex flex-wrap justify-start md:justify-end gap-1.5 text-[11px] text-white/85",
                },
                e.createElement(
                  "span",
                  {
                    className: emailStepDone
                      ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-emerald-200/40 bg-emerald-400/20"
                      : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-white/20 bg-white/10",
                  },
                  e.createElement(rt, { className: "w-3 h-3" }),
                  emailLabel,
                ),
                e.createElement(
                  "span",
                  {
                    className: phoneStepDone
                      ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-emerald-200/40 bg-emerald-400/20"
                      : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-white/20 bg-white/10",
                  },
                  e.createElement(tt, { className: "w-3 h-3" }),
                  phoneLabel,
                ),
                e.createElement(
                  "span",
                  {
                    className: kycStepDone
                      ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-emerald-200/40 bg-emerald-400/20"
                      : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-white/20 bg-white/10",
                  },
                  e.createElement(se, { className: "w-3 h-3" }),
                  kycLabel,
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "mt-3 flex flex-wrap items-center gap-2 md:justify-end",
              },
              e.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setProfileHealthOpen((r) => !r),
                  className:
                    "inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25 transition",
                  "aria-expanded": profileHealthOpen,
                  "aria-controls": "profile-health-details",
                },
                e.createElement(Le, { className: "w-3.5 h-3.5" }),
                tr("profile_health", "Profile health"),
                e.createElement(
                  "span",
                  {
                    className:
                      "ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold",
                  },
                  verificationPercent + "%",
                ),
              ),
              e.createElement(
                "a",
                {
                  href: "#profile-details",
                  onClick: (r) => {
                    r.preventDefault();
                    const a =
                      typeof document !== "undefined"
                        ? document.getElementById("profile-details")
                        : null;
                    a &&
                      a.scrollIntoView({ behavior: "smooth", block: "start" });
                  },
                  className:
                    "inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1 text-xs text-white/90 hover:bg-white/15 transition",
                },
                tr("jump_to_details", "Jump to Details"),
                e.createElement(K, { className: "w-3.5 h-3.5" }),
              ),
            ),
            profileHealthOpen &&
              e.createElement(
                "div",
                {
                  id: "profile-health-details",
                  className:
                    "mt-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[12px] text-white/90 space-y-2",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-2" },
                    e.createElement(rt, { className: "w-3.5 h-3.5" }),
                    e.createElement("span", null, t("email") || "Email"),
                  ),
                  e.createElement(
                    "span",
                    {
                      className: emailVerified
                        ? "text-emerald-200"
                        : "text-amber-100",
                    },
                    emailStatus,
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-2" },
                    e.createElement(tt, { className: "w-3.5 h-3.5" }),
                    e.createElement("span", null, t("phone") || "Phone"),
                  ),
                  e.createElement(
                    "span",
                    {
                      className: phoneVerified
                        ? "text-emerald-200"
                        : "text-amber-100",
                    },
                    phoneStatus,
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-2" },
                    e.createElement(se, { className: "w-3.5 h-3.5" }),
                    e.createElement("span", null, tr("kyc", "KYC")),
                  ),
                  e.createElement(
                    "span",
                    {
                      className: kycVerified
                        ? "text-emerald-200"
                        : "text-amber-100",
                    },
                    kycStatus,
                  ),
                ),
              ),
            e.createElement(
              "div",
              { className: "mt-4 flex flex-wrap items-center gap-2 md:justify-end" },
              e.createElement(
                d,
                {
                  onClick: () => V(!0),
                  className: "h-10 px-4 bg-white text-indigo-700 hover:bg-white/95 font-bold shadow-lg ring-2 ring-white/70 ring-offset-2 ring-offset-indigo-500/40 rounded-xl",
                },
                e.createElement(et, { className: "w-4 h-4 mr-2" }),
                " ",
                t("edit_profile") || "Edit Profile",
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
          "max-w-4xl mx-auto px-4 mt-4 sm:mt-6 mb-8 relative z-10 space-y-5 page-shell page-pad",
      },
      e.createElement(
        "p",
        {
          className:
            "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
        },
        tr("overview", "Overview"),
      ),
      e.createElement(
        "div",
        {
          className:
            "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800",
        },
        e.createElement(
          "div",
          {
            className:
              "flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-gray-700",
          },
          e.createElement(
            "div",
            { className: "flex-1 flex items-center gap-3 px-5 py-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center",
              },
              e.createElement(it, { className: "w-5 h-5 text-green-600" }),
            ),
            e.createElement(
              "div",
              null,
              e.createElement(
                "p",
                { className: "text-xs uppercase tracking-wide text-gray-500" },
                t("posts_count") || "Posts",
              ),
              e.createElement(
                "p",
                {
                  className: "text-xl font-bold text-gray-800 dark:text-white",
                },
                $.postCount,
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "flex-1 flex items-center gap-3 px-5 py-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center",
              },
              e.createElement(ot, { className: "w-5 h-5 text-yellow-600" }),
            ),
            e.createElement(
              "div",
              null,
              e.createElement(
                "p",
                { className: "text-xs uppercase tracking-wide text-gray-500" },
                t("rank") || "Rank",
              ),
              e.createElement(
                "p",
                {
                  className: "text-xl font-bold text-gray-800 dark:text-white",
                },
                formatRank($.rank),
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "flex-1 flex items-center gap-3 px-5 py-4" },
            e.createElement(
              "div",
              {
                className:
                  "w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center",
              },
              e.createElement(at, { className: "w-5 h-5 text-blue-600" }),
            ),
            e.createElement(
              "div",
              null,
              e.createElement(
                "p",
                { className: "text-xs uppercase tracking-wide text-gray-500" },
                t("days") || "Days",
              ),
              e.createElement(
                "p",
                {
                  className: "text-xl font-bold text-gray-800 dark:text-white",
                },
                $.memberDays,
              ),
            ),
          ),
        ),
      ),
      e.createElement(
        "div",
        {
          className:
            "rounded-2xl border border-slate-200 bg-white shadow-sm p-5 dark:border-gray-700 dark:bg-gray-800",
        },
        e.createElement(
          "p",
          {
            className:
              "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300",
          },
          tr("quick_actions", "Quick actions"),
        ),
        e.createElement(
          "div",
          {
            className:
              "mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
          },
          e.createElement(
            d,
            {
              onClick: () => p("/my-home"),
              className:
                "min-h-[90px] py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg rounded-xl flex items-center gap-3 justify-start transition-transform hover:scale-[1.02]",
            },
            e.createElement(lt, { className: "w-6 h-6" }),
            e.createElement(
              "div",
              { className: "text-left min-w-0" },
              e.createElement(
                "p",
                { className: "font-bold text-lg truncate" },
                t("my_home"),
              ),
              e.createElement(
                "p",
                { className: "text-xs text-blue-100 font-normal break-words" },
                t("access_dashboard"),
              ),
            ),
          ),
          e.createElement(
            d,
            {
              onClick: () => p("/my-feed"),
              className:
                "min-h-[90px] py-4 px-4 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm rounded-xl flex items-center gap-3 justify-start transition-transform hover:scale-[1.01] dark:bg-gray-800/80 dark:border-gray-700 dark:text-white",
            },
            e.createElement(nt, { className: "w-6 h-6" }),
            e.createElement(
              "div",
              { className: "text-left min-w-0" },
              e.createElement(
                "p",
                { className: "font-bold text-lg truncate" },
                t("my_feed"),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-xs text-slate-500 font-normal dark:text-slate-300 break-words",
                },
                t("view_feed"),
              ),
            ),
          ),
          e.createElement(
            d,
            {
              onClick: () => p("/saledone"),
              className:
                "min-h-[90px] py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg rounded-xl flex items-center gap-3 justify-start transition-transform hover:scale-[1.02]",
            },
            e.createElement(ne, { className: "w-6 h-6" }),
            e.createElement(
              "div",
              { className: "text-left min-w-0" },
              e.createElement(
                "p",
                { className: "font-bold text-lg truncate" },
                t("btn_sale_done") || "Sale Done",
              ),
              e.createElement(
                "p",
                {
                  className: "text-xs text-emerald-100 font-normal break-words",
                },
                tr("sale_done_desc", "Mark a sale as completed"),
              ),
            ),
          ),
          e.createElement(
            d,
            {
              onClick: () => p("/saleundone"),
              className:
                "min-h-[90px] py-4 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-lg rounded-xl flex items-center gap-3 justify-start transition-transform hover:scale-[1.02]",
            },
            e.createElement(dt, { className: "w-6 h-6" }),
            e.createElement(
              "div",
              { className: "text-left min-w-0" },
              e.createElement(
                "p",
                { className: "font-bold text-lg truncate" },
                t("btn_sale_undone") || "Sale Undone",
              ),
              e.createElement(
                "p",
                { className: "text-xs text-rose-100 font-normal break-words" },
                tr("profile_sale_undone_desc", "Report an issue with a sale"),
              ),
            ),
          ),
        ),
      ),
    ),
    e.createElement(
      "div",
      { id: "profile-details", className: "max-w-4xl mx-auto px-4 pb-12 page-shell page-pad" },
      e.createElement(
        We,
        { value: je, onValueChange: Ae, className: "w-full" },
        e.createElement(
          Ge,
          {
            className:
              "w-full flex bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg mb-6",
          },
          e.createElement(
            ae,
            {
              value: "personal",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold",
            },
            e.createElement(B, { className: "w-4 h-4 mr-2" }),
            " ",
            t("personal"),
          ),
          e.createElement(
            ae,
            {
              value: "preferences",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold",
            },
            e.createElement(oe, { className: "w-4 h-4 mr-2" }),
            " ",
            t("preferences"),
          ),
          e.createElement(
            ae,
            {
              value: "settings",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white py-3 font-semibold",
            },
            e.createElement(ie, { className: "w-4 h-4 mr-2" }),
            " ",
            t("settings"),
          ),
        ),
        e.createElement(
          re,
          { value: "personal" },
          e.createElement(
            _,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            e.createElement(
              ee,
              null,
              e.createElement(
                te,
                { className: "flex items-center gap-2" },
                e.createElement(B, { className: "w-5 h-5 text-blue-600" }),
                " ",
                t("personal_information") || "Personal Information",
              ),
            ),
            e.createElement(
              C,
              { className: "space-y-6" },
              Te
                ? e.createElement(
                    "form",
                    { onSubmit: Ke, className: "space-y-4" },
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        x,
                        { htmlFor: "full_name" },
                        t("full_name") || "Full Name",
                      ),
                      e.createElement(P, {
                        id: "full_name",
                        name: "full_name",
                        value: f.full_name,
                        onChange: D,
                        className: "mt-1",
                      }),
                      A.full_name &&
                        e.createElement(
                          "p",
                          { className: "text-red-500 text-sm mt-1" },
                          A.full_name,
                        ),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        x,
                        { htmlFor: "phone" },
                        t("phone") || "Phone",
                      ),
                      e.createElement(P, {
                        id: "phone",
                        name: "phone",
                        value: f.phone,
                        onChange: D,
                        className: "mt-1",
                      }),
                      A.phone &&
                        e.createElement(
                          "p",
                          { className: "text-red-500 text-sm mt-1" },
                          A.phone,
                        ),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        x,
                        { htmlFor: "address" },
                        t("address") || "Address",
                      ),
                      e.createElement(P, {
                        id: "address",
                        name: "address",
                        value: f.address,
                        onChange: D,
                        className: "mt-1",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(x, { htmlFor: "bio" }, t("bio") || "Bio"),
                      e.createElement(P, {
                        id: "bio",
                        name: "bio",
                        value: f.bio,
                        onChange: D,
                        className: "mt-1",
                        placeholder:
                          t("about_yourself") || "Tell us about yourself...",
                      }),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex gap-3 pt-4" },
                      e.createElement(
                        d,
                        {
                          type: "submit",
                          className:
                            "flex-1 bg-gradient-to-r from-blue-500 to-indigo-600",
                        },
                        t("save_changes") || "Save Changes",
                      ),
                      e.createElement(
                        d,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => V(!1),
                        },
                        t("cancel") || "Cancel",
                      ),
                    ),
                  )
                : e.createElement(
                    "div",
                    { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                    e.createElement(
                      "div",
                      {
                        className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-xl",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(B, {
                          className: "w-5 h-5 text-blue-500",
                        }),
                        e.createElement(
                          "span",
                          { className: "text-sm text-gray-500" },
                          t("full_name") || "Full Name",
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-gray-800 dark:text-white",
                        },
                        i.name || i.full_name || "-",
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-xl",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(rt, {
                          className: "w-5 h-5 text-blue-500",
                        }),
                        e.createElement(
                          "span",
                          { className: "text-sm text-gray-500" },
                          t("email") || "Email",
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-gray-800 dark:text-white",
                        },
                        i.email || "-",
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-xl",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(tt, {
                          className: "w-5 h-5 text-blue-500",
                        }),
                        e.createElement(
                          "span",
                          { className: "text-sm text-gray-500" },
                          t("phone") || "Phone",
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-gray-800 dark:text-white",
                        },
                        i.phone || "-",
                      ),
                    ),
                    e.createElement(
                      "div",
                      {
                        className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-xl",
                      },
                      e.createElement(
                        "div",
                        { className: "flex items-center gap-3 mb-2" },
                        e.createElement(Ce, {
                          className: "w-5 h-5 text-blue-500",
                        }),
                        e.createElement(
                          "span",
                          { className: "text-sm text-gray-500" },
                          t("address") || "Address",
                        ),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-gray-800 dark:text-white",
                        },
                        i.address || "-",
                      ),
                    ),
                  ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800",
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
                          "w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center",
                      },
                      e.createElement(se, { className: "w-5 h-5 text-white" }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className: "text-sm text-gray-500 dark:text-gray-400",
                        },
                        t("your_user_id"),
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
                      variant: "outline",
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
                        "border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/30",
                    },
                    e.createElement(Re, { className: "w-4 h-4 mr-1" }),
                    " ",
                    t("copy") || "Copy",
                  ),
                ),
                e.createElement(
                  "p",
                  {
                    className: "text-xs text-gray-500 dark:text-gray-400 mt-2",
                  },
                  "\uD83D\uDCA1 ",
                  t("use_id_for_forms"),
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800",
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
                          "w-10 h-10 rounded-full bg-green-500 flex items-center justify-center",
                      },
                      e.createElement(ne, { className: "w-5 h-5 text-white" }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-green-800 dark:text-green-300",
                        },
                        t("verification_status"),
                      ),
                      e.createElement(
                        "p",
                        {
                          className:
                            "text-sm text-green-600 dark:text-green-400",
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
                        className: "bg-green-600 hover:bg-green-700",
                      },
                      t("verify_now"),
                    ),
                ),
              ),
            ),
          ),
        ),
        e.createElement(
          re,
          { value: "preferences", forceMount: !0 },
          e.createElement(
            _,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            e.createElement(
              ee,
              { className: "flex flex-row items-center justify-between" },
              e.createElement(
                te,
                { className: "flex items-center gap-2" },
                e.createElement(oe, { className: "w-5 h-5 text-blue-600" }),
                " ",
                t("recommendation_preferences") || "Recommendation Preferences",
              ),
              e.createElement(
                d,
                { size: "sm", variant: "outline", onClick: () => pe(!J) },
                J ? t("cancel") || "Cancel" : t("edit") || "Edit",
              ),
            ),
            e.createElement(
              C,
              null,
              e.createElement(
                "p",
                { className: "text-gray-500 mb-6" },
                t("preferences_desc") ||
                  "These preferences are used to show personalized recommendations on your feed.",
              ),
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
                : be
                  ? e.createElement(H, {
                      title: tr(
                        "profile_recommendation_preferences_unavailable",
                        "Recommendation preferences unavailable",
                      ),
                      description: be,
                      onRetry: Fe,
                      retryLabel: tr("retry", "Retry"),
                      marker: "profile-preferences-error",
                      secondaryAction: e.createElement(
                        d,
                        {
                          variant: "outline",
                          "data-ux-action": "profile_preferences_clear_error",
                          onClick: () => U(""),
                        },
                        t("continue_anyway") || "Continue anyway",
                      ),
                    })
                  : J
                    ? e.createElement(
                        "form",
                        { onSubmit: He, className: "space-y-4" },
                        e.createElement(
                          "div",
                          null,
                          e.createElement(
                            x,
                            null,
                            t("preferred_location") || "Preferred Location",
                          ),
                          e.createElement(
                            "select",
                            {
                              name: "location",
                              value: c.location,
                              onChange: Q,
                              className:
                                "w-full mt-1 p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600",
                            },
                            e.createElement(
                              "option",
                              { value: "" },
                              t("any_location") || "Any Location",
                            ),
                            e.createElement(
                              "option",
                              { value: "Delhi" },
                              tr("delhi", "Delhi"),
                            ),
                            e.createElement(
                              "option",
                              { value: "Mumbai" },
                              tr("mumbai", "Mumbai"),
                            ),
                            e.createElement(
                              "option",
                              { value: "Bangalore" },
                              tr("bangalore", "Bangalore"),
                            ),
                            e.createElement(
                              "option",
                              { value: "Chennai" },
                              tr("chennai", "Chennai"),
                            ),
                            e.createElement(
                              "option",
                              { value: "Kolkata" },
                              tr("kolkata", "Kolkata"),
                            ),
                            e.createElement(
                              "option",
                              { value: "Hyderabad" },
                              tr("hyderabad", "Hyderabad"),
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          null,
                          e.createElement(
                            x,
                            null,
                            t("preferred_categories") || "Preferred Categories",
                          ),
                          e.createElement(
                            "p",
                            { className: "text-sm text-gray-500 mb-2" },
                            t("select_categories_desc") ||
                              "Select categories to see in For You page",
                          ),
                          Ue
                            ? e.createElement(T, {
                                title: tr(
                                  "loading_categories",
                                  "Loading categories",
                                ),
                                description: tr(
                                  "loading_categories_desc",
                                  "Getting category options for personalization.",
                                ),
                                marker: "profile-categories-loading",
                              })
                            : xe
                              ? e.createElement(H, {
                                  title: tr(
                                    "profile_category_options_unavailable",
                                    "Category options unavailable",
                                  ),
                                  description: xe,
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
                                    tr("retry_categories", "Retry categories"),
                                  ),
                                })
                              : ge.length === 0
                                ? e.createElement(Nt, {
                                    title: tr(
                                      "profile_no_categories_available",
                                      "No categories available",
                                    ),
                                    description: tr(
                                      "profile_no_categories_available_desc",
                                      "Try again in a moment to load category options.",
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
                                        "retry_categories",
                                        "Retry categories",
                                      ),
                                    ),
                                  })
                                : e.createElement(
                                    "div",
                                    {
                                      className:
                                        "grid grid-cols-2 md:grid-cols-3 gap-2",
                                    },
                                    ge.map((r) =>
                                      e.createElement(
                                        "label",
                                        {
                                          key: r.category_id || r.name,
                                          className: `flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${c.categories?.includes(r.name) ? "bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400" : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:border-blue-300"}`,
                                        },
                                        e.createElement("input", {
                                          type: "checkbox",
                                          checked:
                                            c.categories?.includes(r.name) ||
                                            !1,
                                          onChange: (a) => {
                                            const o = r.name;
                                            I((s) => ({
                                              ...s,
                                              categories: a.target.checked
                                                ? [...(s.categories || []), o]
                                                : (s.categories || []).filter(
                                                    (l) => l !== o,
                                                  ),
                                            }));
                                          },
                                          className: "w-4 h-4 text-blue-600",
                                        }),
                                        e.createElement(
                                          "span",
                                          {
                                            className:
                                              "text-sm font-medium text-gray-700 dark:text-gray-200",
                                          },
                                          r.name,
                                        ),
                                      ),
                                    ),
                                  ),
                        ),
                        e.createElement(
                          "div",
                          { className: "grid grid-cols-2 gap-4" },
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              x,
                              null,
                              t("min_price") || "Min Price",
                              " (\u20B9)",
                            ),
                            e.createElement(P, {
                              name: "minPrice",
                              type: "number",
                              value: c.minPrice,
                              onChange: Q,
                              className: "mt-1",
                              placeholder: "0",
                            }),
                          ),
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              x,
                              null,
                              t("max_price") || "Max Price",
                              " (\u20B9)",
                            ),
                            e.createElement(P, {
                              name: "maxPrice",
                              type: "number",
                              value: c.maxPrice,
                              onChange: Q,
                              className: "mt-1",
                              placeholder: "100000",
                            }),
                          ),
                        ),
                        e.createElement(
                          d,
                          {
                            type: "submit",
                            className:
                              "w-full bg-gradient-to-r from-blue-500 to-indigo-600",
                          },
                          t("save_preferences") || "Save Preferences",
                        ),
                      )
                    : e.createElement(
                        "div",
                        { className: "space-y-6" },
                        e.createElement(
                          "div",
                          {
                            className: "grid grid-cols-1 md:grid-cols-3 gap-4",
                          },
                          e.createElement(
                            "div",
                            {
                              className:
                                "p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center",
                            },
                            e.createElement(Ce, {
                              className: "w-6 h-6 mx-auto mb-2 text-blue-600",
                            }),
                            e.createElement(
                              "p",
                              { className: "text-sm text-gray-500" },
                              t("location") || "Location",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "font-bold text-gray-800 dark:text-white",
                              },
                              c.location || t("any") || "Any",
                            ),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center",
                            },
                            e.createElement(
                              "p",
                              { className: "text-sm text-gray-500 mb-1" },
                              t("min_price") || "Min Price",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "font-bold text-gray-800 dark:text-white text-xl",
                              },
                              "\u20B9",
                              c.minPrice || "0",
                            ),
                          ),
                          e.createElement(
                            "div",
                            {
                              className:
                                "p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center",
                            },
                            e.createElement(
                              "p",
                              { className: "text-sm text-gray-500 mb-1" },
                              t("max_price") || "Max Price",
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "font-bold text-gray-800 dark:text-white text-xl",
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
                              "p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl",
                          },
                          e.createElement(
                            "p",
                            { className: "text-sm text-gray-500 mb-2" },
                            t("preferred_categories") || "Preferred Categories",
                          ),
                          c.categories && c.categories.length > 0
                            ? e.createElement(
                                "div",
                                { className: "flex flex-wrap gap-2" },
                                c.categories.map((r) =>
                                  e.createElement(
                                    z,
                                    {
                                      key: r,
                                      className:
                                        "bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200 border-0 px-3 py-1",
                                    },
                                    r,
                                  ),
                                ),
                              )
                            : e.createElement(
                                "p",
                                { className: "text-gray-400 italic" },
                                t("no_categories_selected") ||
                                  "No categories selected - showing all",
                              ),
                        ),
                      ),
            ),
          ),
        ),
        e.createElement(
          re,
          { value: "settings" },
          e.createElement(
            _,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            e.createElement(
              ee,
              null,
              e.createElement(
                te,
                { className: "flex items-center gap-2" },
                e.createElement(ie, { className: "w-5 h-5 text-blue-600" }),
                " ",
                t("account_settings") || "Account Settings",
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
              Ne &&
                e.createElement(H, {
                  title: tr(
                    "contact_sync_unavailable",
                    "Contact sync unavailable",
                  ),
                  description: Ne,
                  onRetry: we,
                  retryLabel: tr("retry_sync", "Retry sync"),
                  marker: "profile-settings-contacts-error",
                  secondaryAction: e.createElement(
                    d,
                    {
                      variant: "outline",
                      "data-ux-action": "profile_contacts_sync_dismiss_error",
                      onClick: () => v(""),
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
                    "w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed text-left",
                },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-4" },
                  e.createElement(
                    "div",
                    {
                      className:
                        "w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center",
                    },
                    e.createElement(B, { className: "w-5 h-5 text-green-600" }),
                  ),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "font-semibold text-gray-800 dark:text-white",
                      },
                      t("find_friends") || "Find Friends",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500" },
                      t("sync_contacts_desc") ||
                        "Sync contacts to connect with friends",
                    ),
                  ),
                ),
                e.createElement(K, { className: "w-5 h-5 text-gray-400" }),
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
                },
                {
                  icon: Pe,
                  labelKey: "notifications",
                  labelFallback: "Notifications",
                  descKey: "manage_push_notifications",
                  descFallback: "Manage push notifications",
                  action: "Configure",
                  link: "/notifications",
                },
                {
                  icon: ie,
                  labelKey: "privacy_security",
                  labelFallback: "Privacy & Security",
                  descKey: "password_login_settings",
                  descFallback: "Password and login settings",
                  action: "Manage",
                  link: "/security",
                },
                {
                  icon: Se,
                  labelKey: "payment_methods",
                  labelFallback: "Payment Methods",
                  descKey: "add_remove_payment_options",
                  descFallback: "Add or remove payment options",
                  action: "Update",
                  link: "/payment",
                },
              ].map((r, a) =>
                e.createElement(
                  "div",
                  {
                    key: a,
                    onClick: () => r.link && p(r.link),
                    className:
                      "flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-4" },
                    e.createElement(
                      "div",
                      {
                        className:
                          "w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center",
                      },
                      e.createElement(r.icon, {
                        className: "w-5 h-5 text-blue-600",
                      }),
                    ),
                    e.createElement(
                      "div",
                      null,
                      e.createElement(
                        "p",
                        {
                          className:
                            "font-semibold text-gray-800 dark:text-white",
                        },
                        tr(r.labelKey, r.labelFallback || r.labelKey),
                      ),
                      e.createElement(
                        "p",
                        { className: "text-sm text-gray-500" },
                        tr(r.descKey, r.descFallback || r.descKey),
                      ),
                    ),
                  ),
                  e.createElement(K, { className: "w-5 h-5 text-gray-400" }),
                ),
              ),
              e.createElement(
                "div",
                { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-xl" },
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className:
                          "font-semibold text-gray-800 dark:text-white",
                      },
                      t("language") || "Language",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500" },
                      t("choose_language") || "Choose your preferred language",
                    ),
                  ),
                  e.createElement(gt, null),
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-8 p-4 border-2 border-red-200 dark:border-red-800 rounded-xl",
                },
                e.createElement(
                  "p",
                  { className: "font-semibold text-red-600 mb-2" },
                  t("danger_zone") || "Danger Zone",
                ),
                e.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  e.createElement(
                    "p",
                    { className: "text-sm text-gray-500" },
                    t("delete_account_desc") ||
                      "Delete your account permanently",
                  ),
                  e.createElement(
                    d,
                    { variant: "destructive", size: "sm" },
                    t("delete_account") || "Delete Account",
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
};
var Jt = wt;
export { Jt as default };

