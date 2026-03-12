import e, {
  useState as n,
  useEffect as E,
  useMemo as K,
  useCallback as W,
} from "react";
import {
  Card as l,
  CardContent as i,
  CardHeader as b,
  CardTitle as v,
} from "@/components/ui/card";
import { Button as o } from "@/components/ui/button";
import { Badge as m } from "@/components/ui/badge";
import { Avatar as I, AvatarFallback as L } from "@/components/ui/avatar";
import {
  Tabs as Z,
  TabsList as O,
  TabsTrigger as k,
  TabsContent as C,
} from "@/components/ui/tabs";
import {
  Copy as H,
  Gift as A,
  Star as Q,
  Trophy as R,
  Users as _,
  Zap as ee,
  TrendingUp as te,
  Calendar as re,
  Share2 as T,
  Award as ae,
  Crown as se,
  Sparkles as le,
  Target as P,
  CheckCircle2 as ie,
  Circle as oe,
  ArrowRight as de,
} from "lucide-react";
import ne from "../lib/api";
import { useTranslation as me } from "react-i18next";
import { useToast as ge } from "@/hooks/use-toast";
import { Link as z } from "react-router-dom";
import { useAuth as xe } from "@/context/AuthContext";
const fe = () => {
  const [r, M] = n(null),
    [N, U] = n([]),
    [F, g] = n(!0),
    [B, x] = n(null),
    [V, q] = n("overview"),
    [D, S] = n(0),
    [publicWall, setPublicWall] = n({
      topSellers: [],
      topBuyers: [],
      topUsers: [],
    }),
    [publicWallLoading, setPublicWallLoading] = n(!1),
    [secretCountdown, setSecretCountdown] = n(""),
    [leaderboardCountdown, setLeaderboardCountdown] = n(""),
    [rewardLog, setRewardLog] = n([]),
    [rewardLogLoading, setRewardLogLoading] = n(!1),
    { t: a } = me(),
    { toast: G } = ge(),
    { user: j } = xe(),
    d = K(
      () =>
        !!(
          j ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("token")
        ),
      [j],
    ),
    resolveMessage = W(
      (t) => {
        if (!t) return "";
        if (typeof t === "string") return t;
        const s = t.key ? a(t.key, t.params) : "";
        if (typeof s == "string" && s && s !== t.key) return s;
        return t.fallback || "";
      },
      [a],
    ),
    formatCountdown = W(
      (t) => {
        if (!t) return "";
        const s = new Date(t).getTime();
        if (Number.isNaN(s)) return "";
        const f = s - Date.now();
        if (f <= 0) return a("expired") || "Expired";
        const u = Math.ceil(f / 6e4);
        const h = Math.floor(u / 60);
        const p = u % 60;
        if (h >= 24) {
          const y = Math.floor(h / 24);
          const X = h % 24;
          return `${y}d ${X}h`;
        }
        return `${h}h ${p}m`;
      },
      [a],
    ),
    p = W(
      async ({ silent: t = !1 } = {}) => {
        if (!d) {
          (x({
            key: "rewards_login_required",
            fallback: "You must be logged in to view rewards.",
          }),
            g(!1));
          return;
        }
        const s = localStorage.getItem("userId"),
          f =
            localStorage.getItem("authToken") || localStorage.getItem("token");
        if (
          (f &&
            !localStorage.getItem("authToken") &&
            localStorage.setItem("authToken", f),
          !s || !f)
        ) {
          (x({
            key: "rewards_login_required",
            fallback: "You must be logged in to view rewards.",
          }),
            g(!1));
          return;
        }
        (t || g(!0), x(null));
        try {
          const u = await ne.get(`/rewards?userId=${s}`);
          u && (M(u.user || null), U(u.referralChain || []));
        } catch (u) {
          t ||
            x({
              key: "rewards_fetch_failed",
              fallback: u.message || "Failed to fetch rewards",
            });
        } finally {
          t || g(!1);
        }
      },
      [d],
    );
  const errorMessage = resolveMessage(B);
  (E(() => {
    if (!d) {
      (x({
        key: "rewards_login_required",
        fallback: "You must be logged in to view rewards.",
      }),
        g(!1));
      return;
    }
    p({ silent: !1 });
  }, [d, D, p]),
    E(() => {
      if (!d) return;
      const t = new EventSource("/api/rewards/stream", { withCredentials: !0 }),
        s = () => {
          p({ silent: !0 });
        };
      return (
        t.addEventListener("reward_update", s),
        (t.onerror = () => {}),
        () => {
          (t.removeEventListener("reward_update", s), t.close());
        }
      );
    }, [d, p]));
  E(() => {
    if (!d) return;
    let t = !0;
    (async () => {
      try {
        setPublicWallLoading(!0);
        const s = await ne.get("/public-wall");
        if (!t) return;
        setPublicWall({
          topSellers: s?.topSellers || [],
          topBuyers: s?.topBuyers || [],
          topUsers: s?.topUsers || [],
        });
      } catch {
        if (!t) return;
        setPublicWall({ topSellers: [], topBuyers: [], topUsers: [] });
      } finally {
        if (t) setPublicWallLoading(!1);
      }
    })();
    return () => {
      t = !1;
    };
  }, [d]);
  E(() => {
    if (!d) return;
    let t = !0;
    (async () => {
      try {
        setRewardLogLoading(!0);
        const s = await ne.get("/rewards/log?limit=10");
        if (!t) return;
        setRewardLog(Array.isArray(s) ? s : []);
      } catch {
        if (!t) return;
        setRewardLog([]);
      } finally {
        if (t) setRewardLogLoading(!1);
      }
    })();
    return () => {
      t = !1;
    };
  }, [d, D]);
  E(() => {
    const t = r?.dailySecretCodeExpiresAt;
    if (!t) {
      setSecretCountdown("");
      return;
    }
    let s = !0;
    const f = () => {
      if (!s) return;
      setSecretCountdown(formatCountdown(t));
    };
    f();
    const u = setInterval(f, 3e4);
    return () => {
      s = !1;
      clearInterval(u);
    };
  }, [r?.dailySecretCodeExpiresAt, formatCountdown]);
  E(() => {
    const t = r?.leaderboard?.nextPayoutAt;
    if (!t) {
      setLeaderboardCountdown("");
      return;
    }
    let s = !0;
    const f = () => {
      if (!s) return;
      setLeaderboardCountdown(formatCountdown(t));
    };
    f();
    const u = setInterval(f, 3e4);
    return () => {
      s = !1;
      clearInterval(u);
    };
  }, [r?.leaderboard?.nextPayoutAt, formatCountdown]);
  const y = (t, s) => {
      (navigator.clipboard.writeText(t),
        G({
          title: a("copied") || "Copied!",
          description: s || t,
        }));
    },
    h = () => {
      const t = `${window.location.origin}/signup?ref=${r?.referralCode}`;
      navigator.share
        ? navigator.share({
            title: a("join_mhub") || "Join MHub!",
            text: a("use_my_referral_code") || "Use my referral code",
            url: t,
          })
        : y(t, a("referral_link") || "Referral link");
    };
  if (!d)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700",
      },
      e.createElement(
        "div",
        {
          className:
            "bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl text-center max-w-md",
        },
        e.createElement(
          "div",
          {
            className:
              "w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center",
          },
          e.createElement(A, { className: "w-10 h-10 text-white" }),
        ),
        e.createElement(
          "h2",
          { className: "text-3xl font-bold text-white mb-4" },
          a("rewards_referrals"),
        ),
        e.createElement(
          "p",
          { className: "text-white/80 text-lg mb-8" },
          a("earn_coins_unlock_rewards"),
        ),
        e.createElement(
          "div",
          { className: "flex flex-col gap-3" },
          e.createElement(
            z,
            {
              to: "/login",
              className:
                "bg-white text-indigo-600 text-lg px-8 py-4 rounded-xl font-bold hover:bg-white/90 transition",
            },
            a("login_to_continue"),
          ),
          e.createElement(
            z,
            {
              to: "/signup",
              className:
                "border-2 border-white/50 text-white text-lg px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition",
            },
            a("create_account"),
          ),
        ),
      ),
    );
  if (F)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100",
      },
      e.createElement(
        "div",
        { className: "text-center" },
        e.createElement("div", {
          className:
            "w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4",
        }),
        e.createElement(
          "p",
          { className: "text-gray-600 font-medium" },
          a("loading"),
        ),
      ),
    );
  if (errorMessage)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100",
      },
      e.createElement(
        "div",
        { className: "text-center p-8" },
        e.createElement("div", { className: "text-6xl mb-4" }, "\u{1F615}"),
        e.createElement(
          "p",
          { className: "text-red-500 text-xl mb-4" },
          errorMessage,
        ),
        e.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          e.createElement(
            o,
            { onClick: () => S((t) => t + 1) },
            a("try_again") || "Try Again",
          ),
          e.createElement(
            o,
            {
              type: "button",
              variant: "outline",
              onClick: () => window.location.assign("/all-posts"),
            },
            a("browse_listings") || "Browse Listings",
          ),
        ),
      ),
    );
  if (!r)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-100",
      },
      e.createElement(
        "div",
        {
          className:
            "max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center",
        },
        e.createElement(
          "h2",
          { className: "text-xl font-bold text-slate-800 mb-2" },
          a("rewards_profile_unavailable") || "Rewards profile unavailable",
        ),
        e.createElement(
          "p",
          { className: "text-sm text-slate-600 mb-5" },
          a("rewards_profile_unavailable_desc") ||
            "We could not load your rewards profile. Retry or continue browsing.",
        ),
        e.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          e.createElement(
            o,
            { type: "button", onClick: () => S((t) => t + 1) },
            a("retry") || "Retry",
          ),
          e.createElement(
            o,
            {
              type: "button",
              variant: "outline",
              onClick: () => window.location.assign("/all-posts"),
            },
            a("browse_listings") || "Browse Listings",
          ),
        ),
      ),
    );
  const X = Math.min((r.xpCurrent / r.xpRequired) * 100, 100),
    c = Math.max(0, Number(r.xpRequired || 0) - Number(r.xpCurrent || 0)),
    visitStreak = Number(r.visitStreak ?? r.streak ?? 0),
    postStreak = Number(r.postStreak || 0),
    maxStreak = Math.max(visitStreak, postStreak),
    qualifiedReferrals = Number(r.qualifiedReferrals ?? r.successfulRefs ?? 0),
    chainEarnedPoints = Number(r.chainEarnedPoints || 0),
    chainPotentialPoints = Number(r.potentialReferralPoints || 0),
    nextStreakTarget = [7, 14, 30].find((t) => maxStreak < t) || 30,
    streakProgress = nextStreakTarget
      ? Math.min(100, Math.round((maxStreak / nextStreakTarget) * 100))
      : 0,
    rewardLogItems = Array.isArray(rewardLog) ? rewardLog : [],
    w =
      c > 0
        ? "earn_xp"
        : qualifiedReferrals === 0
          ? "qualify_referral"
          : "maintain_streak",
    Y = [
      {
        key: "share",
        label: a("share_referral_code") || "Share your referral code",
        done: !!r.referralCode,
        hint: r.referralCode
          ? `${a("code") || "Code"} ${r.referralCode}`
          : a("generate_from_referral_card") || "Generate from referral card",
      },
      {
        key: "invite",
        label: a("invite_one_friend") || "Invite at least 1 friend",
        done: Number(r.totalReferrals || 0) > 0,
        hint:
          a("rewards_invited_count", {
            count: Number(r.totalReferrals || 0),
          }) || `${Number(r.totalReferrals || 0)} invited`,
      },
      {
        key: "qualify",
        label: a("get_qualified_referral") || "Get 1 qualified referral",
        done: qualifiedReferrals > 0,
        hint:
          a("rewards_qualified_count", {
            count: qualifiedReferrals,
          }) || `${qualifiedReferrals} qualified`,
      },
      {
        key: "level",
        label: a("reach_next_level") || "Reach next level",
        done: c === 0,
        hint:
          c === 0
            ? a("rewards_levelup_ready") || "Level-up ready"
            : a("rewards_xp_remaining", { count: c }) || `${c} XP remaining`,
      },
    ],
    J = [
      {
        key: "step1",
        title: a("share_code") || "Share code",
        detail:
          a("share_code_detail") ||
          "Send your referral link or code to trusted buyers/sellers.",
      },
      {
        key: "step2",
        title: a("friend_signs_up") || "Friend signs up",
        detail:
          a("friend_signs_up_detail") ||
          "Rewards are tracked when signup uses your referral code.",
      },
      {
        key: "step3",
        title: a("first_successful_trade") || "First successful trade",
        detail:
          a("first_successful_trade_detail") ||
          "You earn qualified referral rewards after a verified trade.",
      },
    ],
    activityStats = r.activityStats || {},
    leaderboardHistory = Array.isArray(r.leaderboard?.history)
      ? r.leaderboard.history
      : [],
    nextLeaderboardPayout = r.leaderboard?.nextPayoutAt || "",
    lastLeaderboardPayout = r.leaderboard?.lastPayoutAt || "",
    dailyChallenges = [
      {
        title: a("invite_a_friend"),
        reward: 50,
        completed: Number(activityStats.referralsToday || 0) > 0,
      },
      {
        title: a("visit_today") || "Visit today",
        reward: 2,
        completed: Number(activityStats.visitsToday || 0) > 0,
      },
      {
        title: a("post_today") || "Post today",
        reward: 5,
        completed: Number(activityStats.postsToday || 0) > 0,
      },
      {
        title: a("make_a_sale"),
        rewardLabel:
          a("reward_varies_by_sale") || "Varies by sale value",
        completed: Number(activityStats.salesToday || 0) > 0,
      },
      {
        title: a("complete_purchase") || "Complete a purchase",
        rewardLabel:
          a("reward_varies_by_purchase") || "Varies by purchase value",
        completed: Number(activityStats.purchasesToday || 0) > 0,
      },
      {
        title: a("reach_next_level"),
        reward: 25,
        completed: c === 0,
      },
    ],
    milestones = [
      {
        icon: "\u{1F3AF}",
        title: a("first_sale") || "First Sale",
        unlocked: Number(activityStats.salesCount || 0) > 0,
      },
      {
        icon: "\u{1F9E9}",
        title: a("profile_completed") || "Profile Completed",
        unlocked: Boolean(r.profileComplete),
      },
      {
        icon: "\u{1F4DD}",
        title: a("first_post") || "First Post",
        unlocked: Boolean(r.hasPosted),
      },
      {
        icon: "\u{1F465}",
        title: a("five_referrals") || "5 Referrals",
        unlocked: Number(activityStats.referralsCount || 0) >= 5,
      },
      {
        icon: "\u{1F525}",
        title: a("seven_day_streak") || "7 Day Streak",
        unlocked: Math.max(Number(r.visitStreak || 0), Number(r.postStreak || 0)) >= 7,
      },
      {
        icon: "\u{1F48E}",
        title: a("premium_user") || "Premium User",
        unlocked: r.rank === "Gold" || r.rank === "Platinum",
      },
      {
        icon: "\u2B50",
        title: a("top_seller") || "Top Seller",
        unlocked: Number(activityStats.salesCount || 0) >= 5,
      },
      {
        icon: "\u{1F3C6}",
        title: a("gold_rank") || "Gold Rank",
        unlocked: r.rank === "Gold" || r.rank === "Platinum",
      },
    ],
    $ = {
      Bronze: "from-amber-600 to-amber-800",
      Silver: "from-gray-400 to-gray-600",
      Gold: "from-yellow-400 to-yellow-600",
      Platinum: "from-cyan-400 to-cyan-600",
      Diamond: "from-purple-400 to-pink-500",
    };
  return e.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
      style: { paddingBottom: "180px" },
    },
    e.createElement(
      "div",
      { className: "relative overflow-hidden" },
      e.createElement("div", {
        className:
          "absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500",
      }),
      e.createElement("div", {
        className: "absolute inset-0 opacity-20",
        style: {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        },
      }),
      e.createElement(
        "div",
        { className: "relative max-w-5xl mx-auto px-4 py-12 sm:px-6" },
        e.createElement(
          "div",
          {
            className:
              "flex flex-col md:flex-row items-center justify-between gap-6",
          },
          e.createElement(
            "div",
            { className: "flex items-center gap-5" },
            e.createElement(
              "div",
              { className: "relative" },
              e.createElement(
                I,
                { className: "h-20 w-20 ring-4 ring-white/30 shadow-xl" },
                e.createElement(
                  L,
                  {
                    className: `text-2xl font-bold text-white bg-gradient-to-br ${$[r.rank] || "from-blue-500 to-indigo-600"}`,
                  },
                  r.name
                    ?.split(" ")
                    .map((t) => t[0])
                    .join("") || "U",
                ),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-lg",
                },
                e.createElement(se, { className: "w-5 h-5 text-yellow-500" }),
              ),
            ),
            e.createElement(
              "div",
              null,
              e.createElement(
                "h1",
                { className: "text-2xl md:text-3xl font-bold text-white mb-1" },
                r.name,
              ),
              e.createElement(
                "div",
                { className: "flex items-center gap-2 flex-wrap" },
                e.createElement(
                  m,
                  {
                    className: `bg-gradient-to-r ${$[r.rank] || "from-blue-500 to-indigo-600"} text-white border-0 shadow-lg`,
                  },
                  e.createElement(R, { className: "w-3 h-3 mr-1" }),
                  " ",
                  r.rank,
                ),
                e.createElement(
                  m,
                  { className: "bg-white/20 text-white border-0" },
                  a("level") || "Level",
                  " ",
                  r.level,
                ),
              ),
            ),
          ),
          e.createElement(
            "div",
            { className: "w-full md:w-64" },
            e.createElement(
              "div",
              { className: "flex justify-between text-white/80 text-sm mb-2" },
              e.createElement("span", null, a("xp_progress") || "XP Progress"),
              e.createElement("span", null, r.xpCurrent, " / ", r.xpRequired),
            ),
            e.createElement(
              "div",
              { className: "h-3 bg-white/20 rounded-full overflow-hidden" },
              e.createElement("div", {
                className:
                  "h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500",
                style: { width: `${X}%` },
              }),
            ),
            e.createElement(
              "p",
              { className: "text-white/60 text-xs mt-1" },
              Math.round(r.xpRequired - r.xpCurrent),
              ` ${a("xp_to_next_level") || "XP to next level"}`,
            ),
          ),
        ),
      ),
    ),
    e.createElement(
      "div",
      { className: "max-w-5xl mx-auto px-4 -mt-8 mb-8 relative z-10" },
      e.createElement(
        "div",
        { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
        e.createElement(
          l,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1",
          },
          e.createElement(
            i,
            { className: "p-4 sm:p-5 text-center" },
            e.createElement(
              "div",
              {
                className:
                  "w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center",
              },
              e.createElement(ee, { className: "w-6 h-6 text-white" }),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white",
              },
              r.totalCoins,
            ),
            e.createElement(
              "p",
              { className: "text-sm text-gray-500" },
              a("total_coins"),
            ),
          ),
        ),
        e.createElement(
          l,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1",
          },
          e.createElement(
            i,
            { className: "p-4 sm:p-5 text-center" },
            e.createElement(
              "div",
              {
                className:
                  "w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center",
              },
              e.createElement(_, { className: "w-6 h-6 text-white" }),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white",
              },
              r.totalReferrals,
            ),
            e.createElement(
              "p",
              { className: "text-sm text-gray-500" },
              a("total_referrals"),
            ),
          ),
        ),
        e.createElement(
          l,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1",
          },
          e.createElement(
            i,
            { className: "p-4 sm:p-5 text-center" },
            e.createElement(
              "div",
              {
                className:
                  "w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center",
              },
              e.createElement(te, { className: "w-6 h-6 text-white" }),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white",
              },
              visitStreak,
            ),
            e.createElement(
              "p",
              { className: "text-sm text-gray-500" },
              a("visit_streak") || a("day_streak"),
              " \u{1F525}",
            ),
          ),
        ),
        e.createElement(
          l,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1",
          },
          e.createElement(
            i,
            { className: "p-4 sm:p-5 text-center" },
            e.createElement(
              "div",
              {
                className:
                  "w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center",
              },
              e.createElement(ae, { className: "w-6 h-6 text-white" }),
            ),
            e.createElement(
              "p",
              {
                className:
                  "text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white",
              },
              qualifiedReferrals,
            ),
            e.createElement(
              "p",
              { className: "text-sm text-gray-500" },
              a("qualified_referrals") || a("verified_refs"),
            ),
          ),
        ),
      ),
    ),
    e.createElement(
      "div",
      { className: "max-w-5xl mx-auto px-4 pb-12" },
      e.createElement(
        "div",
        { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" },
        e.createElement(
          l,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
          },
          e.createElement(
            b,
            null,
            e.createElement(
              v,
              { className: "flex items-center gap-2" },
              e.createElement(P, { className: "w-5 h-5 text-indigo-600" }),
              ` ${a("progress_tracker") || "Progress Tracker"}`,
            ),
          ),
          e.createElement(
            i,
            { className: "space-y-3" },
            Y.map((t) =>
              e.createElement(
                "div",
                {
                  key: t.key,
                  className: `flex items-center justify-between rounded-xl border px-3 py-2 ${t.done ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30"}`,
                },
                e.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  t.done
                    ? e.createElement(ie, {
                        className: "w-4 h-4 text-emerald-600",
                      })
                    : e.createElement(oe, {
                        className: "w-4 h-4 text-slate-400",
                      }),
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "p",
                      {
                        className: `text-sm font-medium ${t.done ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`,
                      },
                      t.label,
                    ),
                    e.createElement(
                      "p",
                      {
                        className: "text-xs text-slate-500 dark:text-slate-400",
                      },
                      t.hint,
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              { className: "pt-1" },
              e.createElement(
                o,
                {
                  type: "button",
                  variant: "outline",
                  className: "w-full",
                  onClick: () => {
                    if (w === "earn_xp") {
                      window.location.assign("/all-posts");
                      return;
                    }
                    if (w === "qualify_referral") {
                      h();
                      return;
                    }
                    window.location.assign("/my-home");
                  },
                },
                w === "earn_xp"
                  ? a("earn_xp_through_activity") || "Earn XP through activity"
                  : w === "qualify_referral"
                    ? a("share_referral_link_now") || "Share referral link now"
                    : a("review_account_activity") || "Review account activity",
                e.createElement(de, { className: "w-4 h-4 ml-2" }),
              ),
            ),
          ),
        ),
        e.createElement(
          l,
          {
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
          },
          e.createElement(
            b,
            null,
            e.createElement(
              v,
              { className: "flex items-center gap-2" },
              e.createElement(_, { className: "w-5 h-5 text-indigo-600" }),
              ` ${a("referral_playbook") || "Referral Playbook"}`,
            ),
          ),
          e.createElement(
            i,
            { className: "space-y-3" },
            J.map((t, s) =>
              e.createElement(
                "div",
                {
                  key: t.key,
                  className:
                    "flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                },
                e.createElement(
                  m,
                  { className: "bg-indigo-600 text-white mt-0.5" },
                  s + 1,
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-sm font-semibold text-slate-800 dark:text-slate-100",
                    },
                    t.title,
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-500 dark:text-slate-400" },
                    t.detail,
                  ),
                ),
              ),
            ),
            e.createElement(
              o,
              {
                type: "button",
                variant: "outline",
                className: "w-full",
                onClick: h,
              },
              e.createElement(T, { className: "w-4 h-4 mr-2" }),
              ` ${a("share_referral_to_start") || "Share referral to start"}`,
            ),
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" },
        e.createElement(
          l,
          {
            className:
              "bg-gradient-to-br from-indigo-600 to-purple-700 border-0 shadow-xl overflow-hidden relative",
          },
          e.createElement("div", {
            className:
              "absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2",
          }),
          e.createElement(
            i,
            { className: "p-6 relative z-10" },
            e.createElement(
              "div",
              { className: "flex items-center justify-between mb-4" },
              e.createElement(
                "h3",
                {
                  className:
                    "text-lg font-semibold text-white flex items-center gap-2",
                },
                e.createElement(A, { className: "w-5 h-5" }),
                " ",
                a("your_referral_code"),
              ),
              e.createElement(
                o,
                {
                  variant: "ghost",
                  size: "sm",
                  className: "text-white hover:bg-white/20",
                  onClick: () =>
                    y(r.referralCode, a("referral_code") || "Referral code"),
                },
                e.createElement(H, { className: "w-4 h-4" }),
              ),
            ),
            e.createElement(
              "div",
              {
                className: "text-4xl font-bold text-white mb-4 tracking-wider",
              },
              r.referralCode,
            ),
            e.createElement(
              "p",
              { className: "text-white/70 text-sm mb-4" },
              a("share_earn_coins", { amount: 50 }),
            ),
            e.createElement(
              o,
              {
                onClick: h,
                className:
                  "w-full bg-white text-indigo-600 hover:bg-white/90 font-bold",
              },
              e.createElement(T, { className: "w-4 h-4 mr-2" }),
              " ",
              a("share_now"),
            ),
          ),
        ),
        e.createElement(
          l,
          {
            className:
              "bg-gradient-to-br from-amber-500 to-orange-600 border-0 shadow-xl overflow-hidden relative",
          },
          e.createElement("div", {
            className:
              "absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2",
          }),
          e.createElement(
            i,
            { className: "p-6 relative z-10" },
            e.createElement(
              "div",
              { className: "flex items-center justify-between mb-4" },
              e.createElement(
                "h3",
                {
                  className:
                    "text-lg font-semibold text-white flex items-center gap-2",
                },
                e.createElement(le, { className: "w-5 h-5" }),
                " ",
                a("daily_secret_code"),
              ),
              e.createElement(
                o,
                {
                  variant: "ghost",
                  size: "sm",
                  className: "text-white hover:bg-white/20",
                  onClick: () =>
                    y(r.dailySecretCode, a("secret_code") || "Secret code"),
                },
                e.createElement(H, { className: "w-4 h-4" }),
              ),
            ),
            e.createElement(
              "div",
              {
                className: "text-4xl font-bold text-white mb-4 tracking-wider",
              },
              r.dailySecretCode,
            ),
            e.createElement(
              "p",
              { className: "text-white/70 text-sm mb-2" },
              a("required_for_sale"),
            ),
            e.createElement(
              "div",
              { className: "flex items-center gap-2 text-white/80" },
              e.createElement(re, { className: "w-4 h-4" }),
              e.createElement(
                "span",
                { className: "text-sm" },
                secretCountdown
                  ? `${a("expires_in") || "Expires in"} ${secretCountdown}`
                  : a("expires_in_12h_30m") || "Expires soon",
              ),
            ),
          ),
        ),
      ),
      e.createElement(
        Z,
        { value: V, onValueChange: q, className: "w-full" },
        e.createElement(
          O,
          {
            className:
              "w-full flex bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg mb-6",
          },
          e.createElement(
            k,
            {
              value: "overview",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold",
            },
            a("overview"),
          ),
          e.createElement(
            k,
            {
              value: "referrals",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold",
            },
            a("referrals"),
          ),
          e.createElement(
            k,
            {
              value: "milestones",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold",
            },
            a("milestones"),
          ),
          e.createElement(
            k,
            {
              value: "leaderboard",
              className:
                "flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold",
            },
            a("leaderboard") || "Leaderboard",
          ),
        ),
        e.createElement(
          C,
          { value: "overview" },
          e.createElement(
            "div",
            { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
            e.createElement(
              l,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              e.createElement(
                b,
                null,
                e.createElement(
                  v,
                  { className: "flex items-center gap-2" },
                  e.createElement(P, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  a("daily_challenges"),
                ),
              ),
              e.createElement(
                i,
                { className: "space-y-4" },
                dailyChallenges.map((t, s) =>
                  e.createElement(
                    "div",
                    {
                      key: s,
                      className: `flex items-center justify-between p-4 rounded-xl ${t.completed ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-gray-700"}`,
                    },
                    e.createElement(
                      "div",
                      { className: "flex items-center gap-3" },
                      e.createElement(
                        "div",
                        {
                          className: `w-8 h-8 rounded-full flex items-center justify-center ${t.completed ? "bg-green-500" : "bg-gray-300"}`,
                        },
                        t.completed
                          ? e.createElement(
                              "span",
                              { className: "text-white" },
                              "\u2713",
                            )
                          : e.createElement(
                              "span",
                              { className: "text-gray-500" },
                              s + 1,
                            ),
                      ),
                      e.createElement(
                        "span",
                        {
                          className: t.completed
                            ? "line-through text-gray-400"
                            : "text-gray-700 dark:text-white font-medium",
                        },
                        t.title,
                      ),
                    ),
                    e.createElement(
                      m,
                      {
                        className: t.completed
                          ? "bg-green-100 text-green-700"
                          : "bg-indigo-100 text-indigo-700",
                      },
                      t.rewardLabel
                        ? t.rewardLabel
                        : `+${t.reward} ${a("coins")}`,
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              e.createElement(
                b,
                null,
                e.createElement(
                  v,
                  { className: "flex items-center gap-2" },
                  e.createElement(te, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  a("streaks_and_chain_rewards") ||
                    "Streaks & Chain Rewards",
                ),
              ),
              e.createElement(
                i,
                { className: "space-y-4" },
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-2" },
                    e.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700" },
                      a("visit_streak") || "Visit streak",
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600" },
                      visitStreak,
                      " ",
                      a("days") || "days",
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-2" },
                    e.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700" },
                      a("post_streak") || "Post streak",
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600" },
                      postStreak,
                      " ",
                      a("days") || "days",
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden",
                    },
                    e.createElement("div", {
                      className:
                        "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full",
                      style: { width: `${streakProgress}%` },
                    }),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-500 mt-2" },
                    a("next_streak_milestone", {
                      count: nextStreakTarget,
                    }) || `Next streak milestone: ${nextStreakTarget} days`,
                  ),
                ),
                e.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/60 dark:bg-slate-900/10",
                  },
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-2" },
                    e.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700" },
                      a("chain_rewards_earned") || "Chain rewards earned",
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-emerald-600 font-semibold" },
                      "+",
                      chainEarnedPoints,
                      " ",
                      a("coins"),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    e.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700" },
                      a("chain_rewards_potential") || "Potential chain rewards",
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600 font-semibold" },
                      "+",
                      chainPotentialPoints,
                      " ",
                      a("coins"),
                    ),
                  ),
                ),
              ),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              e.createElement(
                b,
                null,
                e.createElement(
                  v,
                  { className: "flex items-center gap-2" },
                  e.createElement(A, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  a("recent_rewards") || "Recent rewards",
                ),
              ),
              e.createElement(
                i,
                null,
                rewardLogLoading
                  ? e.createElement(
                      "p",
                      { className: "text-sm text-slate-500" },
                      a("reward_log_loading") || "Loading reward activity...",
                    )
                  : rewardLogItems.length
                    ? e.createElement(
                        "div",
                        { className: "space-y-2" },
                        rewardLogItems.map((t, s) =>
                          e.createElement(
                            "div",
                            {
                              key: `${t.action || "reward"}-${s}`,
                              className:
                                "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                            },
                            e.createElement(
                              "div",
                              null,
                              e.createElement(
                                "p",
                                {
                                  className:
                                    "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                },
                                t.description || t.action || a("reward_log_action"),
                              ),
                              e.createElement(
                                "p",
                                { className: "text-xs text-slate-500" },
                                t.created_at
                                  ? new Date(t.created_at).toLocaleString()
                                  : "",
                              ),
                            ),
                            e.createElement(
                              m,
                              { className: "bg-indigo-100 text-indigo-700" },
                              `${t.points >= 0 ? "+" : ""}${t.points} ${a("coins")}`,
                            ),
                          ),
                        ),
                      )
                    : e.createElement(
                        "p",
                        { className: "text-sm text-slate-500" },
                        a("reward_log_empty") || "No reward activity yet.",
                      ),
              ),
            ),
          ),
        ),
        e.createElement(
          C,
          { value: "referrals" },
          e.createElement(
            l,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            e.createElement(
              b,
              null,
              e.createElement(
                v,
                { className: "flex items-center gap-2" },
                e.createElement(_, { className: "w-5 h-5 text-indigo-600" }),
                " ",
                a("your_referrals"),
                " (",
                N.length,
                ")",
              ),
            ),
            e.createElement(
              i,
              null,
              N.length === 0
                ? e.createElement(
                    "div",
                    { className: "text-center py-12" },
                    e.createElement(
                      "div",
                      { className: "text-6xl mb-4" },
                      "\u{1F465}",
                    ),
                    e.createElement(
                      "p",
                      { className: "text-gray-500 mb-4" },
                      a("no_referrals_yet"),
                    ),
                    e.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      e.createElement(
                        o,
                        {
                          onClick: h,
                          className:
                            "bg-gradient-to-r from-indigo-500 to-purple-600",
                        },
                        e.createElement(T, { className: "w-4 h-4 mr-2" }),
                        " ",
                        a("share_your_code"),
                      ),
                      e.createElement(
                        o,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => window.location.assign("/all-posts"),
                        },
                        a("browse_listings") || "Browse Listings",
                      ),
                    ),
                  )
                : e.createElement(
                    "div",
                    { className: "space-y-3" },
                    N.map((t, s) =>
                      e.createElement(
                        "div",
                        {
                          key: t.id,
                          className: `flex items-center justify-between p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition ${t.type === "direct" ? "bg-green-50 dark:bg-green-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`,
                        },
                        e.createElement(
                          "div",
                          { className: "flex items-center gap-3" },
                          e.createElement(
                            I,
                            { className: "h-10 w-10" },
                            e.createElement(
                              L,
                              {
                                className: `text-white font-bold ${t.type === "direct" ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`,
                              },
                              t.name
                                ?.split(" ")
                                .map((f) => f[0])
                                .join("") || "?",
                            ),
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
                              t.name,
                            ),
                            e.createElement(
                              "div",
                              {
                                className:
                                  "flex items-center gap-2 text-xs text-gray-500",
                              },
                              e.createElement(
                                "span",
                                null,
                                `${a("joined") || "Joined"} `,
                                t.joinDate,
                              ),
                              t.type === "indirect" &&
                                t.depth &&
                                e.createElement(
                                  "span",
                                  { className: "text-blue-500" },
                                  `${"\u2022"} ${a("level") || "Level"} `,
                                  t.depth,
                                ),
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "flex flex-col items-end gap-1" },
                          e.createElement(
                            m,
                            {
                              className: `font-bold ${t.type === "direct" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`,
                            },
                            `${a("potential") || "Potential"} +${t.coins} ${a("coins") || "coins"}`,
                          ),
                          e.createElement(
                            "span",
                            {
                              className: `text-xs ${t.type === "direct" ? "text-green-600" : "text-blue-600"}`,
                            },
                            t.type === "direct"
                              ? a("direct") || "Direct"
                              : a("indirect") || "Indirect",
                          ),
                        ),
                      ),
                    ),
                  ),
            ),
          ),
        ),
        e.createElement(
          C,
          { value: "milestones" },
          e.createElement(
            l,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            e.createElement(
              b,
              null,
              e.createElement(
                v,
                { className: "flex items-center gap-2" },
                e.createElement(Q, { className: "w-5 h-5 text-yellow-500" }),
                ` ${a("milestones_achievements") || "Milestones & Achievements"}`,
              ),
            ),
            e.createElement(
              i,
              null,
              e.createElement(
                "div",
                { className: "grid grid-cols-2 md:grid-cols-3 gap-4" },
                milestones.map((t, s) =>
                  e.createElement(
                    "div",
                    {
                      key: s,
                      className: `p-4 rounded-xl text-center ${t.unlocked ? "bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-300" : "bg-gray-100 dark:bg-gray-700 opacity-60"}`,
                    },
                    e.createElement(
                      "div",
                      { className: "text-4xl mb-2" },
                      t.icon,
                    ),
                    e.createElement(
                      "p",
                      {
                        className: `font-semibold ${t.unlocked ? "text-yellow-700" : "text-gray-500"}`,
                      },
                      t.title,
                    ),
                    t.unlocked &&
                      e.createElement(
                        m,
                        {
                          className:
                            "bg-yellow-400 text-yellow-900 text-xs mt-2",
                        },
                        a("unlocked") || "Unlocked!",
                      ),
                  ),
                ),
              ),
            ),
          ),
        ),
        e.createElement(
          C,
          { value: "leaderboard" },
          e.createElement(
            "div",
            { className: "space-y-6" },
            e.createElement(
              l,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              e.createElement(
                b,
                null,
                e.createElement(
                  v,
                  { className: "flex items-center gap-2" },
                  e.createElement(R, { className: "w-5 h-5 text-yellow-500" }),
                  " ",
                  a("weekly_leaderboard") || "Weekly Leaderboard",
                ),
              ),
              e.createElement(
                i,
                { className: "space-y-3" },
                e.createElement(
                  "div",
                  { className: "flex flex-wrap items-center gap-3" },
                  e.createElement(
                    m,
                    { className: "bg-indigo-100 text-indigo-700" },
                    a("next_payout") || "Next payout",
                    ": ",
                    leaderboardCountdown
                      ? leaderboardCountdown
                      : nextLeaderboardPayout
                        ? new Date(nextLeaderboardPayout).toLocaleString()
                        : a("unknown") || "Unknown",
                  ),
                  lastLeaderboardPayout
                    ? e.createElement(
                        m,
                        { className: "bg-emerald-100 text-emerald-700" },
                        a("last_payout") || "Last payout",
                        ": ",
                        new Date(lastLeaderboardPayout).toLocaleDateString(),
                      )
                    : null,
                ),
                e.createElement(
                  "p",
                  { className: "text-xs text-slate-500" },
                  a("leaderboard_payout_notice") ||
                    "Payouts are processed weekly via background jobs. If jobs are paused, payouts may be delayed.",
                ),
              ),
            ),
            e.createElement(
              "div",
              { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
              e.createElement(
                l,
                {
                  className:
                    "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
                },
                e.createElement(
                  b,
                  null,
                  e.createElement(
                    v,
                    { className: "flex items-center gap-2" },
                    e.createElement(se, { className: "w-5 h-5 text-indigo-600" }),
                    " ",
                    a("top_sellers") || "Top Sellers",
                  ),
                ),
                e.createElement(
                  i,
                  null,
                  publicWallLoading
                    ? e.createElement(
                        "p",
                        { className: "text-sm text-slate-500" },
                        a("loading") || "Loading...",
                      )
                    : publicWall.topSellers?.length
                      ? e.createElement(
                          "div",
                          { className: "space-y-2" },
                          publicWall.topSellers.map((t, s) =>
                            e.createElement(
                              "div",
                              {
                                key: t.id || s,
                                className:
                                  "flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                              },
                              e.createElement(
                                "div",
                                { className: "flex items-center gap-2" },
                                e.createElement(
                                  m,
                                  { className: "bg-indigo-50 text-indigo-600" },
                                  t.rank || `#${s + 1}`,
                                ),
                                e.createElement(
                                  "span",
                                  {
                                    className:
                                      "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                  },
                                  t.name || a("user") || "User",
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "text-sm text-slate-600" },
                                a("sales") || "Sales",
                                ": ",
                                t.sales ?? 0,
                              ),
                            ),
                          ),
                        )
                      : e.createElement(
                          "p",
                          { className: "text-sm text-slate-500" },
                          a("no_leaderboard_data") ||
                            "No leaderboard data yet.",
                        ),
                ),
              ),
              e.createElement(
                l,
                {
                  className:
                    "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
                },
                e.createElement(
                  b,
                  null,
                  e.createElement(
                    v,
                    { className: "flex items-center gap-2" },
                    e.createElement(se, { className: "w-5 h-5 text-emerald-600" }),
                    " ",
                    a("top_buyers") || "Top Buyers",
                  ),
                ),
                e.createElement(
                  i,
                  null,
                  publicWallLoading
                    ? e.createElement(
                        "p",
                        { className: "text-sm text-slate-500" },
                        a("loading") || "Loading...",
                      )
                    : publicWall.topBuyers?.length
                      ? e.createElement(
                          "div",
                          { className: "space-y-2" },
                          publicWall.topBuyers.map((t, s) =>
                            e.createElement(
                              "div",
                              {
                                key: t.id || s,
                                className:
                                  "flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                              },
                              e.createElement(
                                "div",
                                { className: "flex items-center gap-2" },
                                e.createElement(
                                  m,
                                  { className: "bg-emerald-50 text-emerald-600" },
                                  t.rank || `#${s + 1}`,
                                ),
                                e.createElement(
                                  "span",
                                  {
                                    className:
                                      "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                  },
                                  t.name || a("user") || "User",
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "text-sm text-slate-600" },
                                a("purchases") || "Purchases",
                                ": ",
                                t.purchases ?? 0,
                              ),
                            ),
                          ),
                        )
                      : e.createElement(
                          "p",
                          { className: "text-sm text-slate-500" },
                          a("no_leaderboard_data") ||
                            "No leaderboard data yet.",
                        ),
                ),
              ),
            ),
            e.createElement(
              l,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              e.createElement(
                b,
                null,
                e.createElement(
                  v,
                  { className: "flex items-center gap-2" },
                  e.createElement(ae, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  a("payout_history") || "Payout history",
                ),
              ),
              e.createElement(
                i,
                null,
                leaderboardHistory.length
                  ? e.createElement(
                      "div",
                      { className: "space-y-2" },
                      leaderboardHistory.map((t, s) =>
                        e.createElement(
                          "div",
                          {
                            key: `${t.action || "payout"}-${s}`,
                            className:
                              "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                          },
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-sm font-semibold text-slate-800 dark:text-slate-100",
                              },
                              t.description ||
                                (t.action === "leaderboard_top_seller"
                                  ? a("top_seller_reward") || "Top seller reward"
                                  : a("top_buyer_reward") || "Top buyer reward"),
                            ),
                            e.createElement(
                              "p",
                              { className: "text-xs text-slate-500" },
                              t.created_at
                                ? new Date(t.created_at).toLocaleString()
                                : "",
                            ),
                          ),
                          e.createElement(
                            m,
                            { className: "bg-indigo-100 text-indigo-700" },
                            "+",
                            t.points ?? 0,
                            " ",
                            a("coins"),
                          ),
                        ),
                      ),
                    )
                  : e.createElement(
                      "p",
                      { className: "text-sm text-slate-500" },
                      a("no_payout_history") ||
                        "No leaderboard payouts yet.",
                    ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
};
var Te = fe;
export { Te as default };
