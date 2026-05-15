import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Gift,
  Star,
  Users,
  Zap,
  TrendingUp,
  Share2,
  Award,
  Crown,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import api from "../lib/api";
import { buildApiPath } from "@/lib/networkConfig";
import {
  getUserId,
  isAuthenticated,
} from "@/utils/authStorage";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTrustScore, normalizeTrustPayload } from "@/hooks/useTrustScore";
import {
  emitCoinBalanceUpdated,
  subscribeCoinBalanceUpdated,
  subscribeSubscriptionUpdated,
} from "@/utils/appStateEvents";
import {
  RewardsActivity,
  RewardsEarn,
  RewardsHero,
  RewardsImpactDashboard,
  RewardsLeaderboard,
  RewardsMilestones,
  RewardsOverview,
  RewardsRedeem,
  RewardsReferrals,
} from "@/components/rewards/RewardsSections";
import { shareInvite } from "@/services/nativeShareService";
import { Capacitor } from "@capacitor/core";

const REWARD_ACTIVITY_LIMIT = 50;
const DEFAULT_SECTION_KEY_BY_TAB = {
  overview: "dashboard",
  earn: "earn",
  referrals: "referrals",
  activity: "activity",
};
const SECTION_TAB_BY_KEY = {
  dashboard: "overview",
  achievements: "overview",
  benefits: "overview",
  earn: "earn",
  challenges: "earn",
  referrals: "referrals",
  redeem: "activity",
  activity: "activity",
  leaderboard: "activity",
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

const normalizePlan = (value) => {
  if (!value) return "";
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("premium")) return "premium";
  if (normalized.includes("silver")) return "silver";
  if (normalized.includes("bronze")) return "bronze";
  if (normalized.includes("basic") || normalized.includes("free")) return "basic";
  return normalized;
};

