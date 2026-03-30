import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy as CopyIcon,
  Gift,
  Star,
  Trophy,
  Users,
  Zap,
  TrendingUp,
  Calendar,
  Share2,
  Award,
  Crown,
  Sparkles,
  Target,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react";
import api from "../lib/api";
import { buildApiPath } from "@/lib/networkConfig";
import {
  getAccessToken,
  getUserId,
  isAuthenticated,
} from "@/utils/authStorage";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/userDisplay";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { emitCoinBalanceUpdated } from "@/utils/appStateEvents";

const REWARD_ACTIVITY_LIMIT = 50;

const RewardsPage = () => {
  const [rewardsUser, setRewardsUser] = useState(null),
    [referralChain, setReferralChain] = useState([]),
    [isLoading, setIsLoading] = useState(!0),
    [errorObj, setErrorObj] = useState(null),
    [activeTab, setActiveTab] = useState("overview"),
    [refreshCounter, setRefreshCounter] = useState(0),
    [publicWall, setPublicWall] = useState({
      topSellers: [],
      topBuyers: [],
      topUsers: [],
    }),
    [publicWallLoading, setPublicWallLoading] = useState(!1),
    [referralLeaderboard, setReferralLeaderboard] = useState([]),
    [currentReferralRank, setCurrentReferralRank] = useState(null),
    [referralLeaderboardLoading, setReferralLeaderboardLoading] = useState(!1),
    [secretCountdown, setSecretCountdown] = useState(""),
    [leaderboardCountdown, setLeaderboardCountdown] = useState(""),
    [rewardLog, setRewardLog] = useState([]),
    [rewardLogLoading, setRewardLogLoading] = useState(!1),
    [coinBalance, setCoinBalance] = useState(null),
    [coinDelta, setCoinDelta] = useState(null),
    [coinHistory, setCoinHistory] = useState([]),
    [coinHistoryLoading, setCoinHistoryLoading] = useState(!1),
    [engagement, setEngagement] = useState(null),
    [engagementLoading, setEngagementLoading] = useState(!1),
    [engagementError, setEngagementError] = useState(null),
    [dailyCheckInLoading, setDailyCheckInLoading] = useState(!1),
    [spinLoading, setSpinLoading] = useState(!1),
    [scratchLoading, setScratchLoading] = useState(!1),
    [redeemDialogOpen, setRedeemDialogOpen] = useState(!1),
    [redeemDialogReward, setRedeemDialogReward] = useState(null),
    [redeemDialogPosts, setRedeemDialogPosts] = useState([]),
    [redeemDialogLoading, setRedeemDialogLoading] = useState(!1),
    [redeemDialogError, setRedeemDialogError] = useState(null),
    [redeemSelectedPostId, setRedeemSelectedPostId] = useState(""),
    [redeemProcessing, setRedeemProcessing] = useState(""),
    [showMoreStats, setShowMoreStats] = useState(!1),
    [showAllChallenges, setShowAllChallenges] = useState(!1),
    [historyFilter, setHistoryFilter] = useState("all"),
    [sseStatus, setSseStatus] = useState("connecting"),
    [lastSseUpdate, setLastSseUpdate] = useState(""),
    [sseFallbackActive, setSseFallbackActive] = useState(!1),
    sseFallbackTimerRef = useRef(null),
    coinDeltaTimerRef = useRef(null),
    previousCoinBalanceRef = useRef(null),
    refreshAttemptedRef = useRef(false),
    { t: tFunc } = useTranslation(),
    navigate = useNavigate(),
    tr = (key, fallback, options = {}) =>
      tFunc(key, { defaultValue: fallback, ...options }),
    { toast: toast } = useToast(),
    { user: authUser, refreshAuth: refreshAuthFromContext } = useAuth(),
    isAuthed = useMemo(() => isAuthenticated(authUser), [authUser]),
    currentUserId = useMemo(() => getUserId(authUser), [authUser]),
    r = rewardsUser || {},
    attemptAuthRefresh = useCallback(async () => {
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
    resolveMessage = useCallback(
      (t) => {
        if (!t) return "";
        if (typeof t === "string") return t;
        const s = t.key ? tFunc(t.key, t.params) : "";
        if (typeof s == "string" && s && s !== t.key) return s;
        return t.fallback || "";
      },
      [tFunc],
    ),
    resolveIconComponent = useCallback((icon, fallback) => {
      if (!icon) return fallback;
      if (typeof icon === "function") return icon;
      if (typeof icon === "object") {
        if (icon.default) return icon.default;
      }
      return fallback;
    }, []),
    renderIcon = useCallback(
      (icon, props, fallback = Sparkles) => {
        if (React.isValidElement(icon)) {
          return React.cloneElement(icon, props);
        }
        const Component = resolveIconComponent(icon, fallback);
        return React.createElement(Component, props);
      },
      [resolveIconComponent],
    ),
    showDiagnostics =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("rewardsDebug"),
    diagnostics = useMemo(
      () => ({
        referralCode: Boolean(rewardsUser?.referralCode),
        secretCode: Boolean(rewardsUser?.dailySecretCode),
        progress: Number.isFinite(Number(coinBalance ?? rewardsUser?.totalCoins)),
        leaderboard: Boolean(
          rewardsUser?.leaderboard?.nextPayoutAt ||
            publicWall?.topSellers?.length ||
            publicWall?.topBuyers?.length ||
            publicWall?.topUsers?.length,
        ),
        referralLedgerStatus: rewardsUser?.referralLedger?.status || "unknown",
        referralLedgerOk: rewardsUser?.referralLedger?.status === "ok",
        sseStatus,
        sseFallbackActive,
        lastSseUpdate,
      }),
      [rewardsUser, publicWall, sseStatus, sseFallbackActive, lastSseUpdate, coinBalance],
    ),
    formatCountdown = useCallback(
      (t) => {
        if (!t) return "";
        const s = new Date(t).getTime();
        if (Number.isNaN(s)) return "";
        const f = s - Date.now();
        if (f <= 0) return tr("expired", "Expired");
        const u = Math.ceil(f / 6e4);
        const shareReferral = Math.floor(u / 60);
        const fetchRewards = u % 60;
        if (shareReferral >= 24) {
          const copyToClipboard = Math.floor(shareReferral / 24);
          const xpProgressPercent = shareReferral % 24;
          return `${copyToClipboard}d ${xpProgressPercent}h`;
        }
        return `${shareReferral}h ${fetchRewards}m`;
      },
      [tFunc],
    ),
    applyCoinBalanceUpdate = useCallback((nextBalance, { silentDelta = !1, source = "rewards" } = {}) => {
      const normalized = Number(nextBalance);
      if (!Number.isFinite(normalized)) return;
      const previous = previousCoinBalanceRef.current;
      previousCoinBalanceRef.current = normalized;
      setCoinBalance(normalized);
      emitCoinBalanceUpdated(normalized, { source });
      if (!silentDelta && Number.isFinite(previous) && previous !== normalized) {
        setCoinDelta({
          key: Date.now(),
          amount: normalized - previous,
        });
      }
    }, []),
    fetchRewards = useCallback(
      async ({ silent: t = !1, allowRetry: retry = !0 } = {}) => {
        if (!isAuthed) {
          setErrorObj({
            key: "rewards_login_required",
            fallback: "You must be logged in to view rewards.",
          }),
            setIsLoading(!1);
          return;
        }
        const s = getUserId(authUser);
        t || setIsLoading(!0), setErrorObj(null);
        try {
          const endpoint = s
            ? "/rewards?userId=".concat(encodeURIComponent(s))
            : "/rewards";
          const u = await api.get(endpoint);
          u && (setRewardsUser(u.user || null), setReferralChain(u.referralChain || []));
        } catch (u) {
          const status = u?.status ?? u?.response?.status ?? null;
          if (retry && (status === 401 || status === 403)) {
            const refreshed = await attemptAuthRefresh();
            if (refreshed) {
              return fetchRewards({ silent: t, allowRetry: false });
            }
          }
          t ||
            setErrorObj({
              key: "rewards_fetch_failed",
              fallback: u.message || "Failed to fetch rewards",
            });
        } finally {
          t || setIsLoading(!1);
        }
      },
      [isAuthed, authUser, attemptAuthRefresh],
    ),
    fetchEngagement = useCallback(
      async ({ silent: t = !1 } = {}) => {
        if (!isAuthed) return;
        t || (setEngagementLoading(!0), setEngagementError(null));
        try {
          const s = await api.get("/coins/engagement");
          setEngagement(s || null);
        } catch (s) {
          if (!t) {
            setEngagementError({
              key: "engagement_fetch_failed",
              fallback:
                s?.message || "Failed to load rewards progress",
            });
          }
          setEngagement(null);
        } finally {
          t || setEngagementLoading(!1);
        }
      },
      [isAuthed, tr],
    );
  const errorMessage = resolveMessage(errorObj);
  const engagementErrorMessage = resolveMessage(engagementError);
  const redeemDialogErrorMessage = resolveMessage(redeemDialogError);
  useEffect(() => { document.title = "MHub — Rewards"; return () => { document.title = "MHub"; }; }, []);

  useEffect(() => {
    if (!isAuthed) {
      setErrorObj({
        key: "rewards_login_required",
        fallback: "You must be logged in to view rewards.",
      }),
        setIsLoading(!1);
      return;
    }
    fetchRewards({ silent: !1 });
  }, [isAuthed, refreshCounter, fetchRewards]),
    useEffect(() => {
      if (!isAuthed) return;
      fetchEngagement({ silent: !1 });
    }, [isAuthed, refreshCounter, fetchEngagement]),
    useEffect(() => {
      refreshAttemptedRef.current = false;
    }, [authUser]),
    useEffect(() => {
      if (!isAuthed) return;
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
          fetchRewards({ silent: !0 });
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
    }, [isAuthed, fetchRewards]);
  useEffect(() => {
    if (!isAuthed || !sseFallbackActive) {
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
      fetchRewards({ silent: !0 });
    }, 30000);

    sseFallbackTimerRef.current = interval;
    return () => {
      clearInterval(interval);
      sseFallbackTimerRef.current = null;
    };
  }, [isAuthed, sseFallbackActive, fetchRewards]);
  useEffect(() => {
    if (!isAuthed) return;
    let t = !0;
    (async () => {
      try {
        setPublicWallLoading(!0);
        const s = await api.get("/public-wall");
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
  }, [isAuthed]);
  useEffect(() => {
    if (!isAuthed) return;
    let t = !0;
    (async () => {
      try {
        setReferralLeaderboardLoading(!0);
        const leaderboardPath = currentUserId
          ? `/referral/leaderboard?period=weekly&limit=5&userId=${encodeURIComponent(currentUserId)}`
          : "/referral/leaderboard?period=weekly&limit=5";
        const s = await api
          .get(leaderboardPath)
          .catch(() => null);
        if (!t) return;
        const list = Array.isArray(s?.leaderboard)
          ? s.leaderboard
          : Array.isArray(s)
            ? s
            : [];
        const fallbackRankIndex = currentUserId
          ? list.findIndex(
              (entry) =>
                String(entry?.user_id ?? entry?.id ?? "") === String(currentUserId),
            )
          : -1;
        const fallbackRank =
          fallbackRankIndex >= 0
            ? {
                ...list[fallbackRankIndex],
                rank: list[fallbackRankIndex]?.rank ?? fallbackRankIndex + 1,
              }
            : null;
        setReferralLeaderboard(list);
        setCurrentReferralRank(
          s?.currentUserRank && typeof s.currentUserRank === "object"
            ? s.currentUserRank
            : fallbackRank,
        );
      } catch {
        if (!t) return;
        setReferralLeaderboard([]);
        setCurrentReferralRank(null);
      } finally {
        if (t) setReferralLeaderboardLoading(!1);
      }
    })();
    return () => {
      t = !1;
    };
  }, [isAuthed, refreshCounter, currentUserId]);
  useEffect(() => {
    if (!isAuthed) return;
    let t = !0;
    (async () => {
      try {
        setRewardLogLoading(!0);
        const s = await api.get(`/rewards/log?limit=${REWARD_ACTIVITY_LIMIT}`);
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
  }, [isAuthed, refreshCounter]);
  useEffect(() => {
    if (!isAuthed) return;
    let t = !0;
    (async () => {
      try {
        setCoinHistoryLoading(!0);
        const [balanceRes, historyRes] = await Promise.all([
          api.get("/coins/balance").catch(() => null),
          api.get(`/coins/history?limit=${REWARD_ACTIVITY_LIMIT}`).catch(() => null),
        ]);
        if (!t) return;
        const nextBalance = balanceRes?.balance ?? balanceRes?.coins;
        if (Number.isFinite(Number(nextBalance))) {
          applyCoinBalanceUpdate(nextBalance, {
            silentDelta: !0,
            source: "rewards-fetch",
          });
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
  }, [isAuthed, refreshCounter, applyCoinBalanceUpdate]);
  useEffect(() => {
    if (!coinDelta?.key) {
      if (coinDeltaTimerRef.current) {
        clearTimeout(coinDeltaTimerRef.current);
        coinDeltaTimerRef.current = null;
      }
      return;
    }
    if (coinDeltaTimerRef.current) {
      clearTimeout(coinDeltaTimerRef.current);
    }
    coinDeltaTimerRef.current = setTimeout(() => {
      setCoinDelta(null);
      coinDeltaTimerRef.current = null;
    }, 1800);
    return () => {
      if (coinDeltaTimerRef.current) {
        clearTimeout(coinDeltaTimerRef.current);
        coinDeltaTimerRef.current = null;
      }
    };
  }, [coinDelta]);
  useEffect(() => {
    const t = rewardsUser?.dailySecretCodeExpiresAt;
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
  }, [rewardsUser?.dailySecretCodeExpiresAt, formatCountdown]);
  useEffect(() => {
    const t = rewardsUser?.leaderboard?.nextPayoutAt;
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
  }, [rewardsUser?.leaderboard?.nextPayoutAt, formatCountdown]);
  const copyToClipboard = (t, s) => {
      navigator.clipboard.writeText(t),
        toast({
          title: tr("copied", "Copied!"),
          description: s || t,
        });
    },
    shareReferral = () => {
      const t = `${window.location.origin}/signup?ref=${r?.referralCode}`;
      navigator.share
        ? navigator.share({
            title: tr("join_mhub", "Join MHub!"),
            text: tr("use_my_referral_code", "Use my referral code"),
            url: t,
          })
        : copyToClipboard(t, tr("referral_link", "Referral link"));
    },
    getReferralShareLink = () => {
      if (typeof window === "undefined") return "";
      return rewardsUser?.referralCode
        ? `${window.location.origin}/signup?ref=${r.referralCode}`
        : "";
    },
    openShare = (t) => {
      if (typeof window === "undefined" || !t) return;
      window.open(t, "_blank", "noopener,noreferrer");
    },
    shareWhatsApp = () => {
      const t = getReferralShareLink();
      if (!t) return;
      const s = encodeURIComponent(
        `${tr("referral_share_text", "Join MHub with my referral link and earn bonus coins!")} ${t}`,
      );
      openShare(`https://wa.me/?text=${s}`);
    },
    shareTelegram = () => {
      const t = getReferralShareLink();
      if (!t) return;
      const s = encodeURIComponent(
        tr("referral_share_text", "Join MHub with my referral link and earn bonus coins!"),
      );
      openShare(`https://t.me/share/url?url=${encodeURIComponent(t)}&text=${s}`);
    },
    shareSms = () => {
      const t = getReferralShareLink();
      if (!t || typeof window === "undefined") return;
      const s = encodeURIComponent(
        `${tr("referral_share_text", "Join MHub with my referral link and earn bonus coins!")} ${t}`,
      );
      window.location.href = `sms:?&body=${s}`;
    },
    copyReferralLink = () => {
      const t = getReferralShareLink();
      if (!t) return;
      copyToClipboard(t, tr("referral_link", "Referral link"));
    },
    showComingSoon = (t) => {
      toast({
        title: tr("coming_soon", "Coming soon"),
        description: tr("coming_soon_desc", `${t} is on the way.`, {
          feature: t,
        }),
      });
    },
    triggerRefresh = () => setRefreshCounter((t) => t + 1),
    handleDailyCheckIn = async () => {
      if (dailyCheckInLoading) return;
      setDailyCheckInLoading(!0);
      try {
        const t = await api.post("/coins/daily-checkin");
        if (Number.isFinite(Number(t?.newBalance))) {
          applyCoinBalanceUpdate(t.newBalance, { source: "daily-checkin" });
        }
        fetchEngagement({ silent: !0 });
        triggerRefresh();
        toast({
          title: tr("daily_checkin_claimed", "Daily reward claimed!"),
          description: tr("coins_earned", "You earned {{count}} coins", {
            count: t?.reward ?? 0,
          }),
        });
      } catch (t) {
        toast({
          title: tr("daily_checkin_failed", "Check-in failed"),
          description:
            t?.response?.data?.error ||
            t?.message ||
            tr("try_again", "Try again"),
          variant: "destructive",
        });
      } finally {
        setDailyCheckInLoading(!1);
      }
    },
    handleSpinWheel = async () => {
      if (spinLoading) return;
      setSpinLoading(!0);
      try {
        const t = await api.post("/coins/spin");
        if (Number.isFinite(Number(t?.newBalance))) {
          applyCoinBalanceUpdate(t.newBalance, { source: "spin-wheel" });
        }
        fetchEngagement({ silent: !0 });
        triggerRefresh();
        toast({
          title: tr("spin_won", "Spin complete!"),
          description: tr("coins_earned", "You earned {{count}} coins", {
            count: t?.reward ?? 0,
          }),
        });
      } catch (t) {
        toast({
          title: tr("spin_failed", "Spin failed"),
          description:
            t?.response?.data?.error ||
            t?.message ||
            tr("try_again", "Try again"),
          variant: "destructive",
        });
      } finally {
        setSpinLoading(!1);
      }
    },
    handleScratchCard = async () => {
      if (scratchLoading) return;
      setScratchLoading(!0);
      try {
        const t = await api.post("/coins/scratch");
        if (Number.isFinite(Number(t?.newBalance))) {
          applyCoinBalanceUpdate(t.newBalance, { source: "scratch-card" });
        }
        fetchEngagement({ silent: !0 });
        triggerRefresh();
        toast({
          title: tr("scratch_won", "Scratch complete!"),
          description: tr("coins_earned", "You earned {{count}} coins", {
            count: t?.reward ?? 0,
          }),
        });
      } catch (t) {
        toast({
          title: tr("scratch_failed", "Scratch failed"),
          description:
            t?.response?.data?.error ||
            t?.message ||
            tr("try_again", "Try again"),
          variant: "destructive",
        });
      } finally {
        setScratchLoading(!1);
      }
    },
    handleClaimMilestone = async () => {
      if (!milestoneEligible) {
        shareReferral();
        return;
      }
      if (redeemProcessing === "milestone") return;
      setRedeemProcessing("milestone");
      try {
        const t = await api.post("/coins/referral-milestones");
        if (Number.isFinite(Number(t?.milestone?.reward))) {
          toast({
            title: tr("milestone_claimed", "Milestone claimed!"),
            description: tr("coins_earned", "You earned {{count}} coins", {
              count: t.milestone.reward,
            }),
          });
        } else {
          toast({
            title: tr("milestone_claimed", "Milestone claimed!"),
            description: tr("reward_applied", "Your reward has been applied."),
          });
        }
        if (Number.isFinite(Number(t?.balance))) {
          applyCoinBalanceUpdate(t.balance, { source: "milestone-claim" });
        }
        fetchEngagement({ silent: !0 });
        triggerRefresh();
      } catch (t) {
        toast({
          title: tr("milestone_failed", "Claim failed"),
          description:
            t?.response?.data?.error ||
            t?.message ||
            tr("try_again", "Try again"),
          variant: "destructive",
        });
      } finally {
        setRedeemProcessing("");
      }
    },
    openRedeemDialog = async (t) => {
      setRedeemDialogReward(t);
      setRedeemDialogOpen(!0);
      setRedeemDialogError(null);
      setRedeemSelectedPostId("");
      if (!t?.requiresPost) return;
      const s = getUserId(authUser);
      if (!s) {
        setRedeemDialogError({
          key: "user_id_missing_refresh",
          fallback: "User ID missing. Please refresh.",
        });
        return;
      }
      setRedeemDialogLoading(!0);
      try {
        const f = await api.get("/posts/mine", {
          params: {
            userId: s,
            limit: 50,
            page: 1,
            sortBy: "created_at",
            sortOrder: "desc",
          },
        });
        const u = f?.data ?? f;
        const shareReferral = Array.isArray(u?.posts) ? u.posts : [];
        const activePosts = shareReferral.filter(
          (fetchRewards) => String(fetchRewards?.status || "").toLowerCase() === "active",
        );
        setRedeemDialogPosts(activePosts);
        if (!activePosts.length) {
          setRedeemDialogError({
            key: "no_active_posts",
            fallback: "No active posts available for redemption.",
          });
        }
      } catch (f) {
        setRedeemDialogError({
          key: "redeem_posts_failed",
          fallback:
            f?.message || "Failed to load posts for redemption.",
        });
      } finally {
        setRedeemDialogLoading(!1);
      }
    },
    handleRedeemStore = async () => {
      const t = redeemDialogReward;
      if (!t) return;
      if (redeemProcessing) return;
      if (t.requiresPost && !redeemSelectedPostId) {
        setRedeemDialogError({
          key: "select_post_required",
          fallback: "Select a post to redeem this reward.",
        });
        return;
      }
      setRedeemProcessing(t.key);
      setRedeemDialogError(null);
      try {
        const s = await api.post("/coins/store-redeem", {
          type: t.key,
          postId: t.requiresPost ? redeemSelectedPostId : null,
        });
        if (Number.isFinite(Number(s?.newBalance))) {
          applyCoinBalanceUpdate(s.newBalance, { source: "store-redeem" });
        }
        fetchEngagement({ silent: !0 });
        triggerRefresh();
        setRedeemDialogOpen(!1);
        toast({
          title: tr("redeem_success", "Reward redeemed!"),
          description:
            tr("redeem_success_desc", "Your reward has been applied.") ||
            "",
        });
      } catch (s) {
        setRedeemDialogError({
          key: "redeem_failed",
          fallback:
            s?.response?.data?.error ||
            s?.message ||
            "Failed to redeem reward.",
        });
      } finally {
        setRedeemProcessing("");
      }
    };
  if (!isAuthed)
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      },
      React.createElement(
        "div",
        {
          className:
            "bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-center max-w-md",
        },
        React.createElement(
          "div",
          {
            className:
              "w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center",
          },
          React.createElement(Gift, { className: "w-10 h-10 text-white" }),
        ),
        React.createElement(
          "h2",
          { className: "text-3xl font-bold text-gray-900 dark:text-white mb-4" },
          tFunc("rewards_referrals"),
        ),
        React.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-300 text-lg mb-4" },
          tFunc("earn_coins_unlock_rewards"),
        ),
        React.createElement(
          "div",
          { className: "flex flex-col gap-3" },
          React.createElement(
            Link,
            {
              to: "/login",
              className:
                "bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition",
            },
            tFunc("login_to_continue"),
          ),
          React.createElement(
            Link,
            {
              to: "/signup",
              className:
                "border-2 border-blue-200 text-blue-700 dark:text-blue-200 text-lg px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-white/10 transition",
            },
            tFunc("create_account"),
          ),
        ),
      ),
    );
  if (isLoading)
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      },
      React.createElement(
        "div",
        { className: "text-center" },
        React.createElement("div", {
          className:
            "w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4",
        }),
        React.createElement(
          "p",
          { className: "text-gray-600 font-medium" },
          tFunc("loading"),
        ),
      ),
    );
  if (errorMessage)
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      },
      React.createElement(
        "div",
        { className: "text-center p-4" },
        React.createElement("div", { className: "text-6xl mb-4" }, "\uD83D\uDE15"),
        React.createElement(
          "p",
          { className: "text-red-500 text-xl mb-4" },
          errorMessage,
        ),
        React.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          React.createElement(
            Button,
            { onClick: () => setRefreshCounter((t) => t + 1) },
            tr("try_again", "Try Again"),
          ),
          React.createElement(
            Button,
            {
              type: "button",
              variant: "outline",
              onClick: () => navigate("/all-posts"),
            },
            tr("browse_listings", "Browse Listings"),
          ),
        ),
      ),
    );
  if (!rewardsUser)
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900",
      },
      React.createElement(
        "div",
        {
          className:
            "max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg text-center",
        },
        React.createElement(
          "h2",
          { className: "text-xl font-bold text-slate-800 dark:text-slate-100 mb-2" },
          tr("rewards_profile_unavailable", "Rewards profile unavailable"),
        ),
        React.createElement(
          "p",
          { className: "text-sm text-slate-600 dark:text-slate-300 mb-5" },
          tr(
            "rewards_profile_unavailable_desc",
            tr(
              "rewards_profile_unavailable_desc",
              "We could not load your rewards profile. Retry or continue browsing.",
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-2" },
          React.createElement(
            Button,
            { type: "button", onClick: () => setRefreshCounter((t) => t + 1) },
            tr("retry", "Retry"),
          ),
          React.createElement(
            Button,
            {
              type: "button",
              variant: "outline",
              onClick: () => navigate("/all-posts"),
            },
            tr("browse_listings", "Browse Listings"),
          ),
        ),
      ),
    );
  const xpProgressPercent = Math.min((rewardsUser.xpCurrent / rewardsUser.xpRequired) * 100, 100),
    xpRemaining = Math.max(0, Number(rewardsUser.xpRequired || 0) - Number(rewardsUser.xpCurrent || 0)),
    visitStreak = Number(rewardsUser.visitStreak ?? rewardsUser.streak ?? 0),
    postStreak = Number(rewardsUser.postStreak || 0),
    maxStreak = Math.max(visitStreak, postStreak),
    qualifiedReferrals = Number(rewardsUser.qualifiedReferrals ?? rewardsUser.successfulRefs ?? 0),
    totalReferrals = Number(rewardsUser.totalReferrals || 0),
    milestone = engagement?.referralMilestone || null,
    referralGoal = Number(milestone?.target || 3),
    referralReward = Number(milestone?.reward || 50),
    referralCurrent = Number(
      milestone?.current ?? totalReferrals,
    ),
    referralProgress = Math.min(referralGoal, referralCurrent),
    referralDisplay = Math.max(0, referralCurrent),
    referralProgressPercent = referralGoal
      ? Math.min(100, Math.round((referralProgress / referralGoal) * 100))
      : 0,
    milestoneClaimed = Boolean(milestone?.claimed),
    milestoneEligible = Boolean(milestone?.eligible) && !milestoneClaimed,
    chainEarnedPoints = Number(rewardsUser.chainEarnedPoints || 0),
    chainPotentialPoints = Number(rewardsUser.potentialReferralPoints || 0),
    nextStreakTarget = [7, 14, 30].find((t) => maxStreak < t) || 30,
    streakProgress = nextStreakTarget
      ? Math.min(100, Math.round((maxStreak / nextStreakTarget) * 100))
      : 0,
    displayCoins = coinBalance !== null ? coinBalance : rewardsUser.totalCoins,
    currentLevel = Number(rewardsUser.level || 1),
    coinsGoal = 500,
    referralSummaryGoal = Math.max(5, referralGoal || 5),
    rewardLogItems = coinHistory.length
      ? coinHistory.map((entry) => ({
          action: entry.type || "coin",
          points: Number(entry.amount ?? 0),
          description: entry.description || entry.type || tFunc("reward_log_action"),
          created_at: entry.created_at,
        }))
      : Array.isArray(rewardLog)
        ? rewardLog
        : [],
    filteredRewardLogItems = rewardLogItems.filter((entry) => {
      if (historyFilter === "earned") {
        return Number(entry?.points || 0) > 0;
      }
      if (historyFilter === "spent") {
        return Number(entry?.points || 0) < 0;
      }
      const actionText = String(entry?.action || entry?.description || "").toLowerCase();
      if (historyFilter === "referral") {
        return actionText.includes("referral");
      }
      if (historyFilter === "daily") {
        return (
          actionText.includes("daily") ||
          actionText.includes("checkin") ||
          actionText.includes("spin") ||
          actionText.includes("scratch")
        );
      }
      return true;
    }),
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
    nextAction =
      xpRemaining > 0
        ? "earn_xp"
        : qualifiedReferrals === 0
          ? "qualify_referral"
          : "maintain_streak",
    onboardingSteps = [
      {
        key: "share",
        label: tr("share_referral_code", "Share your referral code"),
        done: !!rewardsUser.referralCode,
        hint: rewardsUser.referralCode
          ? `${tr("code", "Code")} ${r.referralCode}`
          : tr("generate_from_referral_card", "Generate from referral card"),
      },
      {
        key: "invite",
        label: tr("invite_one_friend", "Invite at least 1 friend"),
        done: Number(rewardsUser.totalReferrals || 0) > 0,
        hint: tr(
          "rewards_invited_count",
          `${Number(r.totalReferrals || 0)} invited`,
          {
            count: Number(rewardsUser.totalReferrals || 0),
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
        done: xpRemaining === 0,
        hint:
          xpRemaining === 0
            ? tr("rewards_levelup_ready", "Level-up ready")
            : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                count: xpRemaining,
              }),
      },
    ],
    referralSteps = [
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
    activityStats = rewardsUser.activityStats || {},
    directReferrals = referralChain.filter(
      (t) => t?.type === "direct" || t?.depth === 1 || t?.level === 1,
    ),
    indirectReferrals = referralChain.filter(
      (t) =>
        t?.type === "indirect" ||
        (t?.depth && t.depth > 1) ||
        (t?.level && t.level > 1),
    ),
    dailyCheckInStatus = engagement?.dailyCheckIn || null,
    spinStatus = engagement?.spin || null,
    scratchStatus = engagement?.scratch || null,
    dailyCheckInRewards = [
      { day: 1, coins: 5 },
      { day: 2, coins: 10 },
      { day: 3, coins: 15 },
      { day: 4, coins: 20 },
      { day: 5, coins: 30 },
      { day: 6, coins: 50 },
      { day: 7, coins: 100 },
    ],
    currentCheckInDay = dailyCheckInStatus?.currentDay
      ? dailyCheckInStatus.currentDay
      : Math.max(1, Math.min(7, visitStreak || 1)),
    hasCheckedInToday =
      typeof dailyCheckInStatus?.hasCheckedInToday === "boolean"
        ? dailyCheckInStatus.hasCheckedInToday
        : Number(activityStats.visitsToday || 0) > 0,
    leaderboardHistory = Array.isArray(rewardsUser.leaderboard?.history)
      ? rewardsUser.leaderboard.history
      : [],
    nextLeaderboardPayout = rewardsUser.leaderboard?.nextPayoutAt || "",
    lastLeaderboardPayout = rewardsUser.leaderboard?.lastPayoutAt || "",
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
        completed: xpRemaining === 0,
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
        unlocked: Boolean(rewardsUser.profileComplete),
      },
      {
        icon: "\uD83D\uDCDD",
        title: tr("first_post", "First Post"),
        unlocked: Boolean(rewardsUser.hasPosted),
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
          Math.max(Number(rewardsUser.visitStreak || 0), Number(rewardsUser.postStreak || 0)) >= 7,
      },
      {
        icon: "\uD83D\uDC8E",
        title: tr("premium_user", "Premium User"),
        unlocked: rewardsUser.rank === "Gold" || rewardsUser.rank === "Platinum",
      },
      {
        icon: "\u2B50",
        title: tr("top_seller", "Top Seller"),
        unlocked: Number(activityStats.salesCount || 0) >= 5,
      },
      {
        icon: "\uD83C\uDFC6",
        title: tr("gold_rank", "Gold Rank"),
        unlocked: rewardsUser.rank === "Gold" || rewardsUser.rank === "Platinum",
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
    levelBenefits = [
      {
        key: "bronze",
        level: 1,
        title: tr("level_bronze", "Level 1 - Bronze"),
        perks: [
          tr("post_5_items", "Post 5 items/day"),
          tr("basic_visibility", "Basic visibility"),
        ],
      },
      {
        key: "silver",
        level: 2,
        title: tr("level_silver", "Level 2 - Silver"),
        perks: [
          tr("post_10_items", "Post 10 items/day"),
          tr("boosted_listings", "Boosted listings"),
        ],
      },
      {
        key: "gold",
        level: 3,
        title: tr("level_gold", "Level 3 - Gold"),
        perks: [
          tr("premium_badge", "Premium badge"),
          tr("double_visibility", "2x visibility"),
        ],
      },
    ],
    primaryStats = [
      {
        key: "coins",
        label: tr("coins_earned", "Coins Earned"),
        value: displayCoins,
        icon: Zap,
        accent: "from-yellow-400 to-orange-500",
        progress: Math.min(
          100,
          Math.round((Number(displayCoins || 0) / coinsGoal) * 100),
        ),
        ringColor: "#f59e0b",
      },
      {
        key: "referrals",
        label: tr("friends_referred", "Friends Referred"),
        value: totalReferrals,
        icon: Users,
        accent: "from-blue-400 to-blue-600",
        progress: Math.min(
          100,
          Math.round((Number(totalReferrals || 0) / referralSummaryGoal) * 100),
        ),
        ringColor: "#2563eb",
      },
      {
        key: "streak",
        label: tr("day_streak", "Day Streak"),
        value: visitStreak,
        icon: TrendingUp,
        accent: "from-emerald-400 to-green-600",
        progress: streakProgress,
        ringColor: "#10b981",
      },
    ],
    secondaryStats = [
      {
        key: "qualified",
        label: tFunc("qualified_referrals") || tFunc("verified_refs"),
        value: qualifiedReferrals,
        icon: Award,
        accent: "from-purple-400 to-purple-600",
      },
      {
        key: "milestones",
        label: tr("milestones", "Milestones"),
        value: `${milestoneUnlockedCount}/${milestones.length}`,
        icon: Star,
        accent: "from-amber-400 to-yellow-600",
      },
    ],
    earnPlaybook = [
      {
        key: "invite",
        label: tr("invite_friend", "Invite a friend"),
        reward: referralReward,
        current: Math.max(0, referralCurrent),
        target: Math.max(1, referralGoal),
        icon: Users,
        cta: milestoneEligible
          ? tr("claim_reward", "Claim reward")
          : tr("start_inviting", "Start now"),
        onClick: milestoneEligible ? handleClaimMilestone : shareReferral,
      },
      {
        key: "post_item",
        label: tr("post_item", "Post an item"),
        reward: 5,
        current: Math.min(3, Number(activityStats.postsCount || 0)),
        target: 3,
        icon: Gift,
        cta: tr("start_posting", "Start now"),
        onClick: () => navigate("/post_add"),
      },
      {
        key: "complete_sale",
        label: tr("complete_sale", "Complete a sale"),
        reward: 25,
        current: Math.min(1, Number(activityStats.salesCount || 0)),
        target: 1,
        icon: Zap,
        cta: tr("start_selling", "Start now"),
        onClick: () => navigate("/my-home"),
      },
    ],
    redeemOptions = [
      {
        key: "boost",
        title: tr("redeem_boost_title", "Boost listing"),
        desc: tr(
          "redeem_boost_desc",
          "Push one listing to the top for 24 hours.",
        ),
        cost: 100,
        icon: Zap,
        accent: "from-indigo-500 to-sky-500",
        href: "/tier-selection",
        requiresPost: true,
        cta: tr("redeem_boost_cta", "Redeem boost"),
      },
      {
        key: "badge",
        title: tr("redeem_badge_title", "Premium badge"),
        desc: tr(
          "redeem_badge_desc",
          "Unlock a premium badge on your profile.",
        ),
        cost: 200,
        icon: Crown,
        accent: "from-amber-500 to-rose-500",
        href: "/tier-selection",
        requiresPost: false,
        cta: tr("redeem_badge_cta", "Redeem badge"),
      },
      {
        key: "top_search",
        title: tr("redeem_top_search_title", "Top search placement"),
        desc: tr(
          "redeem_top_search_desc",
          "Keep your listing on top of search results.",
        ),
        cost: 500,
        icon: Star,
        accent: "from-purple-500 to-pink-500",
        href: "/tier-selection",
        requiresPost: true,
        cta: tr("redeem_top_search_cta", "Redeem placement"),
      },
    ];
  const availableCoins = Number.isFinite(Number(displayCoins))
    ? Number(displayCoins)
    : 0;
  const referralShareLink = getReferralShareLink();
  const referralShareDisplay = referralShareLink
    ? referralShareLink.replace("/signup?ref=", "/invite/")
    : "";
  const shareDisabled = !referralShareLink;
  const nextRewardTarget = 50;
  const nextRewardLabel = tr(
    "next_reward_label",
    "Free Listing Boost",
  );
  const nextRewardProgress = nextRewardTarget
    ? Math.min(100, Math.round((availableCoins / nextRewardTarget) * 100))
    : 0;
  const nextRewardRemaining = Math.max(0, nextRewardTarget - availableCoins);
  const tabButtonClass = (tab) =>
    "rewards-tab-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 " +
    (activeTab === tab
      ? "active border-indigo-500 bg-indigo-600 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white");
  return React.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900 page-fade-in",
      style: { paddingBottom: "80px" },
    },
    React.createElement(
      "div",
      { className: "relative overflow-hidden" },
      React.createElement("div", {
        className:
          "absolute inset-0 bg-gradient-to-r from-sky-500 via-blue-500 to-violet-400 opacity-95",
      }),
      React.createElement("div", {
        className: "absolute inset-0 opacity-10",
        style: {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        },
      }),
      React.createElement(
        "div",
        {
          className:
            "relative max-w-6xl mx-auto px-4 py-2 sm:px-6 sm:py-3",
        },
        React.createElement(
          "div",
          { className: "mb-3 text-center md:text-left" },
          React.createElement(
            "p",
            {
              className:
                "text-[11px] uppercase tracking-[0.15em] text-white/75 mb-1",
            },
            tr("rewards_program", "Rewards Program"),
          ),
          React.createElement(
            "h1",
            { className: "text-xl md:text-2xl font-bold text-white" },
            tr("rewards_title", "Rewards & Referrals"),
          ),
          React.createElement(
            "p",
            { className: "text-sm sm:text-base text-white/85 mt-1" },
            tr(
              "rewards_subtitle",
              "Track progress, earn points, and unlock perks for every milestone.",
            ),
          ),
        ),
        React.createElement(
          "div",
        {
          className: "grid grid-cols-1 lg:grid-cols-3 gap-3",
        },
          React.createElement(
            "div",
          {
            className:
              "rewards-hero-card rounded-2xl p-3 text-white page-fade-in page-fade-in-delay-1",
          },
            React.createElement(
              "div",
              { className: "flex items-center gap-4" },
              React.createElement(
                "div",
                { className: "relative" },
                React.createElement(
                  Avatar,
                  { className: "h-10 w-10 ring-2 ring-white/40 shadow-lg" },
                  React.createElement(
                    AvatarFallback,
                    {
                      className: `text-lg font-bold text-white bg-gradient-to-br ${$[r.rank] || "from-blue-500 to-indigo-600"}`,
                    },
                    getInitials(rewardsUser?.name, "U"),
                  ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md",
                  },
                  React.createElement(Crown, {
                    className: "w-4 h-4 text-yellow-500",
                  }),
                ),
              ),
              React.createElement(
                "div",
                { className: "min-w-0" },
                React.createElement(
                  "h2",
                  {
                    className: "text-sm font-semibold truncate",
                    title: rewardsUser.name || tr("user", "User"),
                  },
                  rewardsUser.name || tr("user", "User"),
                ),
                React.createElement(
                  "div",
                  { className: "flex flex-wrap gap-2 mt-1" },
                  React.createElement(
                    Badge,
                    {
                      className: `bg-gradient-to-r ${$[r.rank] || "from-blue-500 to-indigo-600"} text-white border-0`,
                    },
                    React.createElement(Trophy, { className: "w-3 h-3 mr-1" }),
                    " ",
                    rewardsUser.rank,
                  ),
                  React.createElement(
                    Badge,
                    { className: "bg-white/20 text-white border-0" },
                    tr("level", "Level"),
                    " ",
                    rewardsUser.level,
                  ),
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "mt-2" },
              React.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-between text-xs text-white/70",
                },
                React.createElement(
                  "span",
                  null,
                  tr("level_progress", "Level progress"),
                ),
                React.createElement(
                  "span",
                  null,
                  rewardsUser.xpCurrent,
                  " / ",
                  rewardsUser.xpRequired,
                  " XP",
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "mt-2 h-2 rounded-full bg-white/20 overflow-hidden",
                  role: "progressbar",
                  "aria-label": tr("level_progress", "Level progress"),
                  "aria-valuenow": xpProgressPercent,
                  "aria-valuemin": 0,
                  "aria-valuemax": 100,
                },
                React.createElement("div", {
                  className:
                    "h-full bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full transition-[width] duration-700 ease-out",
                  style: { width: `${xpProgressPercent}%` },
                }),
              ),
              React.createElement(
                "p",
                { className: "text-xs text-white/60 mt-2" },
                xpRemaining === 0
                  ? tr("rewards_levelup_ready", "Level-up ready")
                  : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                      count: xpRemaining,
                    }),
              ),
            ),
            React.createElement("div", {
              className:
                "mt-2 text-[11px] text-white/70 flex items-center gap-2",
            },
              React.createElement(Share2, { className: "w-3.5 h-3.5" }),
              tr(
                "invite_friends_hint",
                "Invite friends to boost your coins.",
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2" },
            React.createElement(
              "div",
              {
                className:
                  "relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 p-3 shadow-xl border border-amber-100/60 dark:border-amber-900/30",
              },
              React.createElement(
                "div",
                { className: "flex items-center justify-between mb-1" },
                React.createElement(
                  "p",
                  { className: "text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400" },
                  tr("coin_balance", "Coin Balance"),
                ),
              ),
              React.createElement(
                "div",
                { className: "flex items-end gap-1 mt-0.5" },
                React.createElement(
                  "span",
                  { className: "coin-display coin-big-number text-3xl font-black text-amber-600 dark:text-amber-400 leading-none" },
                  displayCoins,
                ),
                React.createElement(
                  "span",
                  { className: "text-sm font-semibold text-slate-500 dark:text-slate-300 pb-0.5" },
                  " ",
                  tr("coins", "coins"),
                ),
              ),
              React.createElement(
                "div",
                { className: "mt-2 h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden" },
                React.createElement("div", {
                  className: "h-full progress-bar-gold rounded-full transition-[width] duration-700 ease-out",
                  style: { width: `${Math.min(100, Math.round((Number(displayCoins||0)/500)*100))}%` },
                }),
              ),
              React.createElement(
                "p",
                { className: "text-[10px] text-slate-400 dark:text-slate-400 mt-1" },
                tr("coin_balance_hint", "Earn coins to unlock rewards"),
              ),
              coinDelta?.amount
                ? React.createElement(
                    "p",
                    {
                      className: `mt-2 text-[10px] font-semibold ${
                        coinDelta.amount > 0
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-rose-600 dark:text-rose-300"
                      }`,
                    },
                    coinDelta.amount > 0 ? "+" : "",
                    coinDelta.amount,
                    " ",
                    tr("coins", "Coins"),
                  )
                : null,
            ),
            React.createElement(
              "div",
              {
                className:
                  "rounded-2xl bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 p-3 shadow-lg",
              },
              React.createElement(
                "p",
                { className: "text-xs font-semibold text-slate-500 dark:text-slate-300" },
                tr(
                  "referral_goal",
                  "Invite {{count}} friends -> Get {{reward}} coins",
                  { count: referralGoal, reward: referralReward },
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "mt-2 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200",
                },
                React.createElement(
                  "span",
                  null,
                  tr("progress", "Progress"),
                  ": ",
                  referralDisplay,
                  "/",
                  referralGoal,
                ),
                React.createElement(
                  "span",
                  { className: "text-emerald-600 dark:text-emerald-300" },
                  "+",
                  referralReward,
                  " ",
                  tr("coins", "coins"),
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden",
                },
              React.createElement("div", {
                className:
                  "h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-[width] duration-700 ease-out",
                style: { width: `${referralProgressPercent}%` },
              }),
              ),
              milestoneEligible &&
                React.createElement(
                  Button,
                  {
                    type: "button",
                    size: "sm",
                    className:
                      "mt-2 bg-emerald-600 hover:bg-emerald-700 text-white",
                    onClick: handleClaimMilestone,
                  },
                  tr("claim_reward", "Claim reward"),
                ),
              milestoneClaimed &&
                React.createElement(
                  Badge,
                  {
                    className:
                      "mt-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                  },
                  tr("reward_claimed", "Reward claimed"),
                ),
            ),
            React.createElement(
              "div",
              {
                className:
                  "rounded-2xl bg-white/90 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 p-3 shadow-lg",
              },
              React.createElement(
                "p",
                { className: "text-xs font-semibold text-slate-500 dark:text-slate-300 mb-2" },
                tr("quick_share", "Quick share"),
              ),
              React.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2" },
                React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: shareDisabled,
                    className: "h-9 rounded-xl text-xs",
                    onClick: shareWhatsApp,
                  },
                  "WhatsApp",
                ),
                React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: shareDisabled,
                    className: "h-9 rounded-xl text-xs",
                    onClick: shareTelegram,
                  },
                  "Telegram",
                ),
                React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: shareDisabled,
                    className: "col-span-2 h-9 rounded-xl text-xs",
                    onClick: copyReferralLink,
                  },
                  tr("copy_link", "Copy Link"),
                ),
                React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: shareDisabled,
                    className: "col-span-2 h-9 rounded-xl text-xs",
                    onClick: shareSms,
                  },
                  "SMS",
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        id: "rewards-dashboard",
        className:
          "max-w-6xl mx-auto px-4 mt-3 sm:mt-4 pb-6 relative z-10 space-y-4 scroll-mt-24",
      },
      React.createElement(
        "div",
        { className: "w-full" },
        React.createElement(
          "div",
          {
            className: "mb-2 px-1",
          },
          React.createElement(
            "p",
            {
              className:
                "text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300",
            },
            tr("jump_to_section", "Jump to section"),
          ),
        ),
        React.createElement(
          "div",
          {
            role: "tablist",
            "aria-label": tr("rewards_tabs", "Rewards tabs"),
            className:
              "rewards-tab-bar sticky top-3 z-30 w-full flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white/98 dark:bg-gray-800/98 p-1.5 shadow-lg mb-4 scrollbar-hide backdrop-blur-xl",
          },
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "overview",
              onClick: () => setActiveTab("overview"),
              className: tabButtonClass("overview"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Sparkles, { className: "w-4 h-4" }),
              tr("rewards_dashboard", "Rewards Dashboard"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "earn",
              onClick: () => setActiveTab("earn"),
              className: tabButtonClass("earn"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Zap, { className: "w-4 h-4" }),
              tr("earn_coins", "Earn Coins"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "earn",
              onClick: () => setActiveTab("earn"),
              className: tabButtonClass("earn"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Target, { className: "w-4 h-4" }),
              tr("todays_challenges", "Today's Challenges"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "overview",
              onClick: () => setActiveTab("overview"),
              className: tabButtonClass("overview"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(TrendingUp, { className: "w-4 h-4" }),
              tr("achievements", "Achievements"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "milestones",
              onClick: () => setActiveTab("milestones"),
              className: tabButtonClass("milestones"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Star, { className: "w-4 h-4" }),
              tr("milestones", "Milestones"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "redeem",
              onClick: () => setActiveTab("redeem"),
              className: tabButtonClass("redeem"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Gift, { className: "w-4 h-4" }),
              tr("redeem_rewards", "Redeem Rewards"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "activity",
              onClick: () => setActiveTab("activity"),
              className: tabButtonClass("activity"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Calendar, { className: "w-4 h-4" }),
              tr("activity_history", "Activity History"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "referrals",
              onClick: () => setActiveTab("referrals"),
              className: tabButtonClass("referrals"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Users, { className: "w-4 h-4" }),
              tr("referrals", "Referrals"),
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": activeTab === "leaderboard",
              onClick: () => setActiveTab("leaderboard"),
              className: tabButtonClass("leaderboard"),
            },
            React.createElement(
              "span",
              { className: "inline-flex items-center gap-1.5" },
              React.createElement(Trophy, { className: "w-4 h-4" }),
              tr("leaderboard", "Leaderboard"),
            ),
          ),
        ),
        activeTab === "overview" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                id: "rewards-summary",
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2 text-lg sm:text-xl" },
                  React.createElement(Sparkles, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("my_rewards", "My rewards"),
                ),
              ),
              React.createElement(
                CardContent,
                { className: "space-y-4" },
                React.createElement(
                  "div",
                  {
                    className:
                      "flex flex-col md:flex-row md:items-center md:justify-between gap-4",
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400",
                      },
                      tr("coin_balance", "Coin balance"),
                    ),
                    React.createElement(
                      "div",
                      { className: "flex items-end gap-2 mt-1" },
                      React.createElement(
                        "span",
                        {
                          className: "coin-display coin-big-number text-5xl sm:text-6xl font-black leading-none text-amber-600 dark:text-amber-400",
                        },
                        displayCoins,
                      ),
                      React.createElement(
                        "span",
                        { className: "text-lg font-semibold text-slate-400 pb-1" },
                        tr("coins", "coins"),
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "flex flex-wrap items-center gap-2" },
                    React.createElement(
                      Badge,
                      {
                        className:
                          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                      },
                      tr("level", "Level"),
                      " ",
                      rewardsUser?.level ?? "-",
                    ),
                    React.createElement(
                      Badge,
                      {
                        className:
                          "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
                      },
                      rewardsUser?.rank || tr("unknown", "Unknown"),
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20 p-4",
                  },
                  React.createElement(
                    "p",
                    { className: "text-xs font-semibold text-indigo-700 dark:text-indigo-200" },
                    tr("next_reward", "Next reward"),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-sm font-semibold text-indigo-900 dark:text-indigo-100" },
                    nextRewardTarget,
                    " ",
                    tr("coins", "coins"),
                    " -> ",
                    nextRewardLabel,
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mt-3 h-2.5 rounded-full bg-indigo-100/90 dark:bg-slate-800/70 overflow-hidden",
                    },
                    React.createElement("div", {
                      className:
                        "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out",
                      style: { width: nextRewardProgress + "%" },
                    }),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mt-2 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-200",
                    },
                    React.createElement(
                      "span",
                      null,
                      nextRewardRemaining > 0
                        ? tr("coins_to_unlock", "{{count}} coins to unlock", {
                            count: nextRewardRemaining,
                          })
                        : tr("ready_to_redeem", "Ready to redeem"),
                    ),
                    React.createElement(
                      "span",
                      { className: "font-semibold" },
                      nextRewardProgress,
                      "%",
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex flex-wrap gap-2" },
                  React.createElement(
                    Button,
                    {
                      type: "button",
                      className: "bg-emerald-600 hover:bg-emerald-700 text-white",
                      onClick: shareReferral,
                    },
                    React.createElement(Share2, { className: "w-4 h-4 mr-2" }),
                    tr("invite_friends", "Invite friends"),
                  ),
                  React.createElement(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      className:
                        "border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200",
                      onClick: () => setActiveTab("redeem"),
                    },
                    tr("redeem_coins", "Redeem coins"),
                  ),
                ),
              ),
            ),
          ),
        ),
          activeTab === "overview" &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
          {
            className:
              "bg-slate-50/80 dark:bg-gray-800/80 border-0 shadow-xl rounded-2xl",
          },
          React.createElement(
            CardHeader,
            null,
            React.createElement(
              CardTitle,
              { className: "flex items-center gap-2" },
              React.createElement(TrendingUp, { className: "w-5 h-5 text-indigo-600" }),
              " ",
              tr("rewards_summary", "Rewards summary"),
            ),
          ),
          React.createElement(
            CardContent,
            { className: "space-y-4" },
            React.createElement(
              "div",
              { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
              primaryStats.map((t) => {
                const ringStyle = {
                  background:
                    "conic-gradient(" +
                    t.ringColor +
                    " " +
                    t.progress +
                    "%, rgba(226,232,240,0.9) " +
                    t.progress +
                    "% 100%)",
                };
                return React.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "rewards-stat-card rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-md bg-white dark:bg-slate-900/50",
                    style: {
                      "--card-accent": `linear-gradient(90deg, ${t.ringColor}, ${t.ringColor}99)`,
                      background: `linear-gradient(135deg, ${t.ringColor}12, #ffffff 55%)`,
                    },
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between gap-3" },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "p",
                        { className: "text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400" },
                        t.label,
                      ),
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-3xl font-black coin-big-number text-slate-900 dark:text-white mt-0.5",
                        },
                        t.value,
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        className: "h-14 w-14 rounded-full p-[3px] shadow-md",
                        style: ringStyle,
                      },
                      React.createElement(
                        "div",
                        {
                          className:
                            "h-full w-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center",
                        },
                        renderIcon(t.icon, {
                          className: "w-5 h-5 text-slate-700 dark:text-slate-200",
                        }),
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden" },
                    React.createElement("div", {
                      className: "h-full progress-bar-animated rounded-full transition-[width] duration-1000 ease-out",
                      style: { width: `${t.progress}%` },
                    }),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-[10px] text-slate-400 dark:text-slate-400 mt-1.5" },
                    tr("progress_pct", "{{count}}% complete", {
                      count: t.progress,
                    }),
                  ),
                );
              }),
            ),
            secondaryStats.length
              ? React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-cols-1 sm:grid-cols-2 gap-3 " +
                      (showMoreStats ? "" : "hidden"),
                  },
                  secondaryStats.map((t) =>
                    React.createElement(
                      "div",
                      {
                        key: t.key,
                        className:
                          "rounded-xl bg-slate-50 dark:bg-slate-900/30 p-3 text-center",
                      },
                      React.createElement(
                        "div",
                        {
                          className:
                            "mx-auto mb-2 h-9 w-9 rounded-lg bg-gradient-to-br " +
                            t.accent +
                            " flex items-center justify-center",
                        },
                        renderIcon(t.icon, { className: "w-4 h-4 text-white" }),
                      ),
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-lg font-bold text-slate-800 dark:text-white",
                        },
                        t.value,
                      ),
                      React.createElement(
                        "p",
                        { className: "text-xs text-slate-500 dark:text-slate-300" },
                        t.label,
                      ),
                    ),
                  ),
                )
              : null,
            secondaryStats.length
              ? React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    className:
                      "w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200",
                    onClick: () => setShowMoreStats((t) => !t),
                  },
                  showMoreStats
                    ? tr("show_less_stats", "Show fewer stats")
                    : tr("show_more_stats", "Show more stats"),
                )
              : null,
          ),
        ),
        ),
        ),
        activeTab === "overview" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                id: "rewards-progress",
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Target, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("progress_overview", "Achievements"),
                ),
              ),
              React.createElement(
                CardContent,
                { className: "space-y-4" },
                React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30",
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-2" },
                    React.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                      tr("xp_progress", "XP Progress"),
                    ),
                    React.createElement(
                      "span",
                      { className: "text-sm text-slate-600 dark:text-slate-300" },
                      rewardsUser.xpCurrent,
                      " / ",
                      rewardsUser.xpRequired,
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner",
                    },
                    React.createElement("div", {
                      className:
                        "h-full progress-bar-gold rounded-full transition-[width] duration-700 ease-out",
                      style: { width: `${xpProgressPercent}%` },
                    }),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-xs text-slate-500 dark:text-slate-300 mt-2" },
                    xpRemaining === 0
                      ? tr("rewards_levelup_ready", "Level-up ready")
                      : tr("rewards_xp_remaining", `${xpRemaining} XP remaining`, {
                          count: xpRemaining,
                        }),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-xs text-slate-500 dark:text-slate-300" },
                    tr(
                      "xp_explainer",
                      "Earn XP by completing challenges, sales, and referrals.",
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-3 flex items-center justify-between" },
                    React.createElement(
                      "span",
                      { className: "text-xs text-slate-500 dark:text-slate-300" },
                      tr("streak_progress", "Streak progress"),
                    ),
                    React.createElement(
                      "span",
                      { className: "text-xs text-slate-600 dark:text-slate-300 font-semibold" },
                      maxStreak,
                      " / ",
                      nextStreakTarget,
                      " ",
                      tr("days", "days"),
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden",
                    },
                    React.createElement("div", {
                      className:
                        "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out",
                      style: { width: `${streakProgress}%` },
                    }),
                  ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/60 dark:bg-slate-900/10",
                    id: "rewards-benefits-overview",
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-1" },
                    React.createElement(
                      "span",
                      { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                      tr("milestones", "Milestones"),
                    ),
                    React.createElement(
                      "span",
                      { className: "text-sm text-slate-600 dark:text-slate-300 font-semibold" },
                      milestoneUnlockedCount,
                      "/",
                      milestones.length,
                    ),
                  ),
                  nextMilestone
                    ? React.createElement(
                        "p",
                        { className: "text-xs text-slate-500 dark:text-slate-300" },
                        tr("next_milestone", "Next milestone"),
                        ": ",
                        nextMilestone.title,
                      )
                    : React.createElement(
                        "p",
                        { className: "text-xs text-slate-500 dark:text-slate-300" },
                        tr("all_milestones_unlocked", "All milestones unlocked"),
                      ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30",
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between mb-2" },
                    React.createElement(
                      "span",
                      {
                        className:
                          "text-sm font-semibold text-slate-700 dark:text-slate-200",
                      },
                      tr("progress_tracker", "Progress Tracker"),
                    ),
                    React.createElement(
                      Badge,
                      {
                        className:
                          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                      },
                      `${onboardingSteps.filter((t) => t.done).length}/${onboardingSteps.length}`,
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "space-y-2" },
                    onboardingSteps.map((t) =>
                      React.createElement(
                        "div",
                        { key: t.key, className: "flex items-start gap-2" },
                        t.done
                          ? React.createElement(CheckCircle2, {
                              className: "w-4 h-4 text-emerald-600 mt-0.5",
                            })
                          : React.createElement(Circle, {
                              className: "w-4 h-4 text-slate-400 mt-0.5",
                            }),
                        React.createElement(
                          "div",
                          null,
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-sm font-medium text-slate-700 dark:text-slate-200",
                            },
                            t.label,
                          ),
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-xs text-slate-500 dark:text-slate-300",
                            },
                            t.hint,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                React.createElement(
                  Button,
                  {
                    type: "button",
                    className:
                      "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold",
                    onClick: () => {
                      if (nextAction === "earn_xp") {
                        navigate("/all-posts");
                        return;
                      }
                      if (nextAction === "qualify_referral") {
                        shareReferral();
                        return;
                      }
                      navigate("/my-home");
                    },
                  },
                  nextAction === "earn_xp"
                    ? tr("earn_xp_through_activity", "Earn XP through activity")
                    : nextAction === "qualify_referral"
                      ? tr("share_referral_link_now", "Share referral link now")
                      : tr("review_account_activity", "Review account activity"),
                  React.createElement(ArrowRight, { className: "w-4 h-4 ml-2" }),
                ),
                React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    className: "w-full",
                    onClick: () => setActiveTab("earn"),
                  },
                  tr("see_earn_plan", "See earn plan"),
                ),
              ),
            ),
          ),
        ),
        activeTab === "earn" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                id: "rewards-earn",
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Target, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("earn_more_coins", "Earn More Coins"),
                ),
              ),
              React.createElement(
                CardContent,
                { className: "space-y-3" },
                earnPlaybook.map((t) => {
                  const progress = t.target
                    ? Math.min(100, Math.round((t.current / t.target) * 100))
                    : 0;
                  return React.createElement(
                    "div",
                    {
                      key: t.key,
                      className:
                        "earn-playbook-card rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 p-4 shadow-sm",
                    },
                    React.createElement(
                      "div",
                      {
                        className:
                          "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
                      },
                      React.createElement(
                        "div",
                        { className: "flex items-center gap-3" },
                        React.createElement(
                          "div",
                          {
                            className:
                              "h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md",
                          },
                          renderIcon(t.icon, { className: "w-5 h-5" }),
                        ),
                        React.createElement(
                          "div",
                          null,
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-sm font-semibold text-slate-800 dark:text-white",
                            },
                            t.label,
                          ),
                          React.createElement(
                            "p",
                            { className: "text-xs text-slate-500 dark:text-slate-300" },
                            "+",
                            t.reward,
                            " ",
                            tr("coins", "coins"),
                          ),
                        ),
                      ),
                      React.createElement(
                        Button,
                        {
                          type: "button",
                          size: "sm",
                          className:
                            "bg-indigo-600 hover:bg-indigo-700 text-white",
                          onClick: t.onClick,
                        },
                        t.cta,
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "mt-3" },
                      React.createElement(
                        "div",
                        {
                          className:
                            "flex items-center justify-between text-xs text-slate-500 dark:text-slate-300",
                        },
                        React.createElement(
                          "span",
                          null,
                          tr("progress", "Progress"),
                          ": ",
                          t.current,
                          "/",
                          t.target,
                        ),
                        React.createElement("span", null, progress, "%"),
                      ),
                      React.createElement(
                        "div",
                        {
                          className:
                            "mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700/70 overflow-hidden",
                        },
                        React.createElement("div", {
                          className:
                            "h-full progress-bar-animated rounded-full transition-[width] duration-700 ease-out",
                          style: { width: progress + "%" },
                        }),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
        activeTab === "referrals" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl hidden",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Share2, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("your_referral_link", "Your referral link"),
                ),
              ),
              React.createElement(
                CardContent,
                { className: "space-y-4" },
                React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3",
                  },
                  React.createElement(
                    "p",
                    { className: "text-xs font-semibold text-slate-500 dark:text-slate-300" },
                    tr("referral_link", "Referral link"),
                  ),
                  React.createElement(
                    "p",
                    {
                      className:
                        "mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 break-all",
                    },
                    referralShareDisplay || tr("not_available", "Not available"),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-2 flex flex-wrap items-center gap-2" },
                    React.createElement(
                      Badge,
                      {
                        className:
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                      },
                      tr(
                        "referral_milestone_badge",
                        "Milestone: {{count}} invites -> {{reward}} coins",
                        { count: referralGoal, reward: referralReward },
                      ),
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex flex-wrap gap-2" },
                  React.createElement(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      disabled: shareDisabled,
                      className:
                        "border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200",
                      onClick: copyReferralLink,
                    },
                    React.createElement(CopyIcon, { className: "w-4 h-4 mr-1" }),
                    tr("copy", "Copy"),
                  ),
                  React.createElement(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      disabled: shareDisabled,
                      className:
                        "border-emerald-200 text-emerald-700 dark:border-emerald-600/60 dark:text-emerald-200",
                      onClick: shareWhatsApp,
                    },
                    "WhatsApp",
                  ),
                  React.createElement(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      disabled: shareDisabled,
                      className:
                        "border-sky-200 text-sky-700 dark:border-sky-600/60 dark:text-sky-200",
                      onClick: shareTelegram,
                    },
                    "Telegram",
                  ),
                  React.createElement(
                    Button,
                    {
                      variant: "outline",
                      size: "sm",
                      disabled: shareDisabled,
                      className:
                        "border-indigo-200 text-indigo-700 dark:border-indigo-600/60 dark:text-indigo-200",
                      onClick: shareSms,
                    },
                    "SMS",
                  ),
                ),
                rewardsUser?.dailySecretCode &&
                  React.createElement(
                    "div",
                    {
                      className:
                        "rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3",
                    },
                    React.createElement(
                      "div",
                      { className: "flex items-center justify-between" },
                      React.createElement(
                        "p",
                        { className: "text-xs font-semibold text-amber-700 dark:text-amber-200" },
                        tr("daily_secret_code", "Daily secret code"),
                      ),
                      React.createElement(
                        Button,
                        {
                          variant: "outline",
                          size: "sm",
                          className:
                            "text-amber-700 border-amber-200 bg-white/90 hover:bg-white rounded-full px-3 dark:text-amber-200 dark:border-amber-700/60 dark:bg-amber-900/30 dark:hover:bg-amber-900/40",
                          onClick: () =>
                            copyToClipboard(rewardsUser.dailySecretCode, tr("secret_code", "Secret code")),
                        },
                        React.createElement(CopyIcon, { className: "w-4 h-4 mr-1" }),
                        tr("copy", "Copy"),
                      ),
                    ),
                    React.createElement(
                      "p",
                      {
                        className:
                          "referral-code-box mt-2 text-xl font-black text-amber-700 dark:text-amber-200",
                      },
                      rewardsUser.dailySecretCode,
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "mt-1 flex items-center gap-2 text-amber-600/90 dark:text-amber-200/80",
                      },
                      React.createElement(Calendar, { className: "w-4 h-4" }),
                      React.createElement(
                        "span",
                        { className: "text-xs" },
                        secretCountdown
                          ? tr("expires_in", "Expires in") +
                              " " +
                              secretCountdown
                          : tr("expires_in_12h_30m", "Expires soon"),
                      ),
                    ),
                  ),
              ),
            ),
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Users, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("referral_tree", "Referral tree"),
                ),
              ),
              React.createElement(
                CardContent,
                { className: "space-y-4" },
                directReferrals.length === 0 && indirectReferrals.length === 0
                  ? React.createElement(
                      "div",
                      { className: "text-center py-6" },
                      React.createElement(
                        "p",
                        { className: "text-sm text-slate-500 dark:text-slate-300 mb-4" },
                        tr("no_referrals_yet", "No referrals yet"),
                      ),
                      React.createElement(
                        Button,
                        {
                          type: "button",
                          className:
                            "bg-indigo-600 hover:bg-indigo-700 text-white",
                          onClick: shareReferral,
                        },
                        React.createElement(Share2, { className: "w-4 h-4 mr-2" }),
                        tr("invite_friends", "Invite friends"),
                      ),
                    )
                  : React.createElement(
                      "div",
                      { className: "space-y-4" },
                      React.createElement(
                        "p",
                        { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                        tr("you_referrals", "You -> {{count}} referrals", {
                          count: directReferrals.length,
                        }),
                      ),
                      React.createElement(
                        "div",
                        { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                        React.createElement(
                          "div",
                          {
                            className:
                              "rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/20 p-3",
                          },
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-xs font-semibold text-emerald-700 dark:text-emerald-200 mb-2",
                            },
                            tr("level_1", "Level 1"),
                          ),
                          directReferrals.length
                            ? React.createElement(
                                "div",
                                { className: "flex flex-wrap gap-2" },
                                directReferrals.map((t, s) =>
                                  React.createElement(
                                    Badge,
                                    {
                                      key: t.id || s,
                                      className:
                                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                                    },
                                    t.name || tr("user", "User"),
                                  ),
                                ),
                              )
                            : React.createElement(
                                "p",
                                { className: "text-xs text-emerald-700 dark:text-emerald-200" },
                                tr("no_referrals_yet", "No referrals yet"),
                              ),
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/20 p-3",
                          },
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-xs font-semibold text-blue-700 dark:text-blue-200 mb-2",
                            },
                            tr("level_2", "Level 2"),
                          ),
                          indirectReferrals.length
                            ? React.createElement(
                                "div",
                                { className: "flex flex-wrap gap-2" },
                                indirectReferrals.map((t, s) =>
                                  React.createElement(
                                    Badge,
                                    {
                                      key: t.id || s,
                                      className:
                                        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
                                    },
                                    t.name || tr("user", "User"),
                                  ),
                                ),
                              )
                            : React.createElement(
                                "p",
                                { className: "text-xs text-blue-700 dark:text-blue-200" },
                                tr(
                                  "no_indirect_referrals",
                                  "No indirect referrals",
                                ),
                              ),
                        ),
                      ),
                    ),
              ),
            ),
          ),
        ),
        activeTab === "earn" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl min-h-[260px] transition-none transform-none",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Calendar, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("daily_checkin_reward", "Daily check-in reward"),
                ),
              ),
          React.createElement(
            CardContent,
            { className: "space-y-4" },
            React.createElement(
              "p",
              { className: "text-sm text-slate-600 dark:text-slate-300" },
              tr(
                "daily_checkin_desc",
                "Check in daily to stack rewards and streak bonuses.",
              ),
            ),
            engagementLoading &&
              React.createElement(
                "p",
                { className: "text-xs text-slate-400" },
                tr("loading", "Loading..."),
              ),
            engagementErrorMessage &&
              React.createElement(
                "p",
                { className: "text-xs text-rose-500" },
                engagementErrorMessage,
              ),
            dailyCheckInStatus?.nextReward &&
              !hasCheckedInToday &&
              React.createElement(
                "p",
                { className: "text-xs text-emerald-600" },
                tr("next_reward", "Next reward"),
                ": +",
                dailyCheckInStatus.nextReward,
                " ",
                tr("coins", "coins"),
              ),
            React.createElement(
              "div",
              { className: "grid grid-cols-7 gap-2" },
              dailyCheckInRewards.map((t) => {
                const isCompleted = currentCheckInDay > t.day;
                const isToday = currentCheckInDay === t.day;
                const isFuture = currentCheckInDay < t.day;
                const dayLabels = ["M","T","W","T","F","S","S"];
                return React.createElement(
                  "div",
                  {
                    key: t.day,
                    className:
                      `checkin-day rounded-xl border-2 p-2 text-center flex flex-col items-center gap-0.5 ` +
                      (isCompleted
                        ? "border-emerald-400 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-900/30 dark:to-emerald-900/20 shadow-sm"
                        : isToday
                        ? "today border-indigo-400 bg-gradient-to-b from-indigo-50 to-indigo-100 dark:border-indigo-600 dark:from-indigo-900/30 dark:to-indigo-900/20 shadow-md"
                        : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900/30"),
                    "data-coins": `+${t.coins}`,
                  },
                  React.createElement(
                    "span",
                    { className: `text-[9px] font-bold uppercase ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : isToday ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"}` },
                    tr("day", "D") + t.day,
                  ),
                  isCompleted
                    ? React.createElement("span", { className: "text-lg leading-none" }, "✅")
                    : isToday
                    ? React.createElement("span", { className: "text-lg leading-none streak-flame" }, "🔥")
                    : React.createElement("span", { className: "text-lg leading-none opacity-40" }, "🪙"),
                  React.createElement(
                    "p",
                    { className: `text-[9px] font-black ${isCompleted ? "text-emerald-700 dark:text-emerald-300" : isToday ? "text-indigo-700 dark:text-indigo-300" : "text-slate-400"}` },
                    "+", t.coins,
                  ),
                );
              }),
            ),
            React.createElement(
              "div",
              { className: "flex items-center justify-between text-xs text-slate-500 dark:text-slate-300" },
              React.createElement(
                "span",
                null,
                tr("current_day", "Current day"),
                ": ",
                currentCheckInDay,
                "/7",
              ),
              React.createElement(
                "span",
                null,
                Math.min(100, Math.round((currentCheckInDay / 7) * 100)),
                "%",
              ),
            ),
            React.createElement(
              "div",
              {
                className:
                  "h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-inner",
              },
              React.createElement("div", {
                className:
                  "h-full progress-bar-green rounded-full transition-[width] duration-700 ease-out",
                style: {
                  width:
                    Math.min(100, Math.round((currentCheckInDay / 7) * 100)) +
                    "%",
                },
              }),
            ),
            React.createElement(
              Button,
              {
                type: "button",
                disabled: hasCheckedInToday || dailyCheckInLoading,
                className:
                  hasCheckedInToday || dailyCheckInLoading
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white",
                onClick: handleDailyCheckIn,
              },
              hasCheckedInToday
                ? tr("checked_in", "Checked in today")
                : dailyCheckInLoading
                  ? tr("claiming", "Claiming...")
                  : tr("claim_today_reward", "Claim today reward"),
            ),
          ),
        ),
      ),
    activeTab === "milestones" && React.createElement(React.Fragment, null,
      React.createElement(
        "div",
        { className: "grid grid-cols-1 gap-4" },
        React.createElement(
          Card,
          {
            id: "rewards-benefits",
            className:
              "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
          },
          React.createElement(
            CardHeader,
            null,
            React.createElement(
              CardTitle,
              { className: "flex items-center gap-2" },
              React.createElement(Crown, { className: "w-5 h-5 text-indigo-600" }),
              " ",
              tr("level_benefits", "Level benefits"),
            ),
          ),
          React.createElement(
            CardContent,
            { className: "space-y-4" },
            React.createElement(
              "div",
              { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
              levelBenefits.map((t) => {
                const isCurrent = t.level === currentLevel;
                return React.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "rewards-stat-card rounded-2xl border-2 p-4 transition-all " +
                      (isCurrent
                        ? "border-indigo-400 bg-gradient-to-br from-indigo-50 to-blue-50 dark:border-indigo-700 dark:from-indigo-900/30 dark:to-blue-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
                        : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-900/40"),
                      style: { "--card-accent": isCurrent ? "linear-gradient(90deg, #6366f1, #3b82f6)" : "linear-gradient(90deg, #cbd5e1, #e2e8f0)" },
                  },
                  React.createElement(
                    "p",
                    { className: "text-sm font-semibold text-slate-800 dark:text-slate-100" },
                    t.title,
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-2 space-y-1" },
                    t.perks.map((perk, idx) =>
                      React.createElement(
                        "div",
                        {
                          key: idx,
                          className:
                            "flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300",
                        },
                        React.createElement(CheckCircle2, {
                          className: "w-3 h-3 text-emerald-500",
                        }),
                        perk,
                      ),
                    ),
                  ),
                  isCurrent
                    ? React.createElement(
                        Badge,
                        {
                          className:
                            "mt-3 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                        },
                        tr("current_level", "Current level"),
                      )
                    : null,
                );
              }),
            ),
            React.createElement(
              Button,
              {
                type: "button",
                variant: "outline",
                className:
                  "w-full border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200",
                onClick: () => navigate("/tier-selection"),
              },
              tr("see_all_levels", "See all levels"),
            ),
          ),
        ),
        ),
        ),
        activeTab === "redeem" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                id: "rewards-redeem",
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Star, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("redeem_rewards", "Redeem coins"),
                ),
              ),
          React.createElement(
            CardContent,
            { className: "space-y-3" },
            React.createElement(
              "p",
              { className: "text-sm text-slate-600 dark:text-slate-300" },
              tr(
                "redeem_desc",
                "Use coins to unlock boosts, badges, and top placement for your listings.",
              ),
            ),
            React.createElement(
              "div",
              { className: "grid grid-cols-1 gap-4 md:grid-cols-3" },
              redeemOptions.map((t) => {
                const affordable = availableCoins >= t.cost;
                const coinsNeeded = Math.max(0, t.cost - availableCoins);
                const progress = Math.min(
                  100,
                  Math.round((availableCoins / t.cost) * 100),
                );
                const progressClass = affordable
                  ? "from-emerald-500 to-green-500"
                  : progress >= 60
                    ? "from-amber-400 to-yellow-500"
                    : "from-rose-400 to-orange-500";
                return React.createElement(
                  "div",
                  {
                    key: t.key,
                    className: `rounded-2xl border p-4 shadow-sm ${
                      affordable
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-900/20"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
                    }`,
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-start justify-between gap-3" },
                    React.createElement(
                      "div",
                      { className: "flex items-start gap-3" },
                      React.createElement(
                        "div",
                        {
                          className: `h-10 w-10 rounded-xl bg-gradient-to-br ${t.accent} flex items-center justify-center text-white shadow-sm`,
                        },
                        renderIcon(t.icon, { className: "w-5 h-5" }),
                      ),
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "p",
                          {
                            className:
                              "text-sm font-semibold text-slate-800 dark:text-slate-100",
                          },
                          t.title,
                        ),
                        React.createElement(
                          "p",
                          {
                            className:
                              "text-xs text-slate-500 dark:text-slate-300",
                          },
                          t.desc,
                        ),
                      ),
                    ),
                    React.createElement(
                      Badge,
                      {
                        className:
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
                      },
                      t.cost,
                      " ",
                      tFunc("coins"),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-3" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden",
                      },
                      React.createElement("div", {
                        className: `h-full bg-gradient-to-r ${progressClass} rounded-full transition-[width] duration-700 ease-out`,
                        style: { width: `${progress}%` },
                      }),
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "mt-2 flex items-center justify-between text-xs",
                      },
                      React.createElement(
                        "span",
                        {
                          className: affordable
                            ? "text-emerald-600"
                            : "text-slate-500 dark:text-slate-300",
                        },
                        affordable
                          ? tr("ready_to_redeem", "Ready to redeem")
                          : tr("need_more_coins", "Need {{count}} more coins", {
                              count: coinsNeeded,
                            }),
                      ),
                      React.createElement(
                        "span",
                        { className: "text-slate-400 dark:text-slate-500 dark:text-slate-300" },
                        `${progress}%`,
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-3 flex items-center gap-2" },
                    React.createElement(
                      Button,
                      {
                        type: "button",
                        disabled: !affordable || redeemProcessing === t.key,
                        className: affordable
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed",
                        onClick: affordable
                          ? () => openRedeemDialog(t)
                          : () => setActiveTab("earn"),
                      },
                      affordable
                        ? redeemProcessing === t.key
                          ? tr("redeeming", "Redeeming...")
                          : t.cta
                        : tr("keep_earning", "Keep earning"),
                    ),
                    !affordable &&
                      React.createElement(
                        Button,
                        {
                          type: "button",
                          variant: "ghost",
                          className: "text-xs",
                          onClick: () => setActiveTab("earn"),
                        },
                        tr("earn_more", "Earn more"),
                      ),
                  ),
                );
              }),
            ),
            React.createElement(
              "div",
              { className: "flex flex-wrap gap-2" },
              React.createElement(
                Link,
                {
                  to: "/tier-selection",
                  className:
                    "inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700",
                },
                tr("redeem_now", "Redeem now"),
              ),
              React.createElement(
                Link,
                {
                  to: "/tier-selection",
                  className:
                    "inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60",
                },
                tr("view_benefits", "View benefits"),
              ),
            ),
          ),
        ),
        ),
        ),
        activeTab === "leaderboard" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Trophy, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("top_referrers_week", "Top referrers this week"),
                ),
              ),
          React.createElement(
            CardContent,
            { className: "space-y-3" },
            currentReferralRank
              ? React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-900/40 dark:bg-indigo-900/20",
                  },
                  React.createElement(
                    "p",
                    {
                      className:
                        "text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-200",
                    },
                    tr("your_position", "Your position"),
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-2 flex items-center justify-between gap-3" },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-2xl font-black text-slate-900 dark:text-slate-50",
                        },
                        "#",
                        currentReferralRank.rank || tr("unknown", "Unknown"),
                      ),
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-xs text-slate-600 dark:text-slate-300",
                        },
                        tr("your_referral_rank_summary", "{{count}} referrals this period", {
                          count:
                            currentReferralRank.referral_count ??
                            currentReferralRank.referralCount ??
                            0,
                        }),
                      ),
                    ),
                    React.createElement(
                      Badge,
                      {
                        className:
                          "bg-white text-indigo-700 border border-indigo-200 dark:bg-slate-900 dark:text-indigo-200 dark:border-indigo-800",
                      },
                      tr("weekly_snapshot", "Weekly snapshot"),
                    ),
                  ),
                )
              : React.createElement(
                  "div",
                  {
                    className:
                      "rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300",
                  },
                  tr(
                    "share_referral_to_start",
                    "Share referral to start climbing this leaderboard.",
                  ),
                ),
            referralLeaderboardLoading
              ? React.createElement(
                  "p",
                  { className: "text-sm text-slate-500 dark:text-slate-300" },
                  tr("loading", "Loading..."),
                )
              : referralLeaderboard.length
                ? React.createElement(
                    "div",
                    { className: "space-y-2" },
                    referralLeaderboard.slice(0, 3).map((t, s) =>
                      React.createElement(
                        "div",
                        {
                          key: t.user_id || t.id || s,
                          className:
                            "flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                        },
                        React.createElement(
                          "div",
                          { className: "flex items-center gap-2" },
                          React.createElement(
                            Badge,
                            { className: "bg-indigo-50 text-indigo-600" },
                            "#" + (s + 1),
                          ),
                          React.createElement(
                            "span",
                            {
                              className:
                                "text-sm font-semibold text-slate-800 dark:text-slate-100",
                            },
                            t.full_name || t.username || tr("user", "User"),
                          ),
                        ),
                        React.createElement(
                          "div",
                          { className: "text-sm text-slate-600 dark:text-slate-300" },
                          t.referral_count ?? t.referralCount ?? 0,
                          " ",
                          tr("referrals", "referrals"),
                        ),
                      ),
                    ),
                  )
                : React.createElement(
                    "p",
                    { className: "text-sm text-slate-500 dark:text-slate-300" },
                    tr("no_leaderboard_data", "No leaderboard data yet."),
                  ),
            React.createElement(
              "p",
              { className: "text-xs text-slate-500 dark:text-slate-300" },
              tr("leaderboard_period", "Updated weekly."),
            ),
          ),
        ),
        ),
        ),
        activeTab === "earn" && React.createElement(React.Fragment, null,
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Sparkles, { className: "w-5 h-5 text-indigo-600" }),
                  " ",
                  tr("killer_features", "Killer features"),
                ),
              ),
          React.createElement(
            CardContent,
            { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
            React.createElement(
              "div",
              {
                className:
                  "rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20 p-4",
              },
              React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 text-indigo-700 dark:text-indigo-200 font-semibold",
                },
                React.createElement(Sparkles, { className: "w-4 h-4" }),
                tr("spin_wheel", "Spin wheel"),
              ),
              React.createElement(
                "p",
                { className: "text-xs text-indigo-700 dark:text-indigo-200 mt-1" },
                spinStatus?.hasSpunToday
                  ? tr("spin_already", "You already spun today.")
                  : tr("spin_wheel_desc", "Spin daily and win coins."),
              ),
              React.createElement(
                Button,
                {
                  type: "button",
                  size: "sm",
                  disabled: spinStatus?.hasSpunToday || spinLoading,
                  className:
                    spinStatus?.hasSpunToday || spinLoading
                      ? "mt-3 bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                      : "mt-3 bg-indigo-600 hover:bg-indigo-700 text-white",
                  onClick: handleSpinWheel,
                },
                spinStatus?.hasSpunToday
                  ? tr("spin_done", "Spun today")
                  : spinLoading
                    ? tr("spinning", "Spinning...")
                    : tr("spin_now", "Spin now"),
              ),
            ),
            React.createElement(
              "div",
              {
                className:
                  "rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/20 p-4",
              },
              React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 text-amber-700 dark:text-amber-200 font-semibold",
                },
                React.createElement(Star, { className: "w-4 h-4" }),
                tr("scratch_card", "Scratch card"),
              ),
              React.createElement(
                "p",
                { className: "text-xs text-amber-700 dark:text-amber-200 mt-1" },
                tr(
                  "scratch_card_desc",
                  "Scratch after a referral to win 10-100 coins.",
                ),
              ),
              scratchStatus &&
                React.createElement(
                  "p",
                  { className: "text-[11px] text-amber-600 dark:text-amber-200 mt-1" },
                  scratchStatus.available
                    ? tr("scratch_available", "Available: {{count}}", {
                        count: scratchStatus.available,
                      })
                    : tr("scratch_none", "No scratch cards available"),
                ),
              React.createElement(
                Button,
                {
                  type: "button",
                  size: "sm",
                  disabled:
                    scratchLoading ||
                    (scratchStatus && Number(scratchStatus.available || 0) === 0),
                  className:
                    scratchLoading ||
                    (scratchStatus && Number(scratchStatus.available || 0) === 0)
                      ? "mt-3 bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300"
                      : "mt-3 bg-amber-600 hover:bg-amber-700 text-white",
                  onClick: handleScratchCard,
                },
                scratchLoading
                  ? tr("scratching", "Scratching...")
                  : tr("scratch_now", "Scratch now"),
              ),
            ),
          ),
        ),
        ),
      activeTab === "earn" && React.createElement(React.Fragment, null,
        React.createElement(
          "div",
          { className: "grid grid-cols-1 gap-4" },
          React.createElement(
            Card,
            {
              id: "rewards-challenges",
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Target, { className: "w-5 h-5 text-indigo-600" }),
                " ",
                tFunc("daily_challenges"),
              ),
            ),
            React.createElement(
              CardContent,
              { className: "space-y-4" },
              visibleChallenges.map((t, s) =>
                React.createElement(
                  "div",
                  {
                    key: s,
                    className: `flex items-center justify-between p-4 rounded-xl ${t.completed ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-slate-800/60"}`,
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    React.createElement(
                      "div",
                      {
                        className: `w-8 h-8 rounded-full flex items-center justify-center ${t.completed ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`,
                      },
                      t.completed
                        ? React.createElement(
                            "span",
                            { className: "text-white" },
                            "\u2713",
                          )
                        : React.createElement(
                            "span",
                            { className: "text-gray-500 dark:text-slate-300" },
                            s + 1,
                          ),
                    ),
                    React.createElement(
                      "span",
                      {
                        className: t.completed
                          ? "line-through text-gray-400 dark:text-slate-300"
                          : "text-slate-700 dark:text-slate-100 font-medium",
                      },
                      t.title,
                    ),
                  ),
                  React.createElement(
                    Badge,
                    {
                      className: t.completed
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                    },
                    t.rewardLabel
                      ? t.rewardLabel
                      : `+${t.reward} ${tr("coins", "Coins")}`,
                  ),
                ),
              ),
              dailyChallenges.length > 3 &&
                React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    className:
                      "w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200",
                    onClick: () => setShowAllChallenges((t) => !t),
                  },
                  showAllChallenges
                    ? tr("show_less_challenges", "Show fewer challenges")
                    : tr("show_all_challenges", "View all challenges"),
                ),
            ),
          ),
        ),
      ),
      activeTab === "activity" && React.createElement(React.Fragment, null,
        React.createElement(
          "div",
          { className: "grid grid-cols-1 gap-4" },
          React.createElement(
            Card,
            {
              id: "rewards-activity",
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl scroll-mt-24",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(TrendingUp, { className: "w-5 h-5 text-indigo-600" }),
                " ",
                tr("streaks_and_chain_rewards", "Streaks & Chain Rewards"),
              ),
            ),
            React.createElement(
              CardContent,
              { className: "space-y-4" },
              React.createElement(
                "div",
                {
                  className:
                    "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30",
                },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between mb-2" },
                  React.createElement(
                    "span",
                    { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                    tr("visit_streak", "Visit streak"),
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm text-slate-600 dark:text-slate-300" },
                    visitStreak,
                    " ",
                    tr("days", "days"),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between mb-2" },
                  React.createElement(
                    "span",
                    { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                    tr("post_streak", "Post streak"),
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm text-slate-600 dark:text-slate-300" },
                    postStreak,
                    " ",
                    tr("days", "days"),
                  ),
                ),
                React.createElement(
                  "div",
                  {
                    className:
                      "h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden",
                    role: "progressbar",
                    "aria-label": tr("streak_progress", "Streak progress"),
                    "aria-valuenow": streakProgress,
                    "aria-valuemin": 0,
                    "aria-valuemax": 100,
                  },
                  React.createElement("div", {
                    className:
                      "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-700 ease-out",
                    style: { width: `${streakProgress}%` },
                  }),
                ),
                React.createElement(
                  "p",
                  { className: "text-xs text-slate-500 dark:text-slate-300 mt-2" },
                  tFunc("next_streak_milestone", {
                    count: nextStreakTarget,
                  }) || `Next streak milestone: ${nextStreakTarget} days`,
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/60 dark:bg-slate-900/10",
                },
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between mb-2" },
                  React.createElement(
                    "span",
                    { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                    tr("chain_rewards_earned", "Chain rewards earned"),
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm text-emerald-600 font-semibold" },
                    "+",
                    chainEarnedPoints,
                    " ",
                    tFunc("coins"),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex items-center justify-between" },
                  React.createElement(
                    "span",
                    { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                    tr("chain_rewards_potential", "Potential chain rewards"),
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm text-slate-600 dark:text-slate-300 font-semibold" },
                    "+",
                    chainPotentialPoints,
                    " ",
                    tFunc("coins"),
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            Card,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Gift, { className: "w-5 h-5 text-indigo-600" }),
                " ",
                tr("recent_rewards", "Recent rewards"),
              ),
            ),
            React.createElement(
              CardContent,
              null,
              logLoading
                ? React.createElement(
                    "p",
                    { className: "text-sm text-slate-500 dark:text-slate-300" },
                    tr("reward_log_loading", "Loading reward activity..."),
                  )
                : rewardLogItems.length
                  ? React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(
                        "div",
                        { className: "mb-3 flex flex-wrap gap-2" },
                        [
                          { key: "all", label: tr("history_filter_all", "All") },
                          { key: "earned", label: tr("history_filter_earned", "Earned") },
                          { key: "spent", label: tr("history_filter_spent", "Spent") },
                          { key: "referral", label: tr("history_filter_referral", "Referral") },
                          { key: "daily", label: tr("history_filter_daily", "Daily") },
                        ].map((filter) =>
                          React.createElement(
                            Button,
                            {
                              key: filter.key,
                              type: "button",
                              size: "sm",
                              variant: historyFilter === filter.key ? "default" : "outline",
                              className: "rounded-full text-xs",
                              onClick: () => setHistoryFilter(filter.key),
                            },
                            filter.label,
                          ),
                        ),
                      ),
                      React.createElement(
                        "div",
                        { className: "space-y-2" },
                        filteredRewardLogItems.length
                          ? filteredRewardLogItems.map((t, s) =>
                              React.createElement(
                                "div",
                                {
                                  key: `${t.action || "reward"}-${s}`,
                                  className:
                                    "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                                },
                                React.createElement(
                                  "div",
                                  null,
                                  React.createElement(
                                    "p",
                                    {
                                      className:
                                        "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                    },
                                    t.description ||
                                      t.action ||
                                      tFunc("reward_log_action"),
                                  ),
                                  React.createElement(
                                    "p",
                                    { className: "text-xs text-slate-500 dark:text-slate-300" },
                                    t.created_at
                                      ? new Date(t.created_at).toLocaleString()
                                      : "",
                                  ),
                                ),
                                React.createElement(
                                  Badge,
                                  {
                                    className:
                                      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                                  },
                                  `${t.points >= 0 ? "+" : ""}${t.points} ${tr("coins", "Coins")}`,
                                ),
                              ),
                            )
                          : React.createElement(
                              "p",
                              { className: "text-sm text-slate-500 dark:text-slate-300" },
                              tr("reward_log_filter_empty", "No reward activity matches this filter."),
                            ),
                      ),
                    )
                  : React.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center bg-slate-50/80 dark:bg-slate-900/30",
                      },
                      React.createElement(
                        "div",
                        {
                          className:
                            "mx-auto mb-2 h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200 flex items-center justify-center",
                        },
                        React.createElement(Sparkles, { className: "w-5 h-5" }),
                      ),
                      React.createElement(
                        "p",
                        { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" },
                        tr("reward_log_empty", "No reward activity yet."),
                      ),
                      React.createElement(
                        "p",
                        { className: "text-xs text-slate-500 dark:text-slate-300 mt-1" },
                        tr(
                          "reward_log_empty_desc",
                          "Complete a challenge or referral to see your first reward.",
                        ),
                      ),
                      React.createElement(
                        "div",
                        {
                          className:
                            "mt-3 flex flex-wrap items-center justify-center gap-2",
                        },
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            className:
                              "bg-indigo-600 hover:bg-indigo-700 text-white text-xs",
                            onClick: () => setActiveTab("earn"),
                          },
                          tr("earn_coins", "Earn coins"),
                        ),
                        React.createElement(
                          Button,
                          {
                            type: "button",
                            variant: "outline",
                            className: "text-xs",
                            onClick: shareReferral,
                          },
                          tr("share_referral", "Share referral"),
                        ),
                      ),
                    ),
            ),
          ),
        ),
      ),
      activeTab === "referrals" && React.createElement(React.Fragment, null,
        React.createElement(
          "div",
          { className: "grid grid-cols-1 gap-4" },
          React.createElement(
            Card,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Users, { className: "w-5 h-5 text-indigo-600" }),
                ` ${tr("referral_playbook", "Referral Playbook")}`,
              ),
            ),
            React.createElement(
              CardContent,
              { className: "space-y-3" },
              referralSteps.map((t, s) =>
                React.createElement(
                  "div",
                  {
                    key: t.key,
                    className:
                      "flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                  },
                  React.createElement(
                    "div",
                    {
                      className:
                        "relative flex flex-col items-center self-stretch",
                    },
                    React.createElement(
                      Badge,
                      { className: "bg-indigo-600 text-white mt-0.5" },
                      s + 1,
                    ),
                    s < referralSteps.length - 1
                      ? React.createElement("span", {
                          className:
                            "absolute top-8 bottom-3 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent dark:from-indigo-600/40 dark:via-slate-700 dark:to-transparent",
                        })
                      : null,
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-sm font-semibold text-slate-800 dark:text-slate-100",
                      },
                      t.title,
                    ),
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-xs text-slate-500 dark:text-slate-300",
                      },
                      t.detail,
                    ),
                  ),
                ),
              ),
              React.createElement(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  className: "w-full",
                  onClick: shareReferral,
                },
                React.createElement(Share2, { className: "w-4 h-4 mr-2" }),
                ` ${tr("share_referral_to_start", "Share referral to start")}`,
              ),
            ),
          ),
          React.createElement(
            Card,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Users, { className: "w-5 h-5 text-indigo-600" }),
                " ",
                tFunc("your_referrals"),
                " (",
                referralChain.length,
                ")",
              ),
            ),
            React.createElement(
              CardContent,
              null,
              referralChain.length === 0
                ? React.createElement(
                    "div",
                    { className: "text-center py-6" },
                    React.createElement(
                      "div",
                      { className: "text-6xl mb-4" },
                      "\uD83D\uDC65",
                    ),
                    React.createElement(
                      "p",
                      { className: "text-gray-500 dark:text-slate-300 mb-4" },
                      tFunc("no_referrals_yet"),
                    ),
                    React.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      React.createElement(
                        Button,
                        {
                          onClick: shareReferral,
                          className:
                            "bg-gradient-to-r from-indigo-500 to-purple-600",
                        },
                        React.createElement(Share2, { className: "w-4 h-4 mr-2" }),
                        " ",
                        tFunc("share_your_code"),
                      ),
                      React.createElement(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: () => navigate("/all-posts"),
                        },
                        tr("browse_listings", "Browse Listings"),
                      ),
                    ),
                  )
                : React.createElement(
                    "div",
                    { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-4",
                      },
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-xs font-semibold text-emerald-700 dark:text-emerald-200 mb-2",
                        },
                        tr("direct_referrals", "Direct referrals"),
                        " (",
                        directReferrals.length,
                        ")",
                      ),
                      directReferrals.length
                        ? React.createElement(
                            "div",
                            { className: "flex flex-wrap gap-2" },
                            directReferrals.map((t, s) =>
                              React.createElement(
                                Badge,
                                {
                                  key: t.id || s,
                                  className:
                                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                                },
                                t.name || tr("user", "User"),
                              ),
                            ),
                          )
                        : React.createElement(
                            "p",
                            { className: "text-xs text-emerald-700 dark:text-emerald-200" },
                            tr(
                              "no_direct_referrals",
                              "No direct referrals yet",
                            ),
                          ),
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-900/20 p-4",
                      },
                      React.createElement(
                        "p",
                        {
                          className:
                            "text-xs font-semibold text-blue-700 dark:text-blue-200 mb-2",
                        },
                        tr("indirect_referrals", "Indirect referrals"),
                        " (",
                        indirectReferrals.length,
                        ")",
                      ),
                      indirectReferrals.length
                        ? React.createElement(
                            "div",
                            { className: "flex flex-wrap gap-2" },
                            indirectReferrals.map((t, s) =>
                              React.createElement(
                                Badge,
                                {
                                  key: t.id || s,
                                  className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
                                },
                                t.name || tr("user", "User"),
                              ),
                            ),
                          )
                        : React.createElement(
                            "p",
                            { className: "text-xs text-blue-700 dark:text-blue-200" },
                            tr(
                              "no_indirect_referrals",
                              "No indirect referrals",
                            ),
                          ),
                    ),
                  ),
            ),
          ),
        ),
      ),
      activeTab === "milestones" && React.createElement(React.Fragment, null,
        React.createElement(
          "div",
          { className: "grid grid-cols-1 gap-4" },
          React.createElement(
            Card,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Star, { className: "w-5 h-5 text-yellow-500" }),
                ` ${tr("milestones_achievements", "Milestones & Achievements")}`,
              ),
            ),
            React.createElement(
              CardContent,
              null,
              React.createElement(
                "div",
                { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" },
                milestones.map((t, s) =>
                  React.createElement(
                    "div",
                    {
                      key: s,
                      className: `milestone-badge ${t.unlocked ? "unlocked" : "locked"} p-4 rounded-2xl text-center relative overflow-hidden ${t.unlocked ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/15 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/40 shadow-sm" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40"}`,
                    },
                    t.unlocked && React.createElement("div", { className: "badge-glow" }),
                    React.createElement(
                      "div",
                      { className: "badge-icon mb-2 mx-auto" },
                      t.icon,
                    ),
                    React.createElement(
                      "p",
                      {
                        className: `text-xs font-bold leading-tight ${t.unlocked ? "text-amber-700 dark:text-amber-300" : "text-slate-400 dark:text-slate-500"}`,
                      },
                      t.title,
                    ),
                    t.unlocked
                      ? React.createElement(
                          "div",
                          { className: "mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5" },
                          React.createElement("span", { className: "text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide" }, "✓ Unlocked"),
                        )
                      : React.createElement(
                          "div",
                          { className: "mt-2 inline-flex items-center rounded-full bg-slate-200/60 dark:bg-slate-700/40 px-2 py-0.5" },
                          React.createElement("span", { className: "text-[9px] text-slate-400 uppercase tracking-wide" }, "Locked"),
                        ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      activeTab === "leaderboard" && React.createElement(React.Fragment, null,
        React.createElement(
          "div",
          { className: "space-y-3" },
          React.createElement(
            Card,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Trophy, { className: "w-5 h-5 text-yellow-500" }),
                " ",
                tr("weekly_leaderboard", "Weekly Leaderboard"),
              ),
            ),
            React.createElement(
              CardContent,
              { className: "space-y-3" },
              React.createElement(
                "div",
                { className: "flex flex-wrap items-center gap-3" },
                React.createElement(
                  Badge,
                  {
                    className:
                      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                  },
                  tr("next_payout", "Next payout"),
                  ": ",
                  leaderboardCountdown
                    ? leaderboardCountdown
                    : nextLeaderboardPayout
                      ? new Date(nextLeaderboardPayout).toLocaleString()
                      : tr("unknown", "Unknown"),
                ),
                lastLeaderboardPayout
                  ? React.createElement(
                      Badge,
                      {
                        className:
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
                      },
                      tr("last_payout", "Last payout"),
                      ": ",
                      new Date(lastLeaderboardPayout).toLocaleDateString(),
                    )
                  : null,
              ),
              React.createElement(
                "p",
                { className: "text-xs text-slate-500 dark:text-slate-300" },
                tr(
                  "leaderboard_payout_notice",
                  "Payouts are processed weekly via background jobs. If jobs are paused, payouts may be delayed.",
                ),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "grid grid-cols-1 gap-4" },
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Crown, {
                    className: "w-5 h-5 text-indigo-600",
                  }),
                  " ",
                  tr("top_sellers", "Top Sellers"),
                ),
              ),
              React.createElement(
                CardContent,
                null,
                publicWallLoading
                  ? React.createElement(
                      "p",
                      { className: "text-sm text-slate-500 dark:text-slate-300" },
                      tr("loading", "Loading..."),
                    )
                  : publicWall.topSellers?.length
                    ? React.createElement(
                        "div",
                        { className: "space-y-2" },
                        publicWall.topSellers.map((t, s) =>
                          React.createElement(
                            "div",
                            {
                              key: t.id || s,
                              className:
                                "flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                            },
                            React.createElement(
                              "div",
                              { className: "flex items-center gap-2" },
                              React.createElement(
                                Badge,
                                { className: "bg-indigo-50 text-indigo-600" },
                                t.rank || `#${s + 1}`,
                              ),
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                },
                                t.name || tr("user", "User"),
                              ),
                            ),
                            React.createElement(
                              "div",
                              { className: "text-sm text-slate-600 dark:text-slate-300" },
                              tr("sales", "Sales"),
                              ": ",
                              t.sales ?? 0,
                            ),
                          ),
                        ),
                      )
                    : React.createElement(
                        "p",
                        { className: "text-sm text-slate-500 dark:text-slate-300" },
                        tr("no_leaderboard_data", "No leaderboard data yet."),
                      ),
              ),
            ),
            React.createElement(
              Card,
              {
                className:
                  "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
              },
              React.createElement(
                CardHeader,
                null,
                React.createElement(
                  CardTitle,
                  { className: "flex items-center gap-2" },
                  React.createElement(Crown, {
                    className: "w-5 h-5 text-emerald-600",
                  }),
                  " ",
                  tr("top_buyers", "Top Buyers"),
                ),
              ),
              React.createElement(
                CardContent,
                null,
                publicWallLoading
                  ? React.createElement(
                      "p",
                      { className: "text-sm text-slate-500 dark:text-slate-300" },
                      tr("loading", "Loading..."),
                    )
                  : publicWall.topBuyers?.length
                    ? React.createElement(
                        "div",
                        { className: "space-y-2" },
                        publicWall.topBuyers.map((t, s) =>
                          React.createElement(
                            "div",
                            {
                              key: t.id || s,
                              className:
                                "flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                            },
                            React.createElement(
                              "div",
                              { className: "flex items-center gap-2" },
                              React.createElement(
                                Badge,
                                {
                                  className: "bg-emerald-50 text-emerald-600",
                                },
                                t.rank || `#${s + 1}`,
                              ),
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "text-sm font-semibold text-slate-800 dark:text-slate-100",
                                },
                                t.name || tr("user", "User"),
                              ),
                            ),
                            React.createElement(
                              "div",
                              { className: "text-sm text-slate-600 dark:text-slate-300" },
                              tr("purchases", "Purchases"),
                              ": ",
                              t.purchases ?? 0,
                            ),
                          ),
                        ),
                      )
                    : React.createElement(
                        "p",
                        { className: "text-sm text-slate-500 dark:text-slate-300" },
                        tr("no_leaderboard_data", "No leaderboard data yet."),
                      ),
              ),
            ),
          ),
          React.createElement(
            Card,
            {
              className:
                "bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl",
            },
            React.createElement(
              CardHeader,
              null,
              React.createElement(
                CardTitle,
                { className: "flex items-center gap-2" },
                React.createElement(Award, { className: "w-5 h-5 text-indigo-600" }),
                " ",
                tr("payout_history", "Payout history"),
              ),
            ),
            React.createElement(
              CardContent,
              null,
              leaderboardHistory.length
                ? React.createElement(
                    "div",
                    { className: "space-y-2" },
                    leaderboardHistory.map((t, s) =>
                      React.createElement(
                        "div",
                        {
                          key: `${t.action || "payout"}-${s}`,
                          className:
                            "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2",
                        },
                        React.createElement(
                          "div",
                          null,
                          React.createElement(
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
                          React.createElement(
                            "p",
                            { className: "text-xs text-slate-500 dark:text-slate-300" },
                            t.created_at
                              ? new Date(t.created_at).toLocaleString()
                              : "",
                          ),
                        ),
                        React.createElement(
                          Badge,
                          {
                            className:
                              "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
                          },
                          "+",
                          t.points ?? 0,
                          " ",
                          tFunc("coins"),
                        ),
                      ),
                    ),
                  )
                : React.createElement(
                    "p",
                    { className: "text-sm text-slate-500 dark:text-slate-300" },
                    tr("no_payout_history", "No leaderboard payouts yet."),
                  ),
            ),
          ),
        ),
      ),
      ),
    ),
    React.createElement(
      Dialog,
      {
        open: redeemDialogOpen,
        onOpenChange: (t) => {
          setRedeemDialogOpen(t);
          if (!t) {
            setRedeemDialogReward(null);
            setRedeemDialogError(null);
            setRedeemSelectedPostId("");
          }
        },
      },
      React.createElement(
        DialogContent,
        { className: "max-w-lg" },
        React.createElement(
          DialogHeader,
          null,
          React.createElement(
            DialogTitle,
            null,
            redeemDialogReward?.title || tr("redeem_reward", "Redeem reward"),
          ),
          React.createElement(
            DialogDescription,
            null,
            redeemDialogReward?.desc ||
              tr(
                "redeem_reward_desc",
                "Select a listing to apply this reward.",
              ),
          ),
        ),
        React.createElement(
          "div",
          { className: "space-y-3" },
          React.createElement(
            "div",
            {
              className:
                "rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3",
            },
            React.createElement(
              "div",
              { className: "flex items-center justify-between text-sm" },
              React.createElement(
                "span",
                { className: "text-slate-600 dark:text-slate-300" },
                tr("cost", "Cost"),
              ),
              React.createElement(
                "span",
                { className: "font-semibold text-slate-900 dark:text-slate-100" },
                redeemDialogReward?.cost || 0,
                " ",
                tr("coins", "coins"),
              ),
            ),
            React.createElement(
              "div",
              { className: "flex items-center justify-between text-xs mt-2" },
              React.createElement(
                "span",
                { className: "text-slate-500 dark:text-slate-300" },
                tr("available_coins", "Available coins"),
              ),
              React.createElement(
                "span",
                { className: "font-semibold text-emerald-600" },
                availableCoins,
              ),
            ),
          ),
          redeemDialogReward?.requiresPost &&
            React.createElement(
              "div",
              { className: "space-y-2" },
              React.createElement(
                "p",
                { className: "text-xs font-semibold text-slate-600 dark:text-slate-300" },
                tr("select_listing", "Select a listing"),
              ),
              redeemDialogLoading
                ? React.createElement(
                    "p",
                    { className: "text-xs text-slate-400" },
                    tr("loading", "Loading..."),
                  )
                : redeemDialogPosts.length
                  ? React.createElement(
                      "div",
                      { className: "max-h-56 overflow-y-auto space-y-2" },
                      redeemDialogPosts.map((t) => {
                        const id = t?.post_id || t?.id;
                        const selected = String(redeemSelectedPostId) === String(id);
                        return React.createElement(
                          "button",
                          {
                            key: id || t?.title,
                            type: "button",
                            onClick: () =>
                              setRedeemSelectedPostId(id ? String(id) : ""),
                            className:
                              "w-full text-left rounded-xl border px-3 py-2 transition " +
                              (selected
                                ? "border-indigo-300 bg-indigo-50"
                                : "border-slate-200 hover:border-indigo-200"),
                          },
                          React.createElement(
                            "p",
                            { className: "text-sm font-semibold text-slate-800 dark:text-slate-100" },
                            t?.title || tr("untitled_post", "Untitled post"),
                          ),
                          React.createElement(
                            "p",
                            { className: "text-xs text-slate-500 dark:text-slate-300" },
                            tr("price", "Price"),
                            ": ",
                            Number(t?.price || 0).toLocaleString(),
                          ),
                        );
                      }),
                    )
                  : React.createElement(
                      "p",
                      { className: "text-xs text-slate-400" },
                      tr(
                        "no_active_posts",
                        "No active posts available for redemption.",
                      ),
                    ),
            ),
          redeemDialogErrorMessage &&
            React.createElement(
              "p",
              { className: "text-xs text-rose-500" },
              redeemDialogErrorMessage,
            ),
        ),
        React.createElement(
          DialogFooter,
          null,
          React.createElement(
            Button,
            {
              type: "button",
              variant: "outline",
              onClick: () => setRedeemDialogOpen(!1),
            },
            tr("cancel", "Cancel"),
          ),
          React.createElement(
            Button,
            {
              type: "button",
              disabled:
                redeemProcessing === (redeemDialogReward?.key || "") ||
                (redeemDialogReward?.requiresPost &&
                  !redeemSelectedPostId),
              className:
                "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60",
              onClick: handleRedeemStore,
            },
            redeemProcessing === (redeemDialogReward?.key || "")
              ? tr("redeeming", "Redeeming...")
              : tr("redeem_now", "Redeem now"),
          ),
        ),
      ),
    ),
    showDiagnostics &&
      React.createElement(
        "div",
        { className: "max-w-6xl mx-auto px-4 mb-3" },
        React.createElement(
          "div",
          {
            className:
              "rounded-2xl border border-slate-200 bg-white/90 dark:bg-gray-900/60 px-4 py-3 shadow-sm",
          },
          React.createElement(
            "div",
            { className: "flex items-center justify-between mb-2" },
            React.createElement(
              "p",
              {
                className:
                  "text-sm font-semibold text-slate-700 dark:text-slate-200",
              },
              tr("rewards_diagnostics", "Rewards diagnostics"),
            ),
            React.createElement(
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
          React.createElement(
            "div",
            { className: "flex flex-wrap gap-2" },
            diagnosticsItems.map((t) =>
              React.createElement(
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
            React.createElement(
              "p",
              { className: "mt-2 text-xs text-slate-500 dark:text-slate-300" },
              tr("last_update", "Last update"),
              ": ",
              new Date(lastSseUpdate).toLocaleString(),
            ),
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        className:
          "fixed bottom-4 left-0 right-0 px-4 z-50 md:hidden",
      },
      React.createElement(
        Button,
        {
          type: "button",
          onClick: shareReferral,
          className:
            "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg",
        },
        React.createElement(Share2, { className: "w-4 h-4 mr-2" }),
        tr("invite_friends", "Invite friends"),
      ),
    ),
    React.createElement(
      "div",
      { className: "hidden md:block fixed bottom-6 right-6 z-50" },
      React.createElement(
        Button,
        {
          type: "button",
          onClick: shareReferral,
          className:
            "h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center",
          title: tr("invite_friends", "Invite friends"),
        },
        React.createElement(Share2, { className: "w-5 h-5" }),
        React.createElement(
          "span",
          { className: "sr-only" },
          tr("invite_friends", "Invite friends"),
        ),
      ),
    ),
  ));
};
var Te = RewardsPage;
export { Te as default };





