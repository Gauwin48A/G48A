import e, {
  useState as n,
  useEffect as E,
  useMemo as K,
  useCallback as W,
  useRef as ye,
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
import { buildApiPath } from "@/lib/networkConfig";
import {
  getAccessToken,
  getUserId,
  isAuthenticated,
} from "@/utils/authStorage";
import { useTranslation as me } from "react-i18next";
import { useToast as ge } from "@/hooks/use-toast";
import { getInitials } from "@/lib/userDisplay";
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
    [coinBalance, setCoinBalance] = n(null),
    [coinHistory, setCoinHistory] = n([]),
    [coinHistoryLoading, setCoinHistoryLoading] = n(!1),
    [showMoreStats, setShowMoreStats] = n(!1),
    [showAllChallenges, setShowAllChallenges] = n(!1),
    [sseStatus, setSseStatus] = n("connecting"),
    [lastSseUpdate, setLastSseUpdate] = n(""),
    [sseFallbackActive, setSseFallbackActive] = n(!1),
    sseFallbackTimerRef = ye(null),
    refreshAttemptedRef = ye(false),
    { t: a } = me(),
    tr = (key, fallback, options = {}) =>
      a(key, { defaultValue: fallback, ...options }),
    { toast: G } = ge(),
    { user: j, refreshAuth: refreshAuthFromContext } = xe(),
    d = K(() => isAuthenticated(j), [j]),
    attemptAuthRefresh = W(async () => {
      if (!refreshAuthFromContext || refreshAttemptedRef.current) {
        return false;
      }
      refreshAttemptedRef.current = true;
      try {
        const refreshed = await refreshAuthFromContext();
        return Boolean(refreshed);
      } catch {
        return false;
      }
    }, [refreshAuthFromContext]),
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
    showDiagnostics =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("rewardsDebug"),
    diagnostics = K(
      () => ({
        referralCode: Boolean(r?.referralCode),
        secretCode: Boolean(r?.dailySecretCode),
        progress: Number.isFinite(Number(coinBalance ?? r?.totalCoins)),
        leaderboard: Boolean(
          r?.leaderboard?.nextPayoutAt ||
            publicWall?.topSellers?.length ||
            publicWall?.topBuyers?.length ||
            publicWall?.topUsers?.length,
        ),
        referralLedgerStatus: r?.referralLedger?.status || "unknown",
        referralLedgerOk: r?.referralLedger?.status === "ok",
        sseStatus,
        sseFallbackActive,
        lastSseUpdate,
      }),
      [r, publicWall, sseStatus, sseFallbackActive, lastSseUpdate, coinBalance],
    ),
    formatCountdown = W(
      (t) => {
        if (!t) return "";
        const s = new Date(t).getTime();
        if (Number.isNaN(s)) return "";
        const f = s - Date.now();
        if (f <= 0) return tr("expired", "Expired");
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
      async ({ silent: t = !1, allowRetry: retry = !0 } = {}) => {
        if (!d) {
          x({
            key: "rewards_login_required",
            fallback: "You must be logged in to view rewards.",
          }),
            g(!1);
          return;
        }
        const s = getUserId(j);
        t || g(!0), x(null);
        try {
          const endpoint = s
            ? "/rewards?userId=".concat(encodeURIComponent(s))
            : "/rewards";
          const u = await ne.get(endpoint);
          u && (M(u.user || null), U(u.referralChain || []));
        } catch (u) {
          const status = u?.status ?? u?.response?.status ?? null;
          if (retry && (status === 401 || status === 403)) {
            const refreshed = await attemptAuthRefresh();
            if (refreshed) {
              return p({ silent: t, allowRetry: false });
            }
          }
          t ||
            x({
              key: "rewards_fetch_failed",
              fallback: u.message || "Failed to fetch rewards",
            });
        } finally {
          t || g(!1);
        }
      },
      [d, j, attemptAuthRefresh],
    );
  const errorMessage = resolveMessage(B);
  E(() => {
    if (!d) {
      x({
        key: "rewards_login_required",
        fallback: "You must be logged in to view rewards.",
      }),
        g(!1);
      return;
    }
    p({ silent: !1 });
  }, [d, D, p]),
    E(() => {
      refreshAttemptedRef.current = false;
    }, [j]),
    E(() => {
      if (!d) return;
      if (
        typeof window === "undefined" ||
        typeof window.EventSource === "undefined"
      ) {
        setSseStatus("unsupported");
        setSseFallbackActive(true);
        return;
      }
      setSseStatus("connecting");
      setSseFallbackActive(false);
      const t = new EventSource(buildApiPath("/rewards/stream"), {
          withCredentials: !0,
        }),
        s = () => {
          setLastSseUpdate(new Date().toISOString());
          p({ silent: !0 });
        };
      t.onopen = () => {
        setSseStatus("connected");
        setSseFallbackActive(false);
      };
      return (
        t.addEventListener("reward_update", s),
        (t.onerror = () => {
          setSseStatus("disconnected");
          setSseFallbackActive(true);
        }),
        () => {
          t.removeEventListener("reward_update", s), t.close();
        }
      );
    }, [d, p]);
  E(() => {
    if (!d || !sseFallbackActive) {
      if (sseFallbackTimerRef.current) {
        clearInterval(sseFallbackTimerRef.current);
        sseFallbackTimerRef.current = null;
      }
      return;
    }

    if (sseFallbackTimerRef.current) {
      return;
    }

    const interval = setInterval(() => {
      setLastSseUpdate(new Date().toISOString());
      p({ silent: !0 });
    }, 30000);

    sseFallbackTimerRef.current = interval;
    return () => {
      clearInterval(interval);
      sseFallbackTimerRef.current = null;
    };
  }, [d, sseFallbackActive, p]);
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
    if (!d) return;
    let t = !0;
    (async () => {
      try {
        setCoinHistoryLoading(!0);
        const [balanceRes, historyRes] = await Promise.all([
          ne.get("/coins/balance").catch(() => null),
          ne.get("/coins/history?limit=10").catch(() => null),
        ]);
        if (!t) return;
        const nextBalance = balanceRes?.balance ?? balanceRes?.coins;
        if (Number.isFinite(Number(nextBalance))) {
          setCoinBalance(Number(nextBalance));
        }
        const history = Array.isArray(historyRes?.transactions)
          ? historyRes.transactions
          : Array.isArray(historyRes)
            ? historyRes
            : [];
        setCoinHistory(history);
      } catch {
        if (t) {
          setCoinHistory([]);
        }
      } finally {
        if (t) setCoinHistoryLoading(!1);
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
      navigator.clipboard.writeText(t),
        G({
          title: tr("copied", "Copied!"),
          description: s || t,
        });
    },
    h = () => {
      const t = `${window.location.origin}/signup?ref=${r?.referralCode}`;
      navigator.share
        ? navigator.share({
            title: tr("join_mhub", "Join MHub!"),
            text: tr("use_my_referral_code", "Use my referral code"),
            url: t,
          })
        : y(t, tr("referral_link", "Referral link"));
    };
  if (!d)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      },
      e.createElement(
        "div",
        {
          className:
            "bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-10 shadow-2xl text-center max-w-md",
        },
        e.createElement(
          "div",
          {
            className:
              "w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center",
          },
          e.createElement(A, { className: "w-10 h-10 text-white" }),
        ),
        e.createElement(
          "h2",
          { className: "text-3xl font-bold text-gray-900 dark:text-white mb-4" },
          a("rewards_referrals"),
        ),
        e.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-300 text-lg mb-8" },
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
                "bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition",
            },
            a("login_to_continue"),
          ),
          e.createElement(
            z,
            {
              to: "/signup",
              className:
                "border-2 border-blue-200 text-blue-700 dark:text-blue-200 text-lg px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-white/10 transition",
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
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
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
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      },
      e.createElement(
        "div",
        { className: "text-center p-8" },
        e.createElement("div", { className: "text-6xl mb-4" }, "\uD83D\uDE15"),
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
            tr("try_again", "Try Again"),
          ),
          e.createElement(
            o,
            {
              type: "button",
              variant: "outline",
              onClick: () => window.location.assign("/all-posts"),
            },
            tr("browse_listings", "Browse Listings"),
          ),
        ),
      ),
    );
  if (!r)
    return e.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
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
          tr("rewards_profile_unavailable", "Rewards profile unavailable"),
        ),
        e.createElement(
          "p",
          { className: "text-sm text-slate-600 mb-5" },
          tr(
            "rewards_profile_unavailable_desc",
            "We could not load your rewards profile. Retry or continue browsing.",
          ),
        ),
        e.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          e.createElement(
            o,
            { type: "button", onClick: () => S((t) => t + 1) },
            tr("retry", "Retry"),
          ),
          e.createElement(
            o,
            {
              type: "button",
              variant: "outline",
              onClick: () => window.location.assign("/all-posts"),
            },
            tr("browse_listings", "Browse Listings"),
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
    displayCoins = coinBalance !== null ? coinBalance : r.totalCoins,
    rewardLogItems = coinHistory.length
      ? coinHistory.map((entry) => ({
          action: entry.type || "coin",
          points: Number(entry.amount ?? 0),
          description: entry.description || entry.type || a("reward_log_action"),
          created_at: entry.created_at,
        }))
      : Array.isArray(rewardLog)
        ? rewardLog
        : [],
    logLoading = rewardLogLoading || coinHistoryLoading,
    diagnosticsItems = [
      {
        key: "referrals",
        label: tr("referral_engine", "Referral engine"),
        ok: diagnostics.referralCode,
      },
      {
        key: "secret_code",
        label: tr("secret_code", "Secret code"),
        ok: diagnostics.secretCode,
      },
      {
        key: "progress",
        label: tr("progress", "Progress"),
        ok: diagnostics.progress,
      },
      {
        key: "referral_ledger",
        label: tr("referral_ledger", "Referral ledger"),
        ok: diagnostics.referralLedgerOk,
        hint:
          diagnostics.referralLedgerStatus === "ok"
            ? tr("ledger_ok", "Matched")
            : diagnostics.referralLedgerStatus === "mismatch"
              ? tr("ledger_mismatch", "Mismatch")
              : tr("ledger_unavailable", "Unavailable"),
      },
      {
        key: "leaderboard",
        label: tr("leaderboard", "Leaderboard"),
        ok: diagnostics.leaderboard,
      },
      {
        key: "sse",
        label: tr("live_updates", "Live updates"),
        ok:
          diagnostics.sseStatus === "connected" ||
          diagnostics.sseFallbackActive,
        hint:
          diagnostics.sseStatus === "connected"
            ? tr("live_connected", "Connected")
            : diagnostics.sseFallbackActive
              ? tr("live_polling", "Polling fallback")
              : diagnostics.sseStatus === "connecting"
                ? tr("connecting", "Connecting")
                : diagnostics.sseStatus === "unsupported"
                  ? tr("live_unsupported", "Unsupported")
                  : tr("offline", "Offline"),
      },
    ],
    w =
      c > 0
        ? "earn_xp"
        : qualifiedReferrals === 0
          ? "qualify_referral"
          : "maintain_streak",
    Y = [
      {
        key: "share",
        label: tr("share_referral_code", "Share your referral code"),
        done: !!r.referralCode,
        hint: r.referralCode
          ? `${tr("code", "Code")} ${r.referralCode}`
          : tr("generate_from_referral_card", "Generate from referral card"),
      },
      {
        key: "invite",
        label: tr("invite_one_friend", "Invite at least 1 friend"),
        done: Number(r.totalReferrals || 0) > 0,
        hint: tr(
          "rewards_invited_count",
          `${Number(r.totalReferrals || 0)} invited`,
          {
            count: Number(r.totalReferrals || 0),
          },
        ),
      },
      {
        key: "qualify",
        label: tr("get_qualified_referral", "Get 1 qualified referral"),
        done: qualifiedReferrals > 0,
        hint: tr("rewards_qualified_count", `${qualifiedReferrals} qualified`, {
          count: qualifiedReferrals,
        }),
      },
      {
        key: "level",
        label: tr("reach_next_level", "Reach next level"),
        done: c === 0,
        hint:
          c === 0
            ? tr("rewards_levelup_ready", "Level-up ready")
            : tr("rewards_xp_remaining", `${c} XP remaining`, { count: c }),
      },
    ],
    J = [
      {
        key: "step1",
        title: tr("share_code", "Share code"),
        detail: tr(
          "share_code_detail",
          "Send your referral link or code to trusted buyers/sellers.",
        ),
      },
      {
        key: "step2",
        title: tr("friend_signs_up", "Friend signs up"),
        detail: tr(
          "friend_signs_up_detail",
          "Rewards are tracked when signup uses your referral code.",
        ),
      },
      {
        key: "step3",
        title: tr("first_successful_trade", "First successful trade"),
        detail: tr(
          "first_successful_trade_detail",
          "You earn qualified referral rewards after a verified trade.",
        ),
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
        title: tr("invite_a_friend", "Invite a friend"),
        reward: 50,
        completed: Number(activityStats.referralsToday || 0) > 0,
      },
      {
        title: tr("visit_today", "Visit today"),
        reward: 2,
        completed: Number(activityStats.visitsToday || 0) > 0,
      },
      {
        title: tr("post_today", "Post today"),
        reward: 5,
        completed: Number(activityStats.postsToday || 0) > 0,
      },
      {
        title: tr("make_a_sale", "Make a sale"),
        rewardLabel: tr("reward_varies_by_sale", "Varies by sale value"),
        completed: Number(activityStats.salesToday || 0) > 0,
      },
      {
        title: tr("complete_purchase", "Complete a purchase"),
        rewardLabel: tr(
          "reward_varies_by_purchase",
          "Varies by purchase value",
        ),
        completed: Number(activityStats.purchasesToday || 0) > 0,
      },
      {
        title: tr("reach_next_level", "Reach next level"),
        reward: 25,
        completed: c === 0,
      },
    ],
    visibleChallenges = showAllChallenges
      ? dailyChallenges
      : dailyChallenges.slice(0, 3),
    milestones = [
      {
        icon: "\uD83C\uDFAF",
        title: tr("first_sale", "First Sale"),
        unlocked: Number(activityStats.salesCount || 0) > 0,
      },
      {
        icon: "\uD83E\uDDE9",
        title: tr("profile_completed", "Profile Completed"),
        unlocked: Boolean(r.profileComplete),
      },
      {
        icon: "\uD83D\uDCDD",
        title: tr("first_post", "First Post"),
        unlocked: Boolean(r.hasPosted),
      },
      {
        icon: "\uD83D\uDC65",
        title: tr("five_referrals", "5 Referrals"),
        unlocked: Number(activityStats.referralsCount || 0) >= 5,
      },
      {
        icon: "\uD83D\uDD25",
        title: tr("seven_day_streak", "7 Day Streak"),
        unlocked:
          Math.max(Number(r.visitStreak || 0), Number(r.postStreak || 0)) >= 7,
      },
      {
        icon: "\uD83D\uDC8E",
        title: tr("premium_user", "Premium User"),
        unlocked: r.rank === "Gold" || r.rank === "Platinum",
      },
      {
        icon: "\u2B50",
        title: tr("top_seller", "Top Seller"),
        unlocked: Number(activityStats.salesCount || 0) >= 5,
      },
      {
        icon: "\uD83C\uDFC6",
        title: tr("gold_rank", "Gold Rank"),
        unlocked: r.rank === "Gold" || r.rank === "Platinum",
      },
    ],
    milestoneUnlockedCount = milestones.filter((t) => t.unlocked).length,
    nextMilestone = milestones.find((t) => !t.unlocked),
    $ = {
      Bronze: "from-amber-600 to-amber-800",
      Silver: "from-gray-400 to-gray-600",
      Gold: "from-yellow-400 to-yellow-600",
      Platinum: "from-cyan-400 to-cyan-600",
      Diamond: "from-purple-400 to-pink-500",
    },
    primaryStats = [
      {
        key: "coins",
        label: a("total_coins"),
        value: displayCoins,
        icon: ee,
        accent: "from-yellow-400 to-orange-500",
      },
      {
        key: "referrals",
        label: a("total_referrals"),
        value: r.totalReferrals,
        icon: _,
        accent: "from-blue-400 to-blue-600",
      },
      {
        key: "streak",
        label: a("visit_streak") || a("day_streak"),
        value: visitStreak,
        icon: te,
        accent: "from-emerald-400 to-green-600",
      },
    ],
    secondaryStats = [
      {
        key: "qualified",
        label: a("qualified_referrals") || a("verified_refs"),
        value: qualifiedReferrals,
        icon: ae,
        accent: "from-purple-400 to-purple-600",
      },
      {
        key: "milestones",
        label: tr("milestones", "Milestones"),
        value: `${milestoneUnlockedCount}/${milestones.length}`,
        icon: Q,
        accent: "from-amber-400 to-yellow-600",
      },
    ];
  return e.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      style: { paddingBottom: "180px" },
    },
    e.createElement(
      "div",
      { className: "relative overflow-hidden" },
      e.createElement("div", {
        className:
          "absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600",
      }),
      e.createElement("div", {
        className: "absolute inset-0 opacity-20",
        style: {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        },
      }),
      e.createElement(
        "div",
        { className: "relative max-w-6xl mx-auto px-4 py-12 sm:px-6" },
        e.createElement(
          "div",
          { className: "mb-6 text-center md:text-left" },
          e.createElement(
            "p",
            {
              className:
                "text-xs uppercase tracking-[0.2em] text-white/70 mb-2",
            },
            tr("rewards_program", "Rewards Program"),
          ),
          e.createElement(
            "h1",
            { className: "text-3xl md:text-4xl font-bold text-white" },
            tr("rewards_title", "Rewards & Referrals"),
          ),
          e.createElement(
            "p",
            { className: "text-sm md:text-base text-white/80 mt-2" },
            tr(
              "rewards_subtitle",
              "Track progress, earn points, and unlock perks for every milestone.",
            ),
          ),
        ),
        e.createElement(
          "div",
          {
            className:
              "flex flex-col md:flex-row items-center justify-between gap-6",
          },
          e.createElement(
            "div",
            { className: "flex items-center gap-5 min-w-0" },
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
                  getInitials(r?.name, "U"),
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
              { className: "min-w-0" },
              e.createElement(
                "h1",
                {
                  className:
                    "text-2xl md:text-3xl font-bold text-white mb-1 truncate",
                  title: r.name,
                },
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
                  tr("level", "Level"),
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
              e.createElement("span", null, tr("xp_progress", "XP Progress")),
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
              ` ${tr("xp_to_next_level", "XP to next level")}`,
            ),
            e.createElement(
              o,
              {
                type: "button",
                onClick: h,
                className:
                  "mt-3 w-full bg-white/90 text-blue-700 hover:bg-white font-semibold",
              },
              e.createElement(T, { className: "w-4 h-4 mr-2" }),
              tr("invite_friends", "Invite friends"),
            ),
          ),
        ),
      ),
    ),
    e.createElement(
      "div",
      {
        className:
          "max-w-6xl mx-auto px-4 mt-8 -translate-y-8 mb-8 relative z-10",
      },
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
              e.createElement(te, { className: "w-5 h-5 text-indigo-600" }),
              " ",
              tr("stats", "Stats"),
            ),
          ),
          e.createElement(
            i,
            { className: "space-y-4" },
            e.createElement(
              "div",
              { className: "grid grid-cols-3 gap-3" },
              primaryStats.map((t) =>
                e.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3 text-center",
                  },
                  e.createElement(
                    "div",
                    {
                      className: `mx-auto mb-2 h-9 w-9 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center`,
                    },
                    e.createElement(t.icon, {
                      className: "w-4 h-4 text-white",
                    }),
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-lg font-bold text-slate-800 dark:text-white",
                    },
                    t.value,
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-500" },
                    t.label,
                  ),
                ),
              ),
            ),
            e.createElement(
              "div",
              {
                className: `grid grid-cols-2 gap-3 ${showMoreStats ? "" : "hidden"}`,
              },
              secondaryStats.map((t) =>
                e.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3 text-center",
                  },
                  e.createElement(
                    "div",
                    {
                      className: `mx-auto mb-2 h-9 w-9 rounded-lg bg-gradient-to-br ${t.accent} flex items-center justify-center`,
                    },
                    e.createElement(t.icon, {
                      className: "w-4 h-4 text-white",
                    }),
                  ),
                  e.createElement(
                    "p",
                    {
                      className:
                        "text-lg font-bold text-slate-800 dark:text-white",
                    },
                    t.value,
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-500" },
                    t.label,
                  ),
                ),
              ),
            ),
            e.createElement(
              o,
              {
                type: "button",
                variant: "ghost",
                className:
                  "w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                onClick: () => setShowMoreStats((t) => !t),
              },
              showMoreStats
                ? tr("show_less_stats", "Show fewer stats")
                : tr("show_more_stats", "Show more stats"),
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
              tr("your_codes", "Your codes"),
            ),
          ),
          e.createElement(
            i,
            { className: "space-y-4" },
            e.createElement(
              "div",
              {
                className:
                  "rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-900/20",
              },
              e.createElement(
                "div",
                { className: "flex items-center justify-between" },
                e.createElement(
                  "p",
                  {
                    className:
                      "text-sm font-semibold text-indigo-700 dark:text-indigo-200",
                  },
                  a("your_referral_code"),
                ),
                e.createElement(
                  o,
                  {
                    variant: "ghost",
                    size: "sm",
                    className:
                      "text-indigo-600 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-900/40",
                    onClick: () =>
                      y(r.referralCode, tr("referral_code", "Referral code")),
                  },
                  e.createElement(H, { className: "w-4 h-4" }),
                ),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "mt-2 text-2xl font-bold text-indigo-700 dark:text-indigo-200 tracking-wider",
                },
                r.referralCode,
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-xs text-indigo-600/80 dark:text-indigo-200/80 mt-1",
                },
                a("share_earn_coins", { amount: 50 }),
              ),
            ),
            e.createElement(
              "div",
              {
                className:
                  "rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20",
              },
              e.createElement(
                "div",
                { className: "flex items-center justify-between" },
                e.createElement(
                  "p",
                  {
                    className:
                      "text-sm font-semibold text-amber-700 dark:text-amber-200",
                  },
                  a("daily_secret_code"),
                ),
                e.createElement(
                  o,
                  {
                    variant: "ghost",
                    size: "sm",
                    className:
                      "text-amber-600 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40",
                    onClick: () =>
                      y(r.dailySecretCode, tr("secret_code", "Secret code")),
                  },
                  e.createElement(H, { className: "w-4 h-4" }),
                ),
              ),
              e.createElement(
                "p",
                {
                  className:
                    "mt-2 text-2xl font-bold text-amber-700 dark:text-amber-200 tracking-wider",
                },
                r.dailySecretCode,
              ),
              e.createElement(
                "p",
                {
                  className:
                    "text-xs text-amber-600/80 dark:text-amber-200/80 mt-1",
                },
                a("required_for_sale"),
              ),
              e.createElement(
                "div",
                {
                  className:
                    "mt-2 flex items-center gap-2 text-amber-600/90 dark:text-amber-200/80",
                },
                e.createElement(re, { className: "w-4 h-4" }),
                e.createElement(
                  "span",
                  { className: "text-xs" },
                  secretCountdown
                    ? `${tr("expires_in", "Expires in")} ${secretCountdown}`
                    : tr("expires_in_12h_30m", "Expires soon"),
                ),
              ),
            ),
            e.createElement(
              o,
              {
                type: "button",
                className:
                  "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold",
                onClick: h,
              },
              e.createElement(T, { className: "w-4 h-4 mr-2" }),
              tr("share_referral_link_now", "Share referral link now"),
            ),
          ),
        ),
      ),
    ),
    showDiagnostics &&
      e.createElement(
        "div",
        { className: "max-w-6xl mx-auto px-4 mb-6" },
        e.createElement(
          "div",
          {
            className:
              "rounded-2xl border border-slate-200 bg-white/90 dark:bg-gray-900/60 px-4 py-3 shadow-sm",
          },
          e.createElement(
            "div",
            { className: "flex items-center justify-between mb-2" },
            e.createElement(
              "p",
              {
                className:
                  "text-sm font-semibold text-slate-700 dark:text-slate-200",
              },
              tr("rewards_diagnostics", "Rewards diagnostics"),
            ),
            e.createElement(
              "span",
              {
                className: `text-xs font-semibold ${diagnostics.sseStatus === "connected" ? "text-emerald-600" : diagnostics.sseFallbackActive || diagnostics.sseStatus === "connecting" ? "text-amber-600" : "text-rose-600"}`,
              },
              diagnostics.sseStatus === "connected"
                ? tr("live_connected", "Connected")
                : diagnostics.sseFallbackActive
                  ? tr("live_polling", "Polling fallback")
                  : diagnostics.sseStatus === "connecting"
                    ? tr("connecting", "Connecting")
                    : tr("offline", "Offline"),
            ),
          ),
          e.createElement(
            "div",
            { className: "flex flex-wrap gap-2" },
            diagnosticsItems.map((t) =>
              e.createElement(
                "span",
                {
                  key: t.key,
                  className: `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${t.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} dark:${t.ok ? "bg-emerald-900/40 text-emerald-200" : "bg-amber-900/40 text-amber-200"}`,
                },
                t.ok ? "●" : "○",
                t.label,
                t.hint ? ` • ${t.hint}` : "",
              ),
            ),
          ),
          lastSseUpdate &&
            e.createElement(
              "p",
              { className: "mt-2 text-xs text-slate-500 dark:text-slate-400" },
              tr("last_update", "Last update"),
              ": ",
              new Date(lastSseUpdate).toLocaleString(),
            ),
        ),
      ),
    e.createElement(
      "div",
      { className: "max-w-6xl mx-auto px-4 pb-12" },
      e.createElement(
        Z,
        { value: V, onValueChange: q, className: "w-full" },
        e.createElement(
          O,
          {
            className:
              "w-full flex gap-2 overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-lg mb-6 scrollbar-hide",
          },
          e.createElement(
            k,
            {
              value: "overview",
              className:
                "flex-none md:flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 text-sm md:text-base font-semibold",
            },
            a("overview"),
          ),
          e.createElement(
            k,
            {
              value: "referrals",
              className:
                "flex-none md:flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 text-sm md:text-base font-semibold",
            },
            a("referrals"),
          ),
          e.createElement(
            k,
            {
              value: "milestones",
              className:
                "flex-none md:flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 text-sm md:text-base font-semibold",
            },
            a("milestones"),
          ),
          e.createElement(
            k,
            {
              value: "leaderboard",
              className:
                "flex-none md:flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white px-4 py-2 text-sm md:text-base font-semibold",
            },
            tr("leaderboard", "Leaderboard"),
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
                  tr("progress_overview", "Progress overview"),
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
                      tr("xp_progress", "XP Progress"),
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600" },
                      r.xpCurrent,
                      " / ",
                      r.xpRequired,
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
                        "h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full",
                      style: { width: `${X}%` },
                    }),
                  ),
                  e.createElement(
                    "p",
                    { className: "text-xs text-slate-500 mt-2" },
                    c === 0
                      ? tr("rewards_levelup_ready", "Level-up ready")
                      : tr("rewards_xp_remaining", `${c} XP remaining`, {
                          count: c,
                        }),
                  ),
                  e.createElement(
                    "div",
                    { className: "mt-3 flex items-center justify-between" },
                    e.createElement(
                      "span",
                      { className: "text-xs text-slate-500" },
                      tr("streak_progress", "Streak progress"),
                    ),
                    e.createElement(
                      "span",
                      { className: "text-xs text-slate-600 font-semibold" },
                      maxStreak,
                      " / ",
                      nextStreakTarget,
                      " ",
                      tr("days", "days"),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden",
                    },
                    e.createElement("div", {
                      className:
                        "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full",
                      style: { width: `${streakProgress}%` },
                    }),
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
                    { className: "flex items-center justify-between mb-1" },
                    e.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700" },
                      tr("milestones", "Milestones"),
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600 font-semibold" },
                      milestoneUnlockedCount,
                      "/",
                      milestones.length,
                    ),
                  ),
                  nextMilestone
                    ? e.createElement(
                        "p",
                        { className: "text-xs text-slate-500" },
                        tr("next_milestone", "Next milestone"),
                        ": ",
                        nextMilestone.title,
                      )
                    : e.createElement(
                        "p",
                        { className: "text-xs text-slate-500" },
                        tr("all_milestones_unlocked", "All milestones unlocked"),
                      ),
                ),
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
                      {
                        className:
                          "text-sm font-semibold text-slate-700 dark:text-slate-200",
                      },
                      tr("progress_tracker", "Progress Tracker"),
                    ),
                    e.createElement(
                      m,
                      { className: "bg-indigo-100 text-indigo-700" },
                      `${Y.filter((t) => t.done).length}/${Y.length}`,
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "space-y-2" },
                    Y.map((t) =>
                      e.createElement(
                        "div",
                        { key: t.key, className: "flex items-start gap-2" },
                        t.done
                          ? e.createElement(ie, {
                              className: "w-4 h-4 text-emerald-600 mt-0.5",
                            })
                          : e.createElement(oe, {
                              className: "w-4 h-4 text-slate-400 mt-0.5",
                            }),
                        e.createElement(
                          "div",
                          null,
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-sm font-medium text-slate-700 dark:text-slate-200",
                            },
                            t.label,
                          ),
                          e.createElement(
                            "p",
                            {
                              className:
                                "text-xs text-slate-500 dark:text-slate-400",
                            },
                            t.hint,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                e.createElement(
                  o,
                  {
                    type: "button",
                    className:
                      "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold",
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
                    ? tr("earn_xp_through_activity", "Earn XP through activity")
                    : w === "qualify_referral"
                      ? tr("share_referral_link_now", "Share referral link now")
                      : tr("review_account_activity", "Review account activity"),
                  e.createElement(de, { className: "w-4 h-4 ml-2" }),
                ),
                e.createElement(
                  o,
                  {
                    type: "button",
                    variant: "outline",
                    className: "w-full",
                    onClick: () => q("milestones"),
                  },
                  tr("view_milestones", "View milestones"),
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
                  e.createElement(P, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  a("daily_challenges"),
                ),
              ),
              e.createElement(
                i,
                { className: "space-y-4" },
                visibleChallenges.map((t, s) =>
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
                dailyChallenges.length > 3 &&
                  e.createElement(
                    o,
                    {
                      type: "button",
                      variant: "ghost",
                      className:
                        "w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                      onClick: () => setShowAllChallenges((t) => !t),
                    },
                    showAllChallenges
                      ? tr("show_less_challenges", "Show fewer challenges")
                      : tr("show_all_challenges", "View all challenges"),
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
                  tr("streaks_and_chain_rewards", "Streaks & Chain Rewards"),
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
                      tr("visit_streak", "Visit streak"),
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600" },
                      visitStreak,
                      " ",
                      tr("days", "days"),
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-2" },
                    e.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700" },
                      tr("post_streak", "Post streak"),
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-slate-600" },
                      postStreak,
                      " ",
                      tr("days", "days"),
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
                      tr("chain_rewards_earned", "Chain rewards earned"),
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
                      tr("chain_rewards_potential", "Potential chain rewards"),
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
                  tr("recent_rewards", "Recent rewards"),
                ),
              ),
              e.createElement(
                i,
                null,
                logLoading
                  ? e.createElement(
                      "p",
                      { className: "text-sm text-slate-500" },
                      tr("reward_log_loading", "Loading reward activity..."),
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
                                t.description ||
                                  t.action ||
                                  a("reward_log_action"),
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
                        tr("reward_log_empty", "No reward activity yet."),
                      ),
              ),
            ),
          ),
        ),
        e.createElement(
          C,
          { value: "referrals" },
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
                  e.createElement(_, { className: "w-5 h-5 text-indigo-600" }),
                  ` ${tr("referral_playbook", "Referral Playbook")}`,
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
                        {
                          className:
                            "text-xs text-slate-500 dark:text-slate-400",
                        },
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
                  ` ${tr("share_referral_to_start", "Share referral to start")}`,
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
                        "\uD83D\uDC65",
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
                          tr("browse_listings", "Browse Listings"),
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
                                getInitials(t?.name, "?"),
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
                                  `${tr("joined", "Joined")} `,
                                  t.joinDate,
                                ),
                                t.type === "indirect" &&
                                  t.depth &&
                                  e.createElement(
                                    "span",
                                    { className: "text-blue-500" },
                                    `${"\u2022"} ${tr("level", "Level")} `,
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
                              `${tr("potential", "Potential")} +${t.coins} ${tr("coins", "coins")}`,
                            ),
                            e.createElement(
                              "span",
                              {
                                className: `text-xs ${t.type === "direct" ? "text-green-600" : "text-blue-600"}`,
                              },
                              t.type === "direct"
                                ? tr("direct", "Direct")
                                : tr("indirect", "Indirect"),
                            ),
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
                ` ${tr("milestones_achievements", "Milestones & Achievements")}`,
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
                        tr("unlocked", "Unlocked!"),
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
                  tr("weekly_leaderboard", "Weekly Leaderboard"),
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
                    tr("next_payout", "Next payout"),
                    ": ",
                    leaderboardCountdown
                      ? leaderboardCountdown
                      : nextLeaderboardPayout
                        ? new Date(nextLeaderboardPayout).toLocaleString()
                        : tr("unknown", "Unknown"),
                  ),
                  lastLeaderboardPayout
                    ? e.createElement(
                        m,
                        { className: "bg-emerald-100 text-emerald-700" },
                        tr("last_payout", "Last payout"),
                        ": ",
                        new Date(lastLeaderboardPayout).toLocaleDateString(),
                      )
                    : null,
                ),
                e.createElement(
                  "p",
                  { className: "text-xs text-slate-500" },
                  tr(
                    "leaderboard_payout_notice",
                    "Payouts are processed weekly via background jobs. If jobs are paused, payouts may be delayed.",
                  ),
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
                    e.createElement(se, {
                      className: "w-5 h-5 text-indigo-600",
                    }),
                    " ",
                    tr("top_sellers", "Top Sellers"),
                  ),
                ),
                e.createElement(
                  i,
                  null,
                  publicWallLoading
                    ? e.createElement(
                        "p",
                        { className: "text-sm text-slate-500" },
                        tr("loading", "Loading..."),
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
                                  t.name || tr("user", "User"),
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "text-sm text-slate-600" },
                                tr("sales", "Sales"),
                                ": ",
                                t.sales ?? 0,
                              ),
                            ),
                          ),
                        )
                      : e.createElement(
                          "p",
                          { className: "text-sm text-slate-500" },
                          tr("no_leaderboard_data", "No leaderboard data yet."),
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
                    e.createElement(se, {
                      className: "w-5 h-5 text-emerald-600",
                    }),
                    " ",
                    tr("top_buyers", "Top Buyers"),
                  ),
                ),
                e.createElement(
                  i,
                  null,
                  publicWallLoading
                    ? e.createElement(
                        "p",
                        { className: "text-sm text-slate-500" },
                        tr("loading", "Loading..."),
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
                                  {
                                    className: "bg-emerald-50 text-emerald-600",
                                  },
                                  t.rank || `#${s + 1}`,
                                ),
                                e.createElement(
                                  "span",
                                  {
                                    className:
                                      "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                  },
                                  t.name || tr("user", "User"),
                                ),
                              ),
                              e.createElement(
                                "div",
                                { className: "text-sm text-slate-600" },
                                tr("purchases", "Purchases"),
                                ": ",
                                t.purchases ?? 0,
                              ),
                            ),
                          ),
                        )
                      : e.createElement(
                          "p",
                          { className: "text-sm text-slate-500" },
                          tr("no_leaderboard_data", "No leaderboard data yet."),
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
                  tr("payout_history", "Payout history"),
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
                                  ? tr("top_seller_reward", "Top seller reward")
                                  : tr("top_buyer_reward", "Top buyer reward")),
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
                      tr("no_payout_history", "No leaderboard payouts yet."),
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
