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
import {
  RewardsActivity,
  RewardsEarn,
  RewardsHero,
  RewardsLeaderboard,
  RewardsMilestones,
  RewardsOverview,
  RewardsRedeem,
  RewardsReferrals,
} from "@/components/rewards/RewardsSections";

const REWARD_ACTIVITY_LIMIT = 50;
const DEFAULT_SECTION_KEY_BY_TAB = {
  overview: "dashboard",
  earn: "earn",
  milestones: "benefits",
  redeem: "redeem",
  activity: "activity",
  referrals: "referrals",
  leaderboard: "leaderboard",
};
const SECTION_TAB_BY_KEY = {
  dashboard: "overview",
  achievements: "overview",
  earn: "earn",
  challenges: "earn",
  benefits: "milestones",
  redeem: "redeem",
  activity: "activity",
  referrals: "referrals",
  leaderboard: "leaderboard",
};
const SECTION_ID_BY_KEY = {
  dashboard: "rewards-summary",
  achievements: "rewards-progress",
  earn: "rewards-earn",
  challenges: "rewards-challenges",
  benefits: "rewards-benefits",
  redeem: "rewards-redeem",
  activity: "rewards-activity",
  referrals: "rewards-referrals",
  leaderboard: "rewards-weekly-leaderboard",
};

