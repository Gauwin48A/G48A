import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { useToast } from "@/hooks/use-toast";
import { useCategoryMode } from "@/context/CategoryModeContext";
import { buildActiveAppMatcher, matchesCategoryModeItem } from "@/utils/categoryModeFilters";
import {
  Bell,
  ArrowLeft,
  Check,
  Trash2,
  Package,
  DollarSign,
  Shield,
  Heart,
  AlertCircle,
  MessageCircle,
  Gift,
  ChevronRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Star,
  Zap,
  Clock,
  CheckCheck,
  X as XIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import { socket } from "@/lib/socket";
import { navigateBack } from "@/utils/navigation";
import { removeAllDeliveredNotifications } from "@/services/nativePushService";
import { impactLight } from "@/services/nativeHapticsService";

const KNOWN_ROUTES = [
  "/all-posts",
  "/post/",
  "/listing/",
  "/bought-posts",
  "/sold-posts",
  "/my-home",
  "/profile",
  "/tier-selection",
  "/chat",
  "/rewards",
  "/wishlist",
  "/payment",
  "/offers",
  "/notifications",
  "/for-you",
  "/categories",
  "/search",
];

const POLL_INTERVAL_MS = 30000;
const PAGE_LIMIT = 30;

const resolveNotificationPath = (rawPath) => {
  if (!rawPath) return "/notifications";
  const path = String(rawPath).trim().startsWith("/")
    ? String(rawPath).trim()
    : `/${String(rawPath).trim()}`;
  if (path.startsWith("/my-recommendations")) {
    return "/for-you";
  }
  return path.startsWith("/orders")
    ? "/bought-posts"
    : path.startsWith("/wallet")
      ? "/payment"
      : path.startsWith("/messages")
        ? "/chat"
        : path.startsWith("/post/") ||
            KNOWN_ROUTES.some((route) =>
              route.endsWith("/")
                ? path.startsWith(route)
                : path === route || path.startsWith(`${route}/`),
            )
          ? path
          : "/all-posts";
};

const getIconCategory = (notification) => {
  const category = String(
    notification.icon || notification.icon_category || notification.type || ""
  ).toLowerCase();
  return category.includes("order") ||
    category.includes("sale") ||
    category.includes("package")
    ? "package"
    : category.includes("payment") ||
        category.includes("wallet") ||
        category.includes("money")
      ? "money"
      : category.includes("security")
        ? "security"
        : category.includes("message") ||
            category.includes("chat") ||
            category.includes("inquiry")
          ? "message"
          : category.includes("gift") ||
              category.includes("promo") ||
              category.includes("reward")
            ? "gift"
            : category.includes("heart") || category.includes("like")
              ? "heart"
              : category.includes("star") ||
                  category.includes("subscription") ||
                  category.includes("tier")
                ? "star"
                : category.includes("trend") || category.includes("price")
                  ? "trending"
                  : category.includes("alert") || category.includes("warning")
                    ? "alert"
                    : "package";
};

const normalizeNotification = (notification) => {
  const id = notification.notification_id ?? notification.id;
  const readValue = notification.read ?? notification.is_read;
  return {
    ...notification,
    id: id,
    notification_id: id,
    read:
      readValue === true ||
      readValue === 1 ||
      readValue === "1" ||
      String(readValue).toLowerCase() === "true",
    icon: getIconCategory(notification),
    priority: notification.priority || "normal",
    created_at: notification.created_at || new Date().toISOString(),
  };
};

const dedupeNotifications = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item.notification_id ?? item.id ?? "").trim();
    if (!id || seen.has(id)) return false;
    return seen.add(id), true;
  });
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { activeApp, activeCategory, categories: categoryModeCategories } = useCategoryMode();
  const { density, setDensity } = usePageDensity("mhub_notifications_density");
  const densityClass = density === "compact" ? "mhub-compact" : "";
  const tr = useCallback(
    (key, fallback) => {
      const value = t(key);
      if (typeof value !== "string") return fallback;
      const trimmed = value.trim();
      if (!trimmed) return fallback;
      const normalized = trimmed.toLowerCase();
      const keyNormalized = String(key || "").trim().toLowerCase();
      if (!keyNormalized || normalized === keyNormalized) return fallback;
      return value;
    },
    [t],
  );
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const fetchCounterRef = useRef(0);
  const cursorRef = useRef(null);
  const notificationRefs = useRef(new Map());
  const userId = useMemo(() => getUserId(user), [user]);
  const isAuth = useMemo(() => isAuthenticated(user), [user]);
  const activeAppMatcher = useMemo(
    () => buildActiveAppMatcher(activeApp, categoryModeCategories),
    [activeApp, categoryModeCategories],
  );

  const getNotificationRef = useCallback((key) => {
    const safeKey = String(key || "");
    if (!safeKey) return null;
    if (!notificationRefs.current.has(safeKey)) {
      notificationRefs.current.set(safeKey, React.createRef());
    }
    return notificationRefs.current.get(safeKey);
  }, []);

  const fetchNotifications = useCallback(
    async ({ reset = false } = {}) => {
      if (!isAuth || !userId) {
        setNotifications([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        setErrorMessage("");
        return;
      }
      const counter = fetchCounterRef.current + 1;
      fetchCounterRef.current = counter;
      if (reset) {
        setIsLoading(true);
        setCursor(null);
        cursorRef.current = null;
        setHasMore(false);
        setSelectedIds(new Set());
      } else {
        setIsLoadingMore(true);
      }
      setErrorMessage("");
      try {
        const params = {
          userId,
          limit: PAGE_LIMIT,
          sort: sortBy,
        };
        if (searchQuery) params.search = searchQuery;
        const cursorValue = cursorRef.current;
        if (!reset && cursorValue) {
          params.cursor = cursorValue;
        }
        const response = await api.get("/notifications", { params });
        if (counter !== fetchCounterRef.current) return;
        const data = response?.data ?? response;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.notifications)
            ? data.notifications
            : [];
        const normalized = list.map(normalizeNotification);
        setNotifications((prev) =>
          reset
            ? dedupeNotifications(normalized)
            : dedupeNotifications([...prev, ...normalized]),
        );
        const nextCursor = data?.nextCursor || null;
        setCursor(nextCursor);
        cursorRef.current = nextCursor;
        setHasMore(Boolean(data?.hasMore));
        setServerUnreadCount(Number(data?.unreadCount || 0));
      } catch (err) {
        if (counter !== fetchCounterRef.current) return;
        console.error("[Notifications] Failed to load notifications:", err);
        if (reset) {
          setNotifications([]);
        }
        setErrorMessage(
          err?.message ||
            "Notifications could not be loaded. Please try again.",
        );
      } finally {
        if (counter === fetchCounterRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [isAuth, searchQuery, sortBy, userId],
  );

  useEffect(
    () => (
      authLoading || fetchNotifications({ reset: true }),
      () => {
        fetchCounterRef.current += 1;
      }
    ),
    [authLoading, fetchNotifications],
  );

  useEffect(() => {
    if (!isAuth || !userId) return;
    const debounce = setTimeout(() => {
      fetchNotifications({ reset: true });
    }, 250);
    return () => clearTimeout(debounce);
  }, [fetchNotifications, isAuth, searchQuery, sortBy, userId]);

  useEffect(() => {
    if (!isAuth || !userId) return;
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications({ reset: true });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications({ reset: true });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(intervalId);
    };
  }, [isAuth, userId, fetchNotifications]);

  useEffect(() => {
    if (!isAuth || !userId) return;
    const handleIncoming = (payload) => {
      if (!payload) return;
      const normalized = normalizeNotification(payload);
      setNotifications((prev) =>
        dedupeNotifications([normalized, ...prev]),
      );
      if (!normalized.read) {
        setServerUnreadCount((prev) => prev + 1);
      }
    };
    socket.on("notification", handleIncoming);
    return () => {
      socket.off("notification", handleIncoming);
    };
  }, [isAuth, userId]);

  const renderIcon = (iconType) => {
    const iconClass = "w-5 h-5 mhub-notif-icon";
    switch (iconType) {
      case "package":
        return <Package className={iconClass} />;
      case "money":
        return <DollarSign className={iconClass} />;
      case "gift":
        return <Gift className={iconClass} />;
      case "message":
        return <MessageCircle className={iconClass} />;
      case "security":
        return <Shield className={iconClass} />;
      case "heart":
        return <Heart className={iconClass} />;
      case "star":
        return <Star className={iconClass} />;
      case "trending":
        return <TrendingUp className={iconClass} />;
      case "alert":
        return <AlertCircle className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const diff = new Date() - date;
    const minutes = Math.floor(diff / (1e3 * 60));
    const hours = Math.floor(diff / (1e3 * 60 * 60));
    const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
    return minutes < 1
      ? "Just now"
      : minutes < 60
        ? `${minutes}m ago`
        : hours < 24
          ? `${hours}h ago`
          : days < 7
            ? `${days}d ago`
            : date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              });
  };

  const formatExpiresAt = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    const diff = date - new Date();
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / (1e3 * 60));
    const hours = Math.floor(diff / (1e3 * 60 * 60));
    const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
    return minutes < 60
      ? `Expires in ${minutes}m`
      : hours < 24
        ? `Expires in ${hours}h`
        : days < 7
          ? `Expires in ${days}d`
          : `Expires on ${date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}`;
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = String(name)
      .trim()
      .split(" ")
      .filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  };

  const resolveSender = (notification) => {
    if (notification?.sender) return notification.sender;
    const name = notification?.sender_name || notification?.senderName;
    const avatar_url = notification?.sender_avatar || notification?.senderAvatar;
    const verified =
      notification?.sender_verified ?? notification?.senderVerified ?? false;
    return name || avatar_url
      ? { name, avatar_url, verified: Boolean(verified) }
      : null;
  };

  const resolveThumbnail = (notification) => {
    const direct =
      notification?.thumbnail_url ||
      notification?.thumbnailUrl ||
      notification?.post?.thumbnail_url ||
      notification?.post?.thumbnailUrl;
    if (direct) return direct;
    const images = notification?.post?.images;
    return Array.isArray(images) && images.length > 0 ? images[0] : null;
  };

  const markAsRead = useCallback(
    async (notificationId) => {
      impactLight();
      const previousNotifications = notifications;
      const wasUnread = previousNotifications.find(
        (item) => (item.notification_id || item.id) === notificationId,
      )?.read === false;
      setNotifications((prev) =>
        prev.map((item) =>
          (item.notification_id || item.id) === notificationId
            ? { ...item, read: true, is_read: true }
            : item,
        ),
      );
      if (wasUnread) {
        setServerUnreadCount((prev) => Math.max(0, prev - 1));
      }
      try {
        await api.put(`/notifications/${notificationId}/read`, {
          userId: userId,
        });
      } catch (err) {
        console.error(
          "[Notifications] Failed to mark notification as read:",
          err,
        );
        setNotifications(previousNotifications);
        if (wasUnread) {
          setServerUnreadCount((prev) => prev + 1);
        }
      }
    },
    [notifications, userId],
  );

  const markAllAsRead = useCallback(async () => {
    impactLight();
    const previousNotifications = notifications;
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true, is_read: true })),
    );
    setServerUnreadCount(0);
    // Clear native notification tray on Android/iOS
    removeAllDeliveredNotifications().catch(() => {});
    toast({
      title: t("all_caught_up") || "All caught up!",
      description:
        t("mark_all_read_success") || "All notifications marked as read.",
    });
    try {
      await api.put("/notifications/mark-all-read", { userId: userId });
    } catch (err) {
      console.error("[Notifications] Failed to mark all as read:", err);
      setNotifications(previousNotifications);
      setServerUnreadCount(
        previousNotifications.reduce((total, item) => total + (item.read ? 0 : 1), 0),
      );
    }
  }, [notifications, userId, toast, t]);

  const deleteNotification = useCallback(
    async (notificationId) => {
      const previousNotifications = notifications;
      const previousSelectedIds = selectedIds;
      const wasUnread = previousNotifications.find(
        (item) => (item.notification_id || item.id) === notificationId,
      )?.read === false;
      setNotifications((prev) =>
        prev.filter(
          (item) => (item.notification_id || item.id) !== notificationId,
        ),
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
      if (wasUnread) {
        setServerUnreadCount((prev) => Math.max(0, prev - 1));
      }
      try {
        await api.delete(`/notifications/${notificationId}`, {
          data: { userId: userId },
        });
      } catch (err) {
        console.error("[Notifications] Failed to delete notification:", err);
        setNotifications(previousNotifications);
        setSelectedIds(previousSelectedIds);
        if (wasUnread) {
          setServerUnreadCount((prev) => prev + 1);
        }
      }
    },
    [notifications, selectedIds, userId],
  );

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const previousNotifications = notifications;
    const previousSelectedIds = selectedIds;
    const unreadRemoved = ids.reduce((count, id) => {
      const item = notifications.find(
        (entry) => (entry.notification_id || entry.id) === id,
      );
      return count + (item && !item.read ? 1 : 0);
    }, 0);
    setNotifications((prev) =>
      prev.filter(
        (item) => !selectedIds.has(item.notification_id || item.id),
      ),
    );
    setSelectedIds(new Set());
    if (unreadRemoved) {
      setServerUnreadCount((prev) => Math.max(0, prev - unreadRemoved));
    }
    const results = await Promise.allSettled(
      ids.map((id) =>
        api.delete(`/notifications/${id}`, { data: { userId: userId } }),
      ),
    );
    if (results.some((result) => result.status === "rejected")) {
      setNotifications(previousNotifications);
      setSelectedIds(previousSelectedIds);
      setServerUnreadCount(
        previousNotifications.reduce((total, item) => total + (item.read ? 0 : 1), 0),
      );
    }
  }, [notifications, selectedIds, userId]);

  const markSelectedAsRead = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const previousNotifications = notifications;
    const unreadSelected = ids.reduce((count, id) => {
      const item = notifications.find(
        (entry) => (entry.notification_id || entry.id) === id,
      );
      return count + (item && !item.read ? 1 : 0);
    }, 0);
    setNotifications((prev) =>
      prev.map((item) =>
        selectedIds.has(item.notification_id || item.id)
          ? { ...item, read: true, is_read: true }
          : item,
      ),
    );
    setSelectedIds(new Set());
    if (unreadSelected) {
      setServerUnreadCount((prev) => Math.max(0, prev - unreadSelected));
    }
    const results = await Promise.allSettled(
      ids.map((id) => api.put(`/notifications/${id}/read`)),
    );
    if (results.some((result) => result.status === "rejected")) {
      setNotifications(previousNotifications);
      setServerUnreadCount(
        previousNotifications.reduce((total, item) => total + (item.read ? 0 : 1), 0),
      );
    }
  }, [notifications, selectedIds]);

  const deleteAllNotifications = useCallback(async () => {
    const previousNotifications = notifications;
    const previousUnread = serverUnreadCount;
    setNotifications([]);
    setServerUnreadCount(0);
    setSelectedIds(new Set());
    toast({
      title: t("all_deleted") || "All notifications deleted",
      description: t("undo_available") || "You can undo this action.",
      action: (
        <button
          className="text-xs font-semibold underline"
          onClick={() => {
            setNotifications(previousNotifications);
            setServerUnreadCount(previousUnread);
          }}
        >
          {t("undo") || "Undo"}
        </button>
      ),
      duration: 6000,
    });
    try {
      await api.delete("/notifications", { data: { userId } });
    } catch (err) {
      setNotifications(previousNotifications);
      setServerUnreadCount(previousUnread);
    }
  }, [notifications, serverUnreadCount, userId, toast, t]);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const snoozeNotification = useCallback(
    async (notificationId, minutes = 60) => {
      const previousNotifications = notifications;
      const wasUnread = previousNotifications.find(
        (item) => (item.notification_id || item.id) === notificationId,
      )?.read === false;
      setNotifications((prev) =>
        prev.filter(
          (item) => (item.notification_id || item.id) !== notificationId,
        ),
      );
      if (wasUnread) {
        setServerUnreadCount((prev) => Math.max(0, prev - 1));
      }
      try {
        await api.patch(`/notifications/${notificationId}/snooze`, {
          minutes,
        });
        toast({
          title: t("snoozed") || "Snoozed",
          description:
            minutes >= 1440
              ? t("snoozed_day") || "Snoozed for 1 day."
              : t("snoozed_hour") || "Snoozed for 1 hour.",
        });
      } catch (err) {
        console.error("[Notifications] Failed to snooze:", err);
        setNotifications(previousNotifications);
        if (wasUnread) {
          setServerUnreadCount((prev) => prev + 1);
        }
      }
    },
    [notifications, t, toast],
  );

  const fetchPreferences = useCallback(async () => {
    if (!isAuth || !userId) return;
    setPrefsLoading(true);
    try {
      const response = await api.get("/notifications/preferences");
      const payload = response?.data ?? response;
      setPreferences(payload || null);
    } catch (err) {
      console.error("[Notifications] Failed to load preferences:", err);
    } finally {
      setPrefsLoading(false);
    }
  }, [isAuth, userId]);

  const updatePreferences = useCallback(
    async (next) => {
      if (!isAuth || !userId) return;
      setPreferences(next);
      try {
        const response = await api.put("/notifications/preferences", next);
        const payload = response?.data ?? response;
        setPreferences(payload || next);
      } catch (err) {
        console.error("[Notifications] Failed to update preferences:", err);
      }
    },
    [isAuth, userId],
  );

  const categoryFilteredNotifications = useMemo(() => {
    if (!activeCategory?.name && !activeAppMatcher?.activeApp) {
      return notifications;
    }
    return notifications.filter((item) => {
      const candidate = item?.post || item;
      if (!candidate) return true;
      const hasCategoryInfo = Boolean(
        candidate.category_group ||
          candidate.categoryGroup ||
          candidate.category_name ||
          candidate.categoryName ||
          candidate.category_id ||
          candidate.categoryId ||
          candidate.category,
      );
      if (!hasCategoryInfo) return true;
      return matchesCategoryModeItem(candidate, {
        activeCategory: activeCategory?.name ? activeCategory : null,
        activeAppMatcher,
      });
    });
  }, [notifications, activeCategory, activeAppMatcher]);

  const unreadCount = useMemo(() => {
    const localCount = categoryFilteredNotifications.reduce(
      (total, item) => total + (item.read ? 0 : 1),
      0,
    );
    if (activeCategory?.name || activeAppMatcher?.activeApp) {
      return localCount;
    }
    return serverUnreadCount || localCount;
  }, [categoryFilteredNotifications, serverUnreadCount, activeCategory, activeAppMatcher]);

  const handleNotificationClick = useCallback(
    (notification) => {
      const notificationId = notification.notification_id || notification.id;
      const rawPath = notification?.action?.path || "";
      const resolvedPath = resolveNotificationPath(rawPath);
      markAsRead(notificationId);
      const state = {
        source: "notifications",
        returnTo: "/notifications",
      };
      if (resolvedPath !== rawPath) {
        state.fromNotificationFallback = true;
        state.originalPath = rawPath;
      }
      navigate(resolvedPath, { state });
    },
    [markAsRead, navigate],
  );

  const filteredNotifications = useMemo(
    () =>
      categoryFilteredNotifications.filter((item) =>
        activeFilter === "unread"
          ? !item.read
          : activeFilter === "read"
            ? item.read
            : true,
      ),
    [activeFilter, categoryFilteredNotifications],
  );

  const selectedCount = selectedIds.size;
  const allFilteredSelected = useMemo(() => {
    if (!filteredNotifications.length) return false;
    return filteredNotifications.every((item) =>
      selectedIds.has(item.notification_id || item.id),
    );
  }, [filteredNotifications, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (!filteredNotifications.length) return prev;
      const shouldClear =
        filteredNotifications.every((item) =>
          prev.has(item.notification_id || item.id),
        );
      if (shouldClear) return new Set();
      return new Set(
        filteredNotifications.map(
          (item) => item.notification_id || item.id,
        ),
      );
    });
  }, [filteredNotifications]);

  const getDateGroupLabel = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return "This Week";
    if (diffDays < 30) return "This Month";
    return "Older";
  };

  const groupedNotifications = useMemo(() => {
    const groups = [];
    const seen = new Set();
    filteredNotifications.forEach((item) => {
      const label = getDateGroupLabel(item.created_at);
      if (!seen.has(label)) {
        seen.add(label);
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    });
    return groups;
  }, [filteredNotifications]);

  const groupCounts = useMemo(() => {
    const counts = new Map();
    filteredNotifications.forEach((item) => {
      const key = item.group_key || item.groupKey;
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [filteredNotifications]);

  useEffect(() => {
    if (showPreferences && !preferences && !prefsLoading) {
      fetchPreferences();
    }
  }, [fetchPreferences, preferences, prefsLoading, showPreferences]);

  // --- Auth loading state ---
  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center mhub-premium-page bg-slate-50 dark:bg-gray-950 dark:bg-slate-950 ${densityClass}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 opacity-20 animate-ping dark:bg-gradient-to-br" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 dark:bg-gradient-to-br">
              <Bell className="w-7 h-7 text-white animate-pulse dark:text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-400 tracking-wide dark:text-gray-300">
            {t("loading") || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // --- Not authenticated state ---
  if (!isAuth || !userId) {
    return (
      <div
        className={`min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4 dark:bg-gradient-to-br ${densityClass}`}
      >
        {/* Background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/[0.06] rounded-full blur-3xl dark:bg-[lue-500/[0.06]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/[0.06] rounded-full blur-3xl dark:bg-[ndigo-500/[0.06]" />
        </div>

        <div className="relative mhub-premium-surface rounded-3xl p-10 max-w-md w-full text-center border border-white/60 dark:border-white/10 shadow-2xl shadow-blue-500/[0.08] dark:text-center dark:border dark:border-white/60">
          {/* Decorative top gradient line */}
          <div className="absolute top-0 left-6 right-6 h-[3px] rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:bg-gradient-to-r" />

          {/* Lock icon with rings */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-200 dark:border-blue-500/20 animate-[spin_20s_linear_infinite] dark:border-2 dark:border-dashed dark:border-blue-600/40" />
            <div className="absolute inset-2 rounded-full border border-blue-100 dark:border-blue-500/10 dark:border dark:border-blue-600/40" />
            <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 dark:bg-gradient-to-br">
              <Bell className="w-8 h-8 text-white dark:text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight dark:text-gray-100">
            {t("login_required") || "Login Required"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-[15px] dark:text-gray-300">
            {t("please_login_to_continue") ||
              "Please sign in to view your notifications."}
          </p>
          <button
            onClick={() =>
              navigate("/login", { state: { returnTo: "/notifications" } })
            }
            className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold text-[15px] transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] dark:bg-gradient-to-r dark:text-white"
          >
            {t("sign_in") || "Sign In"}
          </button>
        </div>
      </div>
    );
  }

  // --- Loading state: Skeleton loader ---
  if (isLoading) {
    return (
      <div
        className={`min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 mhub-page-pad-bottom dark:bg-gradient-to-br ${densityClass}`}
      >
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 profile-hero-bg" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
        <div className="relative max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6 page-shell page-pad">
          <div className="mb-3 max-w-3xl text-left dark:text-left mhub-hero-card min-h-[132px] sm:min-h-[150px] rounded-2xl px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[34px]">
              <button
                type="button"
                onClick={() => navigateBack(navigate)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-white/30 transition"
                aria-label={tr("back", "Back")}
              >
                <ArrowLeft className="w-4 h-4" />
                {tr("back", "Back")}
              </button>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/80">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {tr("loading", "Loading")}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70">
                {tr("notifications_label", "Alerts")}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                  <Bell className="w-5 h-5 text-white dark:text-white" />
                </div>
                <h1 className="text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white">
                  {tr("notifications", "Notifications")}
                </h1>
              </div>
              <p className="text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80">
                {tr(
                  "notifications_subtitle",
                  "Stay on top of updates, offers, and order activity.",
                )}
              </p>
            </div>
          </div>
        </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pt-5">
          {/* Skeleton filter tabs */}
          <div className="mhub-premium-surface rounded-2xl p-1.5 mb-6 flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 h-10 rounded-xl bg-gray-200/50 dark:bg-white/5 animate-pulse dark:bg-gray-900/50"
              />
            ))}
          </div>
          {/* Skeleton subheader */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-28 bg-gray-200/60 dark:bg-white/5 rounded-lg animate-pulse dark:bg-gray-900/60" />
            <div className="h-8 w-32 bg-gray-200/40 dark:bg-white/5 rounded-xl animate-pulse dark:bg-gray-900/40" />
          </div>
          {/* Skeleton notification cards */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl mhub-premium-surface border-l-4 border-l-gray-200 dark:border-l-white/10 p-4 dark:border-l-4 dark:border-l-gray-200"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/5 to-transparent dark:bg-gradient-to-r" />
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gray-200/80 dark:bg-white/10 animate-pulse flex-shrink-0 dark:bg-gray-900/80" />
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="h-4 bg-gray-200/80 dark:bg-white/10 rounded-lg animate-pulse w-3/5 dark:bg-gray-900/80" />
                      <div className="h-5 bg-gray-100/80 dark:bg-white/5 rounded-full animate-pulse w-16 flex-shrink-0 dark:bg-gray-950/80" />
                    </div>
                    <div className="h-3 bg-gray-100/60 dark:bg-white/5 rounded-lg animate-pulse w-full dark:bg-gray-950/60" />
                    <div className="h-3 bg-gray-100/60 dark:bg-white/5 rounded-lg animate-pulse w-4/5 dark:bg-gray-950/60" />
                    <div className="h-8 bg-gray-100/50 dark:bg-white/5 rounded-xl animate-pulse w-28 mt-1 dark:bg-gray-950/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton stats */}
          <div className="grid grid-cols-3 gap-3 mt-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mhub-premium-surface rounded-2xl p-4 text-center dark:text-center">
                <div className="w-9 h-9 mx-auto mb-2.5 bg-gray-200/60 dark:bg-white/10 rounded-xl animate-pulse dark:bg-gray-900/60" />
                <div className="h-7 w-10 mx-auto bg-gray-200/60 dark:bg-white/10 rounded-lg animate-pulse mb-1.5 dark:bg-gray-900/60" />
                <div className="h-3 w-12 mx-auto bg-gray-100/50 dark:bg-white/5 rounded animate-pulse dark:bg-gray-950/50" />
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // --- Filter tabs config ---
  const filterTabs = [
    { key: "all", label: "All", count: notifications.length, icon: Sparkles },
    { key: "unread", label: "Unread", count: unreadCount, icon: Zap },
    {
      key: "read",
      label: "Read",
      count: notifications.length - unreadCount,
      icon: Check,
    },
  ];

  // --- Main content ---
  return (
    <div
      className={`min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 mhub-page-pad-bottom dark:bg-gradient-to-br ${densityClass}`}
    >
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-500/[0.04] dark:bg-blue-500/[0.08] rounded-full blur-3xl dark:bg-[lue-500/[0.04]" />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] rounded-full blur-3xl dark:bg-[ndigo-500/[0.04]" />
        <div className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] bg-purple-500/[0.03] dark:bg-purple-500/[0.05] rounded-full blur-3xl dark:bg-[urple-500/[0.03]" />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 profile-hero-bg" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fillOpacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6 page-shell page-pad">
          <div className="mb-3 max-w-3xl text-left dark:text-left mhub-hero-card min-h-[132px] sm:min-h-[150px] rounded-2xl px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[34px]">
              <button
                type="button"
                onClick={() => navigateBack(navigate)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:bg-white/30 transition"
                aria-label={tr("back", "Back")}
              >
                <ArrowLeft className="w-4 h-4" />
                {tr("back", "Back")}
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 shadow-[0_8px_18px_rgba(15,23,42,0.15)] hover:bg-white/25 transition"
                    aria-label="Delete selected notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 shadow-[0_8px_18px_rgba(15,23,42,0.15)] hover:bg-white/20 transition"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[clamp(9px,0.95vw,11px)] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1 dark:text-white/70">
                {tr("notifications_label", "Alerts")}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center dark:bg-slate-900/15">
                  <Bell className="w-5 h-5 text-white dark:text-white" />
                </div>
                <h1 className="text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white dark:text-white">
                  {tr("notifications", "Notifications")}
                </h1>
              </div>
              <p className="text-[clamp(12px,1.3vw,16px)] leading-[1.5] text-white/80 mt-1 dark:text-white/80">
                {tr(
                  "notifications_subtitle",
                  "Stay on top of updates, offers, and order activity.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main container */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-5">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex justify-end">
            <PageDensityToggle value={density} onChange={setDensity} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("search_notifications") || "Search notifications"}
              className="flex-1 h-10"
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200"
            >
              <option value="newest">{t("sort_newest") || "Newest"}</option>
              <option value="oldest">{t("sort_oldest") || "Oldest"}</option>
              <option value="priority">{t("sort_priority") || "Priority"}</option>
              <option value="unread">{t("sort_unread") || "Unread first"}</option>
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreferences((prev) => !prev)}
              className="h-10"
            >
              {t("preferences") || "Preferences"}
            </Button>
          </div>

            {showPreferences && (
              <div
                data-density="extra"
                className="mhub-premium-surface rounded-2xl p-4 border border-white/60 dark:border-white/[0.08]"
              >
              {prefsLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t("loading") || "Loading..."}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "email_enabled", label: t("email_alerts") || "Email alerts" },
                    { key: "push_enabled", label: t("push_alerts") || "Push alerts" },
                    { key: "sms_enabled", label: t("sms_alerts") || "SMS alerts" },
                    { key: "marketing_enabled", label: t("marketing_alerts") || "Marketing" },
                    { key: "order_updates_enabled", label: t("order_updates") || "Order updates" },
                    { key: "price_drop_enabled", label: t("price_drops") || "Price drops" },
                    { key: "message_enabled", label: t("message_alerts") || "Messages" },
                  ].map((pref) => (
                    <label
                      key={pref.key}
                      className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700/60 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <span>{pref.label}</span>
                      <Switch
                        checked={Boolean(preferences?.[pref.key])}
                        onCheckedChange={(checked) =>
                          updatePreferences({
                            ...preferences,
                            [pref.key]: checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Tabs — Premium pill bar */}
        <div className="mb-4 pt-1">
          <div className="mhub-premium-surface rounded-2xl p-1.5 shadow-sm border border-white/60 dark:border-white/[0.06] dark:border dark:border-white/60" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex gap-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  aria-pressed={activeFilter === tab.key}
                  className={`relative flex items-center gap-1.5 px-3.5 min-h-[40px] py-2 rounded-xl font-semibold text-[13px] whitespace-nowrap transition-all duration-300 flex-1 justify-center ${
                    activeFilter === tab.key
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <span
                    className={`ml-0.5 min-w-[20px] px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums transition-colors duration-200 ${
                      activeFilter === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="flex-1 text-sm leading-relaxed">
              {errorMessage}
            </div>
            <button
              type="button"
              onClick={() => fetchNotifications({ reset: true })}
              className="text-xs font-semibold text-rose-700 dark:text-rose-200 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Subheader: unread count + mark all */}
        <div className="flex flex-wrap items-center justify-between mb-4 px-1 gap-2">
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 dark:bg-blue-800/30" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 dark:bg-blue-800/30" />
              </span>
            )}
            <p className="text-slate-500 dark:text-blue-300/80 text-sm font-medium dark:text-slate-300">
              {unreadCount > 0
                ? `${unreadCount} ${t("new_updates") || "new updates"}`
                : t("all_caught_up") || "You're all caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filteredNotifications.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3.5 min-h-[36px] py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all duration-200"
              >
                {allFilteredSelected
                  ? t("clear_selection") || "Clear selection"
                  : t("select_all") || "Select all"}
                {selectedCount > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-400">
                    ({selectedCount})
                  </span>
                )}
              </button>
            )}
            {selectedIds.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={markSelectedAsRead}
                  className="flex items-center gap-1.5 px-3.5 min-h-[36px] py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full transition-all duration-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t("mark_selected_read") || "Mark selected"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3.5 min-h-[36px] py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-600/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("delete_selected") || "Delete selected"}
                </button>
              </>
            )}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3.5 min-h-[36px] py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500/20 rounded-full transition-all duration-200 active:scale-[0.97] dark:text-blue-300 dark:border dark:border-blue-600/40 dark:hover:bg-blue-800/30 dark:hover:text-white"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t("mark_all_as_read") || "Mark all as read"}
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
                className="flex items-center gap-1.5 px-3.5 min-h-[36px] py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-600/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("delete_all") || "Delete all"}
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {groupedNotifications.length === 0 ? (
            /* Empty state — Premium illustration */
            <div className="pt-12 pb-[calc(var(--bottom-nav-height)+var(--bottom-nav-safe)+2rem)] text-center dark:text-center">
              {/* Concentric rings illustration */}
              <div className="relative w-36 h-36 mx-auto mb-10">
                {/* Outer rotating dashed ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-200/60 dark:border-blue-500/15 animate-[spin_25s_linear_infinite] dark:border-2 dark:border-dashed dark:border-blue-600/60" />
                {/* Middle ring */}
                <div className="absolute inset-3 rounded-full border border-indigo-100 dark:border-indigo-500/10 dark:border dark:border-indigo-600/40" />
                {/* Inner ring */}
                <div className="absolute inset-6 rounded-full border border-purple-100/80 dark:border-purple-500/10 dark:border dark:border-purple-600/80" />
                {/* Center icon container */}
                <div className="absolute inset-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 dark:bg-gradient-to-br">
                  <Bell className="w-10 h-10 text-white drop-shadow-sm dark:text-white" />
                </div>
                {/* Floating decorative dots */}
                <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-blue-400/40 animate-bounce dark:bg-blue-800/40" style={{ animationDelay: "0s", animationDuration: "3s" }} />
                <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-indigo-400/40 animate-bounce dark:bg-indigo-800/40" style={{ animationDelay: "1s", animationDuration: "3.5s" }} />
                <div className="absolute -bottom-1 left-1/3 w-2 h-2 rounded-full bg-purple-400/30 animate-bounce dark:bg-purple-800/30" style={{ animationDelay: "0.5s", animationDuration: "2.8s" }} />
                <div className="absolute top-1/4 -left-1 w-1.5 h-1.5 rounded-full bg-blue-300/40 animate-bounce dark:bg-blue-900/40" style={{ animationDelay: "1.5s", animationDuration: "3.2s" }} />
              </div>

              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight dark:text-gray-100">
                {activeFilter === "unread"
                  ? t("all_caught_up") || "All caught up!"
                  : t("no_notifications") || "No notifications"}
              </h3>
              <p className="text-slate-400 dark:text-gray-400 max-w-xs mx-auto leading-relaxed mb-6 text-[15px] dark:text-slate-300">
                {activeFilter === "unread"
                  ? t("read_all_notifications") ||
                    "Great job! You've read all your notifications."
                  : t("check_back_later") ||
                    "Check back later for updates and offers."}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/all-posts")}
                  className="mhub-btn-primary min-h-[48px] px-7 py-3 rounded-2xl text-sm font-bold transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.97]"
                >
                  Browse Listings
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/chat")}
                  className="min-h-[48px] px-7 py-3 rounded-2xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15 transition-all duration-300 active:scale-[0.97] hover:shadow-md dark:border-2 dark:border-gray-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-gray-950 dark:hover:border-gray-600"
                >
                  Open Chat
                </button>
              </div>
            </div>
          ) : (
            groupedNotifications.map((group, groupIdx) => (
              <div key={`group-${group.label}-${groupIdx}`} className="space-y-3">
                <div className="flex items-center gap-3 my-5 px-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap dark:text-slate-300">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-white/10 to-transparent dark:bg-gradient-to-r" />
                </div>
                <TransitionGroup component="div" className="space-y-3">
                  {group.items.map((notification, index) => {
                    const notificationId =
                      notification.notification_id || notification.id;
                    const itemKey = String(
                      notificationId || `${group.label}-${index}`,
                    );
                    const nodeRef = getNotificationRef(itemKey);
                    const sender = resolveSender(notification);
                    const senderName = sender?.name;
                    const senderAvatar = sender?.avatar_url;
                    const senderInitials = senderName ? getInitials(senderName) : "";
                    const thumbnail = resolveThumbnail(notification);
                    const postTitle = notification?.post?.title || notification?.post_title;
                    const expiresLabel = formatExpiresAt(
                      notification?.expires_at || notification?.expiresAt,
                    );
                    const groupKey =
                      notification?.group_key ||
                      notification?.groupKey ||
                      notification?.group ||
                      "";
                    const groupCount = groupKey ? groupCounts.get(groupKey) : 0;

                    return (
                      <CSSTransition
                        key={itemKey}
                        nodeRef={nodeRef}
                        timeout={{ enter: 240, exit: 200 }}
                        classNames="mhub-notif-item"
                        appear
                      >
                        <div
                          ref={nodeRef}
                          className={`mhub-notif-card ${notification.read ? "mhub-notif-card--read" : "mhub-notif-card--unread"} mhub-premium-surface group relative overflow-hidden rounded-2xl p-4 transition-all duration-300`}
                          data-variant={notification.icon}
                          data-read={notification.read ? "true" : "false"}
                        >
                          {!notification.read && (
                            <div className="absolute top-0 left-0 right-0 h-[2px] mhub-notif-accent-bar" />
                          )}
                          {notification.priority === "high" &&
                            !notification.read && (
                              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[length:200%_100%] animate-[gradientSlide_3s_linear_infinite] mhub-notif-priority-bar" />
                            )}
                          <div className="flex items-start gap-3.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(notificationId)}
                              onChange={(evt) => {
                                evt.stopPropagation();
                                toggleSelection(notificationId);
                              }}
                              aria-label="Select notification"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-900"
                            />
                            <div className="mhub-notif-icon-wrap w-10 h-10 rounded-xl flex items-center justify-center">
                              {renderIcon(notification.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {notification.title}
                                </h3>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                              </div>
                              {senderName && (
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {senderAvatar ? (
                                    <img
                                      src={senderAvatar}
                                      alt={senderName}
                                      className="w-4 h-4 rounded-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-semibold dark:bg-slate-800 dark:text-slate-200">
                                      {senderInitials}
                                    </span>
                                  )}
                                  <span className="truncate">{senderName}</span>
                                  {sender?.verified && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
                                      {t("verified") || "Verified"}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {expiresLabel && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300">
                                    <Clock className="w-3 h-3" />
                                    {expiresLabel}
                                  </span>
                                )}
                                {groupCount > 1 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border border-indigo-200 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-300">
                                    <Sparkles className="w-3 h-3" />
                                    {t("grouped") || "Grouped"} ×{groupCount}
                                  </span>
                                )}
                                {notification.action && (
                                  <button
                                    onClick={() =>
                                      handleNotificationClick(notification)
                                    }
                                    className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-white/10"
                                  >
                                    {notification.action.label}
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                                {!notification.read && (
                                  <button
                                    type="button"
                                    onClick={(evt) => {
                                      evt.stopPropagation();
                                      markAsRead(notificationId);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                    title="Mark as read"
                                    aria-label="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-300" />
                                  </button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(evt) => evt.stopPropagation()}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-white/10"
                                      title="Snooze"
                                      aria-label="Snooze notification"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onSelect={(evt) => {
                                        evt.preventDefault();
                                        evt.stopPropagation();
                                        snoozeNotification(notificationId, 60);
                                      }}
                                    >
                                      {t("snooze_1h") || "Snooze 1 hour"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(evt) => {
                                        evt.preventDefault();
                                        evt.stopPropagation();
                                        snoozeNotification(notificationId, 240);
                                      }}
                                    >
                                      {t("snooze_4h") || "Snooze 4 hours"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(evt) => {
                                        evt.preventDefault();
                                        evt.stopPropagation();
                                        snoozeNotification(notificationId, 1440);
                                      }}
                                    >
                                      {t("snooze_1d") || "Snooze 1 day"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <button
                                  type="button"
                                  onClick={(evt) => {
                                    evt.stopPropagation();
                                    deleteNotification(notificationId);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                                  title="Delete"
                                  aria-label="Delete notification"
                                >
                                  <XIcon className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-300" />
                                </button>
                              </div>
                            </div>
                            {thumbnail && (
                              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm flex-shrink-0">
                                <img
                                  src={thumbnail}
                                  alt={postTitle || notification.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CSSTransition>
                    );
                  })}
                </TransitionGroup>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={isLoadingMore}
              className="min-h-[44px] px-6 py-2 rounded-full text-sm font-semibold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingMore
                ? t("loading") || "Loading..."
                : t("load_more") || "Load more"}
            </button>
          </div>
        )}

        {/* Stats cards */}
        {notifications.length > 0 && (
          <div data-density="extra" className="grid grid-cols-3 gap-3 mt-10">
            {[
              { icon: Bell, label: t("total") || "Total", value: notifications.length, gradient: "from-blue-500 to-indigo-600", bgGradient: "from-blue-50 to-indigo-50", darkBg: "dark:from-blue-500/10 dark:to-indigo-500/10", shadow: "shadow-blue-500/15", labelColor: "text-blue-600/80 dark:text-blue-300/60" },
              { icon: Zap, label: t("unread") || "Unread", value: unreadCount, gradient: "from-purple-500 to-fuchsia-600", bgGradient: "from-purple-50 to-fuchsia-50", darkBg: "dark:from-purple-500/10 dark:to-fuchsia-500/10", shadow: "shadow-purple-500/15", labelColor: "text-purple-600/80 dark:text-purple-300/60" },
              { icon: CheckCheck, label: t("read") || "Read", value: notifications.length - unreadCount, gradient: "from-emerald-500 to-teal-600", bgGradient: "from-emerald-50 to-teal-50", darkBg: "dark:from-emerald-500/10 dark:to-teal-500/10", shadow: "shadow-emerald-500/15", labelColor: "text-emerald-600/80 dark:text-emerald-300/60" },
            ].map((stat) => (
              <div key={stat.label} className={`mhub-premium-surface relative overflow-hidden rounded-2xl p-4 text-center border border-white/60 dark:border-white/5 shadow-lg ${stat.shadow} dark:shadow-none transition-transform duration-200 hover:scale-[1.03]`}>
                {/* Subtle gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} ${stat.darkBg} opacity-50 pointer-events-none`} />
                <div className="relative">
                  <div className={`w-9 h-9 mx-auto mb-2.5 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-md ${stat.shadow}`}>
                    <stat.icon className="w-4 h-4 text-white dark:text-white" />
                  </div>
                  <div className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-none mb-1 dark:text-gray-100">
                    {stat.value}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${stat.labelColor}`}>
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pro tip card */}
        <div
          data-density="extra"
          className="mt-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 shadow-xl shadow-indigo-500/20 dark:bg-gradient-to-r"
        >
          {/* Dot pattern overlay for texture */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
          {/* Gradient shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent dark:bg-gradient-to-r" />
          <div className="relative p-5 flex items-start gap-4">
            {/* Glass circle icon */}
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/10 dark:bg-slate-900/20">
              <Sparkles className="w-5 h-5 text-white drop-shadow-sm dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white/95 text-[13px] tracking-wide uppercase mb-1.5 dark:text-white/95">
                {t("pro_tip") || "Pro Tip"}
              </h4>
              <p className="text-[13px] text-white/70 leading-relaxed dark:text-white/70">
                {t("enable_push_notifications") ||
                  "Enable push notifications to never miss a buyer inquiry or price drop on your wishlist items!"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes gradientSlide {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes notifSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationsPage;