const RewardsPage = () => {
  const [rewardsUser, setRewardsUser] = useState(null),
    [subscriptionState, setSubscriptionState] = useState({
      loading: true,
      error: "",
      currentPlan: "",
      subscription: null,
    }),
    [referralChain, setReferralChain] = useState([]),
    [referralTree, setReferralTree] = useState(null),
    [chainRules, setChainRules] = useState([]),
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
    [, setPublicWallLoading] = useState(!1),
    [publicWallLoaded, setPublicWallLoaded] = useState(!1),
    [referralLeaderboard, setReferralLeaderboard] = useState([]),
    [currentReferralRank, setCurrentReferralRank] = useState(null),
    [, setReferralLeaderboardLoading] = useState(!1),
    [referralLeaderboardLoaded, setReferralLeaderboardLoaded] = useState(!1),
    [secretCountdown, setSecretCountdown] = useState(""),
    [leaderboardCountdown, setLeaderboardCountdown] = useState(""),
    [rewardLog, setRewardLog] = useState([]),
    [, setRewardLogLoading] = useState(!1),
    [rewardLogLoaded, setRewardLogLoaded] = useState(!1),
    [coinBalance, setCoinBalance] = useState(null),
    [coinDelta, setCoinDelta] = useState(null),
    [coinHistory, setCoinHistory] = useState([]),
    [, setCoinHistoryLoading] = useState(!1),
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
    stableCheckInDayRef = useRef(0),
    stableCheckedInRef = useRef(null),
    { t: tFunc } = useTranslation(),
    navigate = useNavigate(),
    tr = useCallback(
      (key, fallback, options = {}) =>
        tFunc(key, { defaultValue: fallback, ...options }),
      [tFunc],
    ),
    { toast: toast } = useToast(),
    { user: authUser, refreshAuth: refreshAuthFromContext } = useAuth(),
    isAuthed = useMemo(() => isAuthenticated(authUser), [authUser]),
    currentUserId = useMemo(() => getUserId(authUser), [authUser]),
    localTrustPayload = normalizeTrustPayload(
      rewardsUser?.trust ||
        ((rewardsUser?.trustScore ||
          rewardsUser?.trustLevel ||
          rewardsUser?.trustLabel ||
          rewardsUser?.risk_state ||
          rewardsUser?.under_review)
          ? {
              score:
                rewardsUser?.trustScore ??
                rewardsUser?.trust_score ??
                rewardsUser?.score,
              level: rewardsUser?.trustLevel ?? rewardsUser?.level,
              label: rewardsUser?.trustLabel ?? rewardsUser?.label,
              risk_state: rewardsUser?.risk_state,
              under_review: rewardsUser?.under_review,
            }
          : null),
    ),
    trustState = useTrustScore(
      currentUserId || rewardsUser?.user_id || rewardsUser?.userId,
      { enabled: !localTrustPayload },
    ),
    resolvedTrustState = localTrustPayload || trustState,
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
    loadSubscription = useCallback(
      async (signal) => {
        const isAuthed = isAuthenticated(authUser);
        const userId = getUserId(authUser);
        if (!isAuthed || !userId) {
          setSubscriptionState({
            loading: false,
            error: "",
            currentPlan: authUser?.current_plan || "",
            subscription: null,
          });
          return;
        }
        setSubscriptionState((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const response = await api.get(
            "/subscriptions/my",
            signal ? { signal } : undefined,
          );
          if (signal?.aborted) return;
          const payload = response?.data ?? response ?? {};
          setSubscriptionState({
            loading: false,
            error: "",
            currentPlan: payload?.currentPlan || payload?.current_plan || "",
            subscription: payload?.subscription || null,
          });
        } catch (err) {
          if (signal?.aborted) return;
          setSubscriptionState({
            loading: false,
            error: "Unable to load subscription",
            currentPlan: authUser?.current_plan || "",
            subscription: null,
          });
        }
      },
      [authUser],
    ),
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
      [tr],
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
        t || setIsLoading(!0), setErrorObj(null);
        try {
          const u = await api.get("/rewards");
          if (u) {
            setRewardsUser(u.user || null);
            setReferralChain(Array.isArray(u.referralChain) ? u.referralChain : []);
            setReferralTree(u.referralTree || null);
            setChainRules(Array.isArray(u.chainRules) ? u.chainRules : []);
          }
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
              fallback: "Failed to fetch rewards",
            });
        } finally {
          t || setIsLoading(!1);
        }
      },
      [isAuthed, attemptAuthRefresh],
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
                "Failed to load rewards progress",
            });
          }
          setEngagement(null);
        } finally {
          setEngagementLoaded(!0);
          t || setEngagementLoading(!1);
        }
      },
      [isAuthed],
    );
  const errorMessage = resolveMessage(errorObj);
  const engagementErrorMessage = resolveMessage(engagementError);
  const redeemDialogErrorMessage = resolveMessage(redeemDialogError);
  useEffect(
    () =>
      isAuthed
        ? subscribeCoinBalanceUpdated(() => {
            fetchRewards({ silent: !0, allowRetry: !1 });
            fetchEngagement({ silent: !0 });
          })
        : undefined,
    [isAuthed, fetchRewards, fetchEngagement],
  );
  const scrollToSection = useCallback((sectionKey, options = {}) => {
    if (typeof document === "undefined") {
      return false;
    }

    const targetId = SECTION_ID_BY_KEY[sectionKey];
    if (!targetId) {
      return false;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return false;
    }

    target.scrollIntoView({
      behavior: options.behavior || "smooth",
      block: "start",
    });
    return true;
  }, []);
  const openSection = useCallback(
    (sectionKey) => {
      const nextTab = SECTION_TAB_BY_KEY[sectionKey];
      if (!nextTab) {
        return;
      }

      if (activeTab === nextTab && sectionKey === activeSectionKey) {
        scrollToSection(sectionKey);
        return;
      }

      pendingSectionScrollRef.current = sectionKey;
      setActiveSectionKey(sectionKey);
      if (activeTab !== nextTab) {
        setActiveTab(nextTab);
      }
    },
    [activeTab, activeSectionKey, scrollToSection],
  );
  useEffect(() => {
    document.title = "MHub - Rewards";
    return () => {
      document.title = "MHub";
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSubscription(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadSubscription]);

  useEffect(
    () =>
      subscribeSubscriptionUpdated(() => {
        loadSubscription();
        fetchRewards({ silent: true });
      }),
    [loadSubscription, fetchRewards],
  );

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
      setTabDataLoaded((current) => {
        const next = { ...current, [activeTab]: true };
        if (activeTab === "activity") {
          next.leaderboard = true;
          next.redeem = true;
        }
        if (activeTab === "overview") {
          next.milestones = true;
        }
        return next;
      });
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
      const scrolled = scrollToSection(pendingSectionKey);
      if (!scrolled) {
        window.setTimeout(() => {
          scrollToSection(pendingSectionKey, { behavior: "auto" });
        }, 80);
      }
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeTab, activeSectionKey, scrollToSection]),
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
    if (!isAuthed || !tabDataLoaded.leaderboard) return;
    let t = !0;
    (async () => {
      try {
        setPublicWallLoading(!0);
        const s = await api.get("/public-wall", { skipActiveAppFilter: true });
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
    shareReferral = async () => {
      const t = `${window.location.origin}/signup?ref=${r?.referralCode}`;
      try {
        // Use Capacitor native share (Android/iOS) with fallback to Web Share API
        await shareInvite({
          code: r?.referralCode || "",
          message: tr("use_my_referral_code", "Use my referral code"),
        });
      } catch {
        // Fallback to clipboard
        copyToClipboard(t, tr("referral_link", "Referral link"));
      }
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
    shareSms = async () => {
      const t = getReferralShareLink();
      if (!t || typeof window === "undefined") return;
      const body = `${tr("referral_share_text", "Join MHub with my referral link and earn bonus coins!")} ${t}`;
      // On Android native, use Capacitor share for SMS
      if (Capacitor.isNativePlatform()) {
        try {
          await shareInvite({ code: t, message: body });
          return;
        } catch { /* fall through to SMS scheme */ }
      }
      const s = encodeURIComponent(body);
      window.location.href = `sms:?&body=${s}`;
    },
    copyReferralLink = () => {
      const t = getReferralShareLink();
      if (!t) return;
      copyToClipboard(t, tr("referral_link", "Referral link"));
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
          skipActiveAppFilter: true,
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
            f?.response?.data?.error || "Failed to load posts for redemption.",
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
            "min-h-screen flex items-center justify-center mhub-premium-page bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        {
          className:
            "bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-center max-w-md dark:bg-slate-900/95 dark:border dark:border-gray-700 dark:text-center",
        },
        React.createElement(
          "div",
          {
            className:
              "w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center dark:bg-gradient-to-br",
          },
          React.createElement(Gift, { className: "w-10 h-10 text-white dark:text-white" }),
        ),
        React.createElement(
          "h2",
          { className: "text-3xl font-bold text-gray-900 dark:text-white mb-4 dark:text-gray-100" },
          tFunc("rewards_referrals"),
        ),
        React.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-300 text-lg mb-4 dark:text-gray-200" },
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
                "bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition dark:bg-gradient-to-r dark:text-white",
            },
            tFunc("login_to_continue"),
          ),
          React.createElement(
            Link,
            {
              to: "/signup",
              className:
                "border-2 border-blue-200 text-blue-700 dark:text-blue-200 text-lg px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-white/10 transition dark:border-2 dark:border-blue-600/40 dark:text-blue-300 dark:hover:bg-blue-950/20",
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
            "min-h-screen flex items-center justify-center mhub-premium-page bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        { className: "text-center dark:text-center" },
        React.createElement("div", {
          className:
            "w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4 dark:border-4 dark:border-blue-500/40 dark:border-t-transparent",
        }),
        React.createElement(
          "p",
          { className: "text-gray-600 font-medium dark:text-gray-200" },
          tFunc("loading"),
        ),
      ),
    );
  if (errorMessage)
    return React.createElement(
      "div",
      {
          className:
            "min-h-screen flex items-center justify-center mhub-premium-page bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pb-28 px-4 dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        { className: "text-center max-w-sm mx-auto dark:text-center" },
        React.createElement(
          "div",
          { className: "w-20 h-20 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-200/60 dark:border-red-500/20 shadow-lg shadow-red-100/30 dark:shadow-none dark:bg-gradient-to-br dark:border dark:border-red-600/60" },
          React.createElement(AlertCircle, { className: "w-9 h-9 text-red-500 dark:text-red-400 dark:text-red-300" }),
        ),
        React.createElement(
          "h3",
          { className: "text-xl font-bold text-gray-900 dark:text-white mb-2 dark:text-gray-100" },
          tr("rewards_error_title", "Unable to load rewards"),
        ),
        React.createElement(
          "p",
          { className: "text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed dark:text-gray-300" },
          errorMessage,
        ),
        React.createElement(
          "div",
          { className: "flex flex-wrap justify-center gap-3" },
          React.createElement(
            Button,
            { type: "button", className: "bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 h-11 font-semibold shadow-lg shadow-blue-500/20 dark:bg-blue-700/40 dark:hover:bg-blue-700/40 dark:text-white", onClick: () => setRefreshCounter((t) => t + 1) },
            tr("try_again", "Try again"),
          ),
          React.createElement(
            Button,
            {
              type: "button",
              variant: "outline",
              className: "rounded-xl px-6 h-11",
              onClick: () => navigate("/all-posts"),
            },
            tr("browse_listings", "Browse listings"),
          ),
        ),
      ),
    );
  if (!rewardsUser)
    return React.createElement(
      "div",
      {
          className:
            "min-h-screen flex items-center justify-center mhub-premium-page bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        {
          className:
            "max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-lg text-center dark:border dark:text-center",
        },
        React.createElement(
          "h2",
          { className: "text-xl font-bold text-slate-800 dark:text-slate-100 mb-2" },
          tr("rewards_profile_unavailable", "Rewards profile unavailable"),
        ),
        React.createElement(
          "p",
          { className: "text-sm text-slate-600 dark:text-slate-300 mb-5 dark:text-slate-200" },
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
  const membershipRawPlan =
    subscriptionState.currentPlan ||
    subscriptionState.subscription?.planName ||
    rewardsUser?.membershipPlan ||
    rewardsUser?.current_plan ||
    authUser?.current_plan ||
    "";
  const normalizedMembershipPlan = normalizePlan(membershipRawPlan);
  const isPlanLoading = subscriptionState.loading && !normalizedMembershipPlan;
  const membershipPlanKey = normalizedMembershipPlan || "basic";
  const membershipPlanLabelMap = {
    premium: tr("premium", "Premium"),
    silver: tr("silver", "Silver"),
    bronze: tr("bronze", "Bronze"),
    basic: tr("basic_plan", "Basic"),
  };
  const membershipPlanLabel = isPlanLoading
    ? tr("loading_plan", "Checking plan")
    : membershipPlanLabelMap[membershipPlanKey] || tr("basic_plan", "Basic");
  const membershipPlanBadgeMap = {
    premium: "bg-amber-500/90 text-white",
    silver: "bg-blue-500/90 text-white",
    bronze: "bg-orange-500/90 text-white",
    basic: "bg-slate-500/70 text-white",
  };
  const membershipPlanLightBadgeMap = {
    premium:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    silver:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    bronze:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
    basic:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200",
  };
  const membershipPlanBadgeClass =
    (isPlanLoading
      ? "bg-white/25 text-white border-0"
      : membershipPlanBadgeMap[membershipPlanKey]) ||
    membershipPlanBadgeMap.basic;
  const membershipPlanLightBadgeClass =
    (isPlanLoading
      ? "bg-slate-100 text-slate-500 dark:bg-slate-900/40 dark:text-slate-300"
      : membershipPlanLightBadgeMap[membershipPlanKey]) ||
    membershipPlanLightBadgeMap.basic;
  const isBasicPlan = membershipPlanKey === "basic" && !isPlanLoading;
  const xpCurrent = Number(r.xpCurrent || 0),
    xpRequired = Number(r.xpRequired || 0),
    xpProgressPercent = xpRequired
      ? Math.min((xpCurrent / xpRequired) * 100, 100)
      : 0,
    xpRemaining = Math.max(0, xpRequired - xpCurrent),
    visitStreak = Number(r.visitStreak ?? r.streak ?? 0),
    postStreak = Number(r.postStreak || 0),
    maxStreak = Math.max(visitStreak, postStreak),
    qualifiedReferrals = Number(r.qualifiedReferrals ?? r.successfulRefs ?? 0),
    totalReferrals = Number(r.totalReferrals || 0),
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
    chainEarnedPoints = Number(r.chainEarnedPoints || 0),
    chainPotentialPoints = Number(r.potentialReferralPoints || 0),
    nextStreakTarget = [7, 14, 30].find((t) => maxStreak < t) || 30,
    streakProgress = nextStreakTarget
      ? Math.min(100, Math.round((maxStreak / nextStreakTarget) * 100))
      : 0,
    displayCoins = coinBalance !== null ? coinBalance : r.totalCoins,
    currentLevel = Number(r.level || 1),
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
    activityStats = r.activityStats || {},
    salesCount = Number(activityStats.salesCount || 0),
    referralsCount = Number(activityStats.referralsCount || 0),
    profileCompleted = Boolean(r.profileComplete),
    hasPosted = Boolean(r.hasPosted),
    canShareExistingPost =
      hasPosted || Number(activityStats.postsCount || 0) > 0,
    goldOrBetter = r.rank === "Gold" || r.rank === "Platinum",
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
    currentCheckInDay = (() => {
      const reportedDay = Number(dailyCheckInStatus?.currentDay || 0);
      if (Number.isFinite(reportedDay) && reportedDay > 0) {
        stableCheckInDayRef.current = reportedDay;
      } else if (!stableCheckInDayRef.current) {
        stableCheckInDayRef.current = Math.max(1, Math.min(7, visitStreak || 1));
      }
      return stableCheckInDayRef.current || Math.max(1, Math.min(7, visitStreak || 1));
    })(),
    hasCheckedInToday = (() => {
      const reported = dailyCheckInStatus?.hasCheckedInToday;
      if (typeof reported === "boolean") {
        stableCheckedInRef.current = reported;
      } else if (stableCheckedInRef.current == null) {
        stableCheckedInRef.current = Number(activityStats.visitsToday || 0) > 0;
      }
      return stableCheckedInRef.current ?? Number(activityStats.visitsToday || 0) > 0;
    })(),
    leaderboardHistory = Array.isArray(r.leaderboard?.history)
      ? r.leaderboard.history
      : [],
    nextLeaderboardPayout = r.leaderboard?.nextPayoutAt || "",
    lastLeaderboardPayout = r.leaderboard?.lastPayoutAt || "",
    challengeConfigs = [
      {
        key: "invite",
        title: tr("invite_a_friend", "Invite a friend"),
        desc: tr(
          "challenge_invite_desc",
          "Share your referral link or code to unlock referral rewards.",
        ),
        reward: 50,
        rewardLabel: null,
        completed: Number(activityStats.referralsToday || 0) > 0,
        cta: tr("share_now", "Share Now"),
        onClick: shareReferral,
        visibleWhen: true,
        source: "referral_activity",
      },
      {
        key: "visit",
        title: tr("visit_today", "Visit today"),
        desc: tr(
          "challenge_visit_desc",
          "Open the marketplace today to keep your streak alive.",
        ),
        reward: 2,
        rewardLabel: null,
        completed: Number(activityStats.visitsToday || 0) > 0,
        cta: tr("browse_listings", "Browse listings"),
        onClick: () => navigate("/all-posts"),
        visibleWhen: true,
        source: "visit_activity",
      },
      {
        key: "post",
        title: tr("post_today", "Post today"),
        desc: tr(
          "challenge_post_desc",
          "Create one fresh listing to keep coins and visibility moving.",
        ),
        reward: 5,
        rewardLabel: null,
        completed: Number(activityStats.postsToday || 0) > 0,
        cta: tr("start_posting", "Start Posting"),
        onClick: () => navigate("/post_add"),
        visibleWhen: true,
        source: "post_activity",
      },
      {
        key: "share_post",
        title: tr("share_post", "Share post"),
        desc: tr(
          "challenge_share_post_desc",
          "Share one of your posts to bring more views back to your listing.",
        ),
        reward: null,
        rewardLabel: tr("visibility_boost", "Visibility boost"),
        completed: false,
        cta: canShareExistingPost
          ? tr("share_post", "Share post")
          : tr("start_posting", "Start Posting"),
        onClick: () => navigate(canShareExistingPost ? "/my-home" : "/post-welcome"),
        visibleWhen: true,
        source: "post_share_flow",
      },
      {
        key: "complete_profile",
        title: tr("complete_your_profile", "Complete your profile"),
        desc: tr(
          "challenge_complete_profile_desc",
          "Finish your profile details so buyers and sellers trust you faster.",
        ),
        reward: null,
        rewardLabel: tr("trust_boost", "Trust boost"),
        completed: profileCompleted,
        cta: tr("edit_profile", "Edit Profile"),
        onClick: () => navigate("/profile?tab=personal&edit=1"),
        visibleWhen: true,
        source: "profile_state",
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
        visibleWhen: true,
        source: "sales_activity",
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
        visibleWhen: true,
        source: "purchase_activity",
      },
      {
        key: "level",
        title: tr("reach_next_level", "Reach next level"),
        desc: tr(
          "challenge_level_desc",
          "Earn XP from daily activity, sales, and referrals to level up.",
        ),
        reward: 25,
        rewardLabel: null,
        completed: xpRemaining === 0,
        cta: tr("view_benefits", "View benefits"),
        onClick: () => openSection("benefits"),
        visibleWhen: true,
        source: "level_progress",
      },
    ],
    dailyChallenges = challengeConfigs.filter(
      (challenge) => challenge.visibleWhen !== false,
    ),
    visibleChallenges = showAllChallenges
      ? dailyChallenges
      : dailyChallenges.slice(0, 3),
    milestones = [
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
        key: "five_referrals",
        icon: "\uD83D\uDC65",
        title: tr("five_referrals", "Five Referrals"),
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
        title: tr("seven_day_streak", "Seven Day Streak"),
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
        meta: `${tr("rewards_rank", "Rewards rank")}: ${
          r.rank || tr("unknown", "Unknown")
        }`,
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
        promoLabel: tr("popular", "Popular"),
        helperLabel: tr("boosted_listings", "Boosted listings"),
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
        promoLabel: tr("limited", "Limited"),
        helperLabel: tr("trust_boost", "Trust boost"),
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
        promoLabel: tr("best_value", "Best Value"),
        helperLabel: tr("top_feed_priority", "Top feed priority"),
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
      label: tr("progress", "Progress"),
      icon: Sparkles,
    },
    {
      key: "earn",
      tab: "earn",
      label: tr("earn_challenges", "Earn & Challenges"),
      icon: Gift,
    },
    {
      key: "referrals",
      tab: "referrals",
      label: tr("referrals", "Referrals"),
      icon: Users,
    },
    {
      key: "activity",
      tab: "activity",
      label: tr("activity_hub", "Activity & Rewards"),
      icon: TrendingUp,
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
      : "border-slate-200 bg-white text-slate-600 hover:bg-white/95 hover:border-indigo-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white");
  return (
    <div
      className="rewards-surface min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-sky-50 to-purple-50 pb-28 page-fade-in dark:bg-gradient-to-br"
      style={{ "--top-nav-height": "0px" }}
    >
      <RewardsHero
        rewardsUser={rewardsUser}
        rankGradients={$}
        membershipPlanLabel={membershipPlanLabel}
        membershipPlanBadgeClass={membershipPlanBadgeClass}
        isBasicPlan={isBasicPlan}
        trustScore={resolvedTrustState?.score}
        trustLabel={resolvedTrustState?.label}
        trustLevel={resolvedTrustState?.level}
        riskState={resolvedTrustState?.riskState}
        underReview={resolvedTrustState?.underReview}
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
        className="max-w-6xl mx-auto px-4 mt-3 sm:mt-4 pb-6 relative z-10 space-y-5 scroll-mt-24"
      >
        <RewardsImpactDashboard
          displayCoins={displayCoins}
          coinDelta={coinDelta}
          nextRewardLabel={nextRewardLabel}
          nextRewardProgress={nextRewardProgress}
          nextRewardRemaining={nextRewardRemaining}
          engagementReady={engagementReady}
          hasCheckedInToday={hasCheckedInToday}
          currentCheckInDay={currentCheckInDay}
          dailyCheckInLoading={dailyCheckInLoading}
          onDailyCheckIn={handleDailyCheckIn}
          spinStatus={spinStatus}
          spinLoading={spinLoading}
          onSpin={handleSpinWheel}
          scratchStatus={scratchStatus}
          scratchLoading={scratchLoading}
          onScratch={handleScratchCard}
          referralCode={referralCode}
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
          referralGoal={referralGoal}
          referralReward={referralReward}
          referralDisplay={referralDisplay}
          referralProgressPercent={referralProgressPercent}
          milestoneEligible={milestoneEligible}
          milestoneClaimed={milestoneClaimed}
          onClaimMilestone={handleClaimMilestone}
          onOpenRedeem={() => openSection("redeem")}
          tr={tr}
        />

        <div className="w-full">
          <div
            className="rewards-tabs-sticky sticky z-30 mb-4"
            style={{ top: "calc(var(--top-nav-height, 0px) + 12px)" }}
          >
            <div className="rounded-[24px] border border-white/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl shadow-[0_12px_28px_rgba(15,23,42,0.12)] px-2.5 py-2 dark:border dark:border-white/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  {tr("jump_to_section", "Jump to section")}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-300">
                  {tr("sticky_tabs_hint", "Scroll to switch")}
                </span>
              </div>

              <div
                role="navigation"
                aria-label={tr("rewards_tabs", "Rewards sections")}
                className="rewards-tab-bar mt-2 w-full flex gap-1.5 overflow-x-auto rounded-[18px] bg-white/70 dark:bg-slate-900/60 p-1.5 shadow-none border border-slate-200/60 dark:border-slate-700/50 scrollbar-hide dark:bg-slate-900/70 dark:border dark:border-slate-700/60"
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
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="space-y-4">
              <RewardsOverview
                rewardsUser={rewardsUser}
                membershipPlanLabel={membershipPlanLabel}
                membershipPlanBadgeClass={membershipPlanLightBadgeClass}
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
              <RewardsMilestones
                levelBenefits={levelBenefits}
                currentLevel={currentLevel}
                milestones={milestones}
                onOpenAllLevels={() => navigate("/tier-selection")}
                tr={tr}
              />
            </div>
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
              referralTree={referralTree}
              chainRules={chainRules}
              onBrowseListings={() => navigate("/all-posts")}
              tr={tr}
              tFunc={tFunc}
            />
          ) : null}

          {activeTab === "activity" ? (
            <div className="space-y-4">
              <RewardsRedeem
                redeemOptions={redeemOptions}
                availableCoins={availableCoins}
                redeemProcessing={redeemProcessing}
                onOpenRedeemDialog={openRedeemDialog}
                onOpenEarn={() => openSection("earn")}
                tr={tr}
              />
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
            </div>
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
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 dark:border dark:bg-slate-950">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300 dark:text-slate-200">
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
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">{availableCoins}</span>
              </div>
            </div>

            {redeemDialogReward?.requiresPost ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-200">
                  {tr("select_listing", "Select a listing")}
                </p>
                {redeemDialogLoading ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-200">{tr("loading", "Loading...")}</p>
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
                  <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-200">
                    {tr(
                      "no_active_posts",
                      "No active posts available for redemption.",
                    )}
                  </p>
                )}
              </div>
            ) : null}

            {redeemDialogErrorMessage ? (
              <p className="text-xs text-rose-500 dark:text-rose-300">{redeemDialogErrorMessage}</p>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 dark:bg-indigo-700/40 dark:hover:bg-indigo-700/40 dark:text-white"
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
          <div className="rounded-2xl border border-slate-200 bg-white/90 dark:bg-gray-900/60 px-4 py-3 shadow-sm dark:border dark:border-slate-700 dark:bg-slate-900/90">
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
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg dark:bg-indigo-700/40 dark:hover:bg-indigo-700/40 dark:text-white"
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
            className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center dark:bg-indigo-700/40 dark:hover:bg-indigo-700/40 dark:text-white"
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