const RewardsPage = () => {
  const [rewardsUser, setRewardsUser] = useState(null),
    [referralChain, setReferralChain] = useState([]),
    [isLoading, setIsLoading] = useState(!0),
    [errorObj, setErrorObj] = useState(null),
    [activeTab, setActiveTab] = useState("overview"),
    [activeSectionKey, setActiveSectionKey] = useState(
      DEFAULT_SECTION_KEY_BY_TAB.overview,
    ),
    [refreshCounter, setRefreshCounter] = useState(0),
    [tabDataLoaded, setTabDataLoaded] = useState({ overview: true }),
    [publicWall, setPublicWall] = useState({
      topSellers: [],
      topBuyers: [],
      topUsers: [],
    }),
    [publicWallLoading, setPublicWallLoading] = useState(!1),
    [publicWallLoaded, setPublicWallLoaded] = useState(!1),
    [referralLeaderboard, setReferralLeaderboard] = useState([]),
    [currentReferralRank, setCurrentReferralRank] = useState(null),
    [referralLeaderboardLoading, setReferralLeaderboardLoading] = useState(!1),
    [referralLeaderboardLoaded, setReferralLeaderboardLoaded] = useState(!1),
    [secretCountdown, setSecretCountdown] = useState(""),
    [leaderboardCountdown, setLeaderboardCountdown] = useState(""),
    [rewardLog, setRewardLog] = useState([]),
    [rewardLogLoading, setRewardLogLoading] = useState(!1),
    [rewardLogLoaded, setRewardLogLoaded] = useState(!1),
    [coinBalance, setCoinBalance] = useState(null),
    [coinDelta, setCoinDelta] = useState(null),
    [coinHistory, setCoinHistory] = useState([]),
    [coinHistoryLoading, setCoinHistoryLoading] = useState(!1),
    [coinHistoryLoaded, setCoinHistoryLoaded] = useState(!1),
    [engagement, setEngagement] = useState(null),
    [engagementLoading, setEngagementLoading] = useState(!1),
    [engagementError, setEngagementError] = useState(null),
    [engagementLoaded, setEngagementLoaded] = useState(!1),
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
    [mobileInviteHidden, setMobileInviteHidden] = useState(!1),
    sseFallbackTimerRef = useRef(null),
    coinDeltaTimerRef = useRef(null),
    previousCoinBalanceRef = useRef(null),
    refreshAttemptedRef = useRef(false),
    pendingSectionScrollRef = useRef(null),
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
          setEngagementLoaded(!0);
          t || setEngagementLoading(!1);
        }
      },
      [isAuthed, tr],
    );
  const errorMessage = resolveMessage(errorObj);
  const engagementErrorMessage = resolveMessage(engagementError);
  const redeemDialogErrorMessage = resolveMessage(redeemDialogError);
  const scrollToSection = useCallback((sectionKey, options = {}) => {
    if (typeof document === "undefined") {
      return;
    }

    const targetId = SECTION_ID_BY_KEY[sectionKey];
    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: options.behavior || "smooth",
      block: "start",
    });
  }, []);
  const openSection = useCallback(
    (sectionKey) => {
      const nextTab = SECTION_TAB_BY_KEY[sectionKey];
      if (!nextTab) {
        return;
      }

      setActiveSectionKey(sectionKey);
      if (activeTab === nextTab) {
        scrollToSection(sectionKey);
        return;
      }

      pendingSectionScrollRef.current = sectionKey;
      setActiveTab(nextTab);
    },
    [activeTab, scrollToSection],
  );
  useEffect(() => {
    document.title = "MHub - Rewards";
    return () => {
      document.title = "MHub";
    };
  }, []);

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
      setTabDataLoaded((current) =>
        current[activeTab] ? current : { ...current, [activeTab]: !0 },
      );
      setActiveSectionKey((current) =>
        SECTION_TAB_BY_KEY[current] === activeTab
          ? current
          : DEFAULT_SECTION_KEY_BY_TAB[activeTab] || current,
      );
    }, [activeTab]),
    useEffect(() => {
      const pendingSectionKey = pendingSectionScrollRef.current;
      if (
        !pendingSectionKey ||
        SECTION_TAB_BY_KEY[pendingSectionKey] !== activeTab ||
        typeof window === "undefined"
      ) {
        return;
      }

      pendingSectionScrollRef.current = null;
      const frameId = window.requestAnimationFrame(() => {
        scrollToSection(pendingSectionKey);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [activeTab, scrollToSection]),
    useEffect(() => {
      if (!isAuthed || !tabDataLoaded.earn) return;
      fetchEngagement({ silent: !1 });
    }, [isAuthed, tabDataLoaded.earn, refreshCounter, fetchEngagement]),
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
    if (!isAuthed || !tabDataLoaded.leaderboard) return;
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
        if (t) {
          setPublicWallLoaded(!0);
          setPublicWallLoading(!1);
        }
      }
    })();
    return () => {
      t = !1;
    };
  }, [isAuthed, tabDataLoaded.leaderboard, refreshCounter]);
  useEffect(() => {
    if (!isAuthed || !tabDataLoaded.leaderboard) return;
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
        if (t) {
          setReferralLeaderboardLoaded(!0);
          setReferralLeaderboardLoading(!1);
        }
      }
    })();
    return () => {
      t = !1;
    };
  }, [isAuthed, tabDataLoaded.leaderboard, refreshCounter, currentUserId]);
  useEffect(() => {
    if (!isAuthed || !tabDataLoaded.activity) return;
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
        if (t) {
          setRewardLogLoaded(!0);
          setRewardLogLoading(!1);
        }
      }
    })();
    return () => {
      t = !1;
    };
  }, [isAuthed, tabDataLoaded.activity, refreshCounter]);
  useEffect(() => {
    if (!isAuthed || !tabDataLoaded.activity) return;
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
        if (t) {
          setCoinHistoryLoaded(!0);
          setCoinHistoryLoading(!1);
        }
      }
    })();
    return () => {
      t = !1;
    };
  }, [isAuthed, tabDataLoaded.activity, refreshCounter, applyCoinBalanceUpdate]);
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
  useEffect(() => {
    if (activeTab !== "referrals") {
      setMobileInviteHidden(!1);
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof window.IntersectionObserver === "undefined"
    ) {
      setMobileInviteHidden(!1);
      return;
    }

    const target = document.getElementById("rewards-referral-share-actions");
    if (!target) {
      setMobileInviteHidden(!1);
      return;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        setMobileInviteHidden(Boolean(entry?.isIntersecting));
      },
      {
        threshold: 0.6,
      },
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [activeTab, referralChain.length, rewardsUser?.dailySecretCode]);
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
    salesCount = Number(activityStats.salesCount || 0),
    referralsCount = Number(activityStats.referralsCount || 0),
    profileCompleted = Boolean(rewardsUser.profileComplete),
    hasPosted = Boolean(rewardsUser.hasPosted),
    goldOrBetter =
      rewardsUser.rank === "Gold" || rewardsUser.rank === "Platinum",
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
        key: "invite",
        title: tr("invite_a_friend", "Invite a friend"),
        desc: tr(
          "challenge_invite_desc",
          "Share your referral link or code to unlock referral rewards.",
        ),
        reward: 50,
        completed: Number(activityStats.referralsToday || 0) > 0,
        cta: tr("share_now", "Share Now"),
        onClick: shareReferral,
      },
      {
        key: "visit",
        title: tr("visit_today", "Visit today"),
        desc: tr(
          "challenge_visit_desc",
          "Open the marketplace today to keep your streak alive.",
        ),
        reward: 2,
        completed: Number(activityStats.visitsToday || 0) > 0,
        cta: tr("browse_listings", "Browse listings"),
        onClick: () => navigate("/all-posts"),
      },
      {
        key: "post",
        title: tr("post_today", "Post today"),
        desc: tr(
          "challenge_post_desc",
          "Create one fresh listing to keep coins and visibility moving.",
        ),
        reward: 5,
        completed: Number(activityStats.postsToday || 0) > 0,
        cta: tr("start_posting", "Start Posting"),
        onClick: () => navigate("/post_add"),
      },
      {
        key: "sale",
        title: tr("make_a_sale", "Make a sale"),
        desc: tr(
          "challenge_sale_desc",
          "Sales unlock bigger coin rewards and milestone progress.",
        ),
        rewardLabel: tr("reward_varies_by_sale", "Varies by sale value"),
        completed: Number(activityStats.salesToday || 0) > 0,
        cta: tr("start_selling", "Start selling today!"),
        onClick: () => navigate("/my-home"),
      },
      {
        key: "purchase",
        title: tr("complete_purchase", "Complete a purchase"),
        desc: tr(
          "challenge_purchase_desc",
          "Buying from the marketplace also moves your rewards forward.",
        ),
        rewardLabel: tr(
          "reward_varies_by_purchase",
          "Varies by purchase value",
        ),
        completed: Number(activityStats.purchasesToday || 0) > 0,
        cta: tr("browse_listings", "Browse listings"),
        onClick: () => navigate("/all-posts"),
      },
      {
        key: "level",
        title: tr("reach_next_level", "Reach next level"),
        desc: tr(
          "challenge_level_desc",
          "Earn XP from daily activity, sales, and referrals to level up.",
        ),
        reward: 25,
        completed: xpRemaining === 0,
        cta: tr("view_benefits", "View benefits"),
        onClick: () => openSection("benefits"),
      },
    ],
    visibleChallenges = showAllChallenges
      ? dailyChallenges
      : dailyChallenges.slice(0, 3),
    milestones = [
      {
        key: "first_sale",
        icon: "\uD83C\uDFAF",
        title: tr("first_sale", "First Sale"),
        desc: tr(
          "first_sale_desc",
          "Complete your first successful sale to unlock this badge.",
        ),
        unlocked: salesCount > 0,
        progressValue: Math.min(salesCount, 1),
        progressMax: 1,
      },
      {
        key: "profile_completed",
        icon: "\uD83E\uDDE9",
        title: tr("profile_completed", "Profile Completed"),
        desc: tr(
          "profile_completed_desc",
          "Finish your profile so buyers and sellers trust you faster.",
        ),
        unlocked: profileCompleted,
        progressValue: profileCompleted ? 1 : 0,
        progressMax: 1,
      },
      {
        key: "first_post",
        icon: "\uD83D\uDCDD",
        title: tr("first_post", "First Post"),
        desc: tr(
          "first_post_desc",
          "Publish your first listing to start earning marketplace rewards.",
        ),
        unlocked: hasPosted,
        progressValue: hasPosted ? 1 : 0,
        progressMax: 1,
      },
      {
        key: "five_referrals",
        icon: "\uD83D\uDC65",
        title: tr("five_referrals", "5 Referrals"),
        desc: tr(
          "five_referrals_desc",
          "Grow your network with five direct referrals.",
        ),
        unlocked: referralsCount >= 5,
        progressValue: Math.min(referralsCount, 5),
        progressMax: 5,
      },
      {
        key: "seven_day_streak",
        icon: "\uD83D\uDD25",
        title: tr("seven_day_streak", "7 Day Streak"),
        desc: tr(
          "seven_day_streak_desc",
          "Stay active for seven straight days to build momentum.",
        ),
        unlocked: maxStreak >= 7,
        progressValue: Math.min(maxStreak, 7),
        progressMax: 7,
      },
      {
        key: "qualified_referral",
        icon: "\uD83C\uDF1F",
        title: tr("qualified_referral_badge", "Qualified Referral"),
        desc: tr(
          "qualified_referral_badge_desc",
          "Help one referral complete a verified trade.",
        ),
        unlocked: qualifiedReferrals > 0,
        progressValue: Math.min(qualifiedReferrals, 1),
        progressMax: 1,
      },
      {
        key: "top_seller",
        icon: "\u2B50",
        title: tr("top_seller", "Top Seller"),
        desc: tr(
          "top_seller_desc",
          "Complete five sales to earn your top seller badge.",
        ),
        unlocked: salesCount >= 5,
        progressValue: Math.min(salesCount, 5),
        progressMax: 5,
      },
      {
        key: "gold_rank",
        icon: "\uD83C\uDFC6",
        title: tr("gold_rank", "Gold Rank"),
        desc: tr(
          "gold_rank_desc",
          "Reach Gold rank to unlock stronger visibility perks.",
        ),
        unlocked: goldOrBetter,
        progressValue: goldOrBetter ? 1 : 0,
        progressMax: 1,
        meta: `${tr("rank", "Rank")}: ${rewardsUser.rank || tr("unknown", "Unknown")}`,
      },
      {
        key: "streak_master",
        icon: "\u26A1",
        title: tr("streak_master", "Streak Master"),
        desc: tr(
          "streak_master_desc",
          "Hold a 30-day streak to unlock the long-run badge.",
        ),
        unlocked: maxStreak >= 30,
        progressValue: Math.min(maxStreak, 30),
        progressMax: 30,
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
  const referralCode = rewardsUser?.referralCode || "";
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
  const engagementReady = engagementLoaded;
  const activityReady = rewardLogLoaded && coinHistoryLoaded;
  const leaderboardReady = publicWallLoaded && referralLeaderboardLoaded;
  const overviewPrimaryActionLabel =
    nextAction === "earn_xp"
      ? tr("earn_more_coins", "Earn More Coins")
      : nextAction === "qualify_referral"
        ? tr("invite_friends", "Invite friends")
        : tr("activity", "Activity");
  const handleOverviewPrimaryAction = () => {
    if (nextAction === "earn_xp") {
      openSection("earn");
      return;
    }
    if (nextAction === "qualify_referral") {
      openSection("referrals");
      return;
    }
    openSection("activity");
  };
  const sectionNavItems = [
    {
      key: "dashboard",
      tab: "overview",
      label: tr("rewards_dashboard", "Rewards Dashboard"),
      icon: Sparkles,
    },
    {
      key: "achievements",
      tab: "overview",
      label: tr("achievements", "Achievements"),
      icon: Award,
    },
    {
      key: "earn",
      tab: "earn",
      label: tr("earn_coins", "Earn Coins"),
      icon: Gift,
    },
    {
      key: "challenges",
      tab: "earn",
      label: tr("daily_challenges", "Today's Challenges"),
      icon: Target,
    },
    {
      key: "benefits",
      tab: "milestones",
      label: tr("level_benefits", "Level benefits"),
      icon: Crown,
    },
    {
      key: "redeem",
      tab: "redeem",
      label: tr("redeem_coins", "Redeem coins"),
      icon: Star,
    },
    {
      key: "activity",
      tab: "activity",
      label: tr("activity", "Activity"),
      icon: TrendingUp,
    },
    {
      key: "referrals",
      tab: "referrals",
      label: tr("referrals", "Referrals"),
      icon: Users,
    },
    {
      key: "leaderboard",
      tab: "leaderboard",
      label: tr("leaderboard", "Leaderboard"),
      icon: Trophy,
    },
  ];
  const handleSectionSelect = (item) => {
    openSection(item.key);
  };
  const showMobileInviteCta =
    activeTab === "referrals" && !shareDisabled && !mobileInviteHidden;
  const tabButtonClass = (isActive) =>
    "rewards-tab-btn inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-200 " +
    (isActive
      ? "active border-indigo-500 bg-indigo-600 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white");
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-purple-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-900 page-fade-in"
      style={{ paddingBottom: "80px" }}
    >
      <RewardsHero
        rewardsUser={rewardsUser}
        rankGradients={$}
        displayCoins={displayCoins}
        coinDelta={coinDelta}
        xpProgressPercent={xpProgressPercent}
        xpRemaining={xpRemaining}
        referralGoal={referralGoal}
        referralReward={referralReward}
        referralDisplay={referralDisplay}
        referralProgressPercent={referralProgressPercent}
        milestoneEligible={milestoneEligible}
        milestoneClaimed={milestoneClaimed}
        onClaimMilestone={handleClaimMilestone}
        shareDisabled={shareDisabled}
        onShareWhatsApp={shareWhatsApp}
        onShareTelegram={shareTelegram}
        onCopyReferralLink={copyReferralLink}
        onShareSms={shareSms}
        tr={tr}
      />

      <div
        id="rewards-dashboard"
        className="max-w-6xl mx-auto px-4 mt-3 sm:mt-4 pb-6 relative z-10 space-y-4 scroll-mt-24"
      >
        <div className="w-full">
          <div className="mb-2 px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
              {tr("jump_to_section", "Jump to section")}
            </p>
          </div>

          <div
            role="navigation"
            aria-label={tr("rewards_tabs", "Rewards sections")}
            className="rewards-tab-bar sticky top-3 z-30 w-full flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white/98 dark:bg-gray-800/98 p-1.5 shadow-lg mb-4 scrollbar-hide backdrop-blur-xl"
          >
            {sectionNavItems.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={activeSectionKey === item.key}
                onClick={() => handleSectionSelect(item)}
                className={tabButtonClass(activeSectionKey === item.key)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <RewardsOverview
              rewardsUser={rewardsUser}
              displayCoins={displayCoins}
              nextRewardTarget={nextRewardTarget}
              nextRewardLabel={nextRewardLabel}
              nextRewardProgress={nextRewardProgress}
              nextRewardRemaining={nextRewardRemaining}
              onShareReferral={shareReferral}
              onOpenRedeem={() => openSection("redeem")}
              primaryStats={primaryStats}
              secondaryStats={secondaryStats}
              showMoreStats={showMoreStats}
              onToggleMoreStats={() => setShowMoreStats((value) => !value)}
              xpProgressPercent={xpProgressPercent}
              xpRemaining={xpRemaining}
              maxStreak={maxStreak}
              nextStreakTarget={nextStreakTarget}
              streakProgress={streakProgress}
              milestoneUnlockedCount={milestoneUnlockedCount}
              milestones={milestones}
              nextMilestone={nextMilestone}
              onboardingSteps={onboardingSteps}
              primaryActionLabel={overviewPrimaryActionLabel}
              onPrimaryAction={handleOverviewPrimaryAction}
              onOpenEarnPlan={() => openSection("earn")}
              tr={tr}
            />
          ) : null}

          {activeTab === "earn" ? (
            <RewardsEarn
              earnPlaybook={earnPlaybook}
              engagementReady={engagementReady}
              engagementLoading={engagementLoading}
              engagementErrorMessage={engagementErrorMessage}
              dailyCheckInStatus={dailyCheckInStatus}
              dailyCheckInRewards={dailyCheckInRewards}
              currentCheckInDay={currentCheckInDay}
              hasCheckedInToday={hasCheckedInToday}
              dailyCheckInLoading={dailyCheckInLoading}
              onDailyCheckIn={handleDailyCheckIn}
              spinStatus={spinStatus}
              spinLoading={spinLoading}
              onSpin={handleSpinWheel}
              scratchStatus={scratchStatus}
              scratchLoading={scratchLoading}
              onScratch={handleScratchCard}
              visibleChallenges={visibleChallenges}
              dailyChallenges={dailyChallenges}
              showAllChallenges={showAllChallenges}
              onToggleChallenges={() => setShowAllChallenges((value) => !value)}
              tr={tr}
            />
          ) : null}

          {activeTab === "milestones" ? (
            <RewardsMilestones
              levelBenefits={levelBenefits}
              currentLevel={currentLevel}
              milestones={milestones}
              onOpenAllLevels={() => navigate("/tier-selection")}
              tr={tr}
            />
          ) : null}

          {activeTab === "redeem" ? (
            <RewardsRedeem
              redeemOptions={redeemOptions}
              availableCoins={availableCoins}
              redeemProcessing={redeemProcessing}
              onOpenRedeemDialog={openRedeemDialog}
              onOpenEarn={() => openSection("earn")}
              tr={tr}
            />
          ) : null}

          {activeTab === "activity" ? (
            <RewardsActivity
              visitStreak={visitStreak}
              postStreak={postStreak}
              streakProgress={streakProgress}
              nextStreakTarget={nextStreakTarget}
              chainEarnedPoints={chainEarnedPoints}
              chainPotentialPoints={chainPotentialPoints}
              activityReady={activityReady}
              rewardLogItems={rewardLogItems}
              filteredRewardLogItems={filteredRewardLogItems}
              historyFilter={historyFilter}
              onChangeHistoryFilter={setHistoryFilter}
              onOpenEarn={() => openSection("earn")}
              onShareReferral={shareReferral}
              tr={tr}
              tFunc={tFunc}
            />
          ) : null}

          {activeTab === "referrals" ? (
            <RewardsReferrals
              referralCode={referralCode}
              referralShareDisplay={referralShareDisplay}
              referralGoal={referralGoal}
              referralReward={referralReward}
              shareDisabled={shareDisabled}
              onCopyReferralCode={() =>
                copyToClipboard(
                  referralCode,
                  tr("referral_code", "Referral code"),
                )
              }
              onCopyReferralLink={copyReferralLink}
              onShareWhatsApp={shareWhatsApp}
              onShareTelegram={shareTelegram}
              onShareSms={shareSms}
              dailySecretCode={rewardsUser?.dailySecretCode}
              secretCountdown={secretCountdown}
              onCopySecretCode={() => copyToClipboard(rewardsUser?.dailySecretCode || "", tr("secret_code", "Secret code"))}
              referralSteps={referralSteps}
              onShareReferral={shareReferral}
              referralChain={referralChain}
              directReferrals={directReferrals}
              indirectReferrals={indirectReferrals}
              onBrowseListings={() => navigate("/all-posts")}
              tr={tr}
              tFunc={tFunc}
            />
          ) : null}

          {activeTab === "leaderboard" ? (
            <RewardsLeaderboard
              leaderboardCountdown={leaderboardCountdown}
              nextLeaderboardPayout={nextLeaderboardPayout}
              lastLeaderboardPayout={lastLeaderboardPayout}
              currentReferralRank={currentReferralRank}
              referralLeaderboard={referralLeaderboard}
              leaderboardReady={leaderboardReady}
              publicWall={publicWall}
              leaderboardHistory={leaderboardHistory}
              tr={tr}
              tFunc={tFunc}
            />
          ) : null}
        </div>
      </div>

      <Dialog
        open={redeemDialogOpen}
        onOpenChange={(open) => {
          setRedeemDialogOpen(open);
          if (!open) {
            setRedeemDialogReward(null);
            setRedeemDialogError(null);
            setRedeemSelectedPostId("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {redeemDialogReward?.title || tr("redeem_reward", "Redeem reward")}
            </DialogTitle>
            <DialogDescription>
              {redeemDialogReward?.desc ||
                tr(
                  "redeem_reward_desc",
                  "Select a listing to apply this reward.",
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  {tr("cost", "Cost")}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {redeemDialogReward?.cost || 0} {tr("coins", "coins")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-slate-500 dark:text-slate-300">
                  {tr("available_coins", "Available coins")}
                </span>
                <span className="font-semibold text-emerald-600">{availableCoins}</span>
              </div>
            </div>

            {redeemDialogReward?.requiresPost ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tr("select_listing", "Select a listing")}
                </p>
                {redeemDialogLoading ? (
                  <p className="text-xs text-slate-400">{tr("loading", "Loading...")}</p>
                ) : redeemDialogPosts.length ? (
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {redeemDialogPosts.map((post) => {
                      const id = post?.post_id || post?.id;
                      const selected = String(redeemSelectedPostId) === String(id);
                      return (
                        <button
                          key={id || post?.title}
                          type="button"
                          onClick={() => setRedeemSelectedPostId(id ? String(id) : "")}
                          className={
                            "w-full text-left rounded-xl border px-3 py-2 transition " +
                            (selected
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-slate-200 hover:border-indigo-200")
                          }
                        >
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {post?.title || tr("untitled_post", "Untitled post")}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-300">
                            {tr("price", "Price")}: {Number(post?.price || 0).toLocaleString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    {tr(
                      "no_active_posts",
                      "No active posts available for redemption.",
                    )}
                  </p>
                )}
              </div>
            ) : null}

            {redeemDialogErrorMessage ? (
              <p className="text-xs text-rose-500">{redeemDialogErrorMessage}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRedeemDialogOpen(false)}>
              {tr("cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={
                redeemProcessing === (redeemDialogReward?.key || "") ||
                (redeemDialogReward?.requiresPost && !redeemSelectedPostId)
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
              onClick={handleRedeemStore}
            >
              {redeemProcessing === (redeemDialogReward?.key || "")
                ? tr("redeeming", "Redeeming...")
                : tr("redeem_now", "Redeem now")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDiagnostics ? (
        <div className="max-w-6xl mx-auto px-4 mb-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 dark:bg-gray-900/60 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {tr("rewards_diagnostics", "Rewards diagnostics")}
              </p>
              <span
                className={`text-xs font-semibold ${diagnostics.sseStatus === "connected" ? "text-emerald-600" : diagnostics.sseFallbackActive || diagnostics.sseStatus === "connecting" ? "text-amber-600" : "text-rose-600"}`}
              >
                {diagnostics.sseStatus === "connected"
                  ? tr("live_connected", "Connected")
                  : diagnostics.sseFallbackActive
                    ? tr("live_polling", "Polling fallback")
                    : diagnostics.sseStatus === "connecting"
                      ? tr("connecting", "Connecting")
                      : tr("offline", "Offline")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {diagnosticsItems.map((item) => (
                <span
                  key={item.key}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${item.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"}`}
                >
                  {item.ok ? "o" : "-"}
                  {item.label}
                  {item.hint ? ` - ${item.hint}` : ""}
                </span>
              ))}
            </div>
            {lastSseUpdate ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                {tr("last_update", "Last update")}: {new Date(lastSseUpdate).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showMobileInviteCta ? (
        <div className="fixed bottom-4 left-0 right-0 px-4 z-50 md:hidden">
          <Button
            type="button"
            onClick={shareReferral}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {tr("invite_friends", "Invite friends")}
          </Button>
        </div>
      ) : null}

      {!shareDisabled ? (
        <div className="hidden md:block fixed bottom-6 right-6 z-50">
          <Button
            type="button"
            onClick={shareReferral}
            className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center"
            title={tr("invite_friends", "Invite friends")}
          >
            <Share2 className="w-5 h-5" />
            <span className="sr-only">{tr("invite_friends", "Invite friends")}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
};
var Te = RewardsPage;

export { Te as default };



