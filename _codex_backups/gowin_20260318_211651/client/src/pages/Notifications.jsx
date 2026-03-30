import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useAuth } from "@/context/AuthContext";
import { getUserId, isAuthenticated } from "@/utils/authStorage";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
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
import PageHeader from "../components/PageHeader";
const KNOWN_ROUTES = [
    "/all-posts",
    "/post/",
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
    "/my-recommendations",
    "/categories",
    "/search",
  ],
  resolveNotificationPath = (rawPath) => {
    if (!rawPath) return "/notifications";
    const path = String(rawPath).trim().startsWith("/")
      ? String(rawPath).trim()
      : `/${String(rawPath).trim()}`;
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
  },
  getIconCategory = (notification) => {
    const category = String(notification.icon || notification.icon_category || notification.type || "").toLowerCase();
    return category.includes("order") || category.includes("sale") || category.includes("package")
      ? "package"
      : category.includes("payment") || category.includes("wallet") || category.includes("money")
        ? "money"
        : category.includes("security")
          ? "security"
          : category.includes("message") || category.includes("chat") || category.includes("inquiry")
            ? "message"
            : category.includes("gift") || category.includes("promo") || category.includes("reward")
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
  },
  normalizeNotification = (notification) => {
    const id = notification.notification_id ?? notification.id;
    return {
      ...notification,
      id: id,
      notification_id: id,
      read: notification.read === !0 || notification.is_read === !0,
      icon: getIconCategory(notification),
      priority: notification.priority || "normal",
      created_at: notification.created_at || new Date().toISOString(),
    };
  },
  NotificationsPage = () => {
    const navigate = useNavigate(),
      { t } = useTranslation(),
      { toast } = useToast(),
      { user, loading: authLoading } = useAuth(),
      [notifications, setNotifications] = useState([]),
      [isLoading, setIsLoading] = useState(!1),
      [activeFilter, setActiveFilter] = useState("all"),
      [selectedIds, setSelectedIds] = useState(new Set()),
      fetchCounterRef = useRef(0),
      userId = useMemo(() => getUserId(user), [user]),
      isAuth = useMemo(() => isAuthenticated(user), [user, userId]),
      fallbackNotifications = useMemo(
        () => [
          {
            id: 1,
            type: "order",
            title: "\uD83C\uDF89 Order Confirmed!",
            message:
              "Your order #MH2024001 for iPhone 14 Pro has been confirmed. Seller will ship within 24 hours.",
            created_at: new Date(Date.now() - 1e3 * 60 * 15).toISOString(),
            read: !1,
            icon: "package",
            priority: "high",
            action: { label: "Track Order", path: "/orders/MH2024001" },
          },
          {
            id: 2,
            type: "payment",
            title: "\uD83D\uDCB0 Ka-ching! Payment Received",
            message:
              "\u20B945,000 has been credited to your wallet for the sale of Samsung Galaxy S24.",
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 2).toISOString(),
            read: !1,
            icon: "money",
            priority: "high",
            action: { label: "View Wallet", path: "/wallet" },
          },
          {
            id: 3,
            type: "like",
            title: "\u2764\uFE0F Your Post is Trending!",
            message:
              "15 people liked your MacBook Pro M2 listing in the last hour. Your post is gaining traction!",
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 3).toISOString(),
            read: !1,
            icon: "heart",
            priority: "medium",
            action: { label: "View Stats", path: "/my-home" },
          },
          {
            id: 4,
            type: "promo",
            title: "\u2728 Flash Sale: Premium Listing FREE!",
            message:
              "List your item as Premium for FREE today only! Get 10x more visibility and sell faster.",
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 5).toISOString(),
            read: !0,
            icon: "gift",
            priority: "medium",
            action: { label: "Claim Now", path: "/tier-selection" },
          },
          {
            id: 5,
            type: "message",
            title: "\uD83D\uDCAC New Message from Buyer",
            message:
              'Rahul S. asked: "Is the laptop still available? Can we negotiate the price?"',
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 8).toISOString(),
            read: !0,
            icon: "message",
            priority: "medium",
            action: { label: "Reply Now", path: "/messages" },
          },
          {
            id: 6,
            type: "security",
            title: "\uD83D\uDD10 New Login Detected",
            message:
              "Login from Chrome on Windows in Hyderabad. If this wasn't you, secure your account immediately.",
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 24).toISOString(),
            read: !0,
            icon: "security",
            priority: "high",
            action: { label: "Review Activity", path: "/profile" },
          },
          {
            id: 7,
            type: "reward",
            title: "\uD83C\uDFC6 Congratulations! You earned 500 points",
            message:
              "You completed 5 successful sales this month. Redeem your points for exclusive discounts!",
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 48).toISOString(),
            read: !0,
            icon: "star",
            priority: "low",
            action: { label: "View Rewards", path: "/rewards" },
          },
          {
            id: 8,
            type: "price_drop",
            title: "\uD83D\uDCC9 Price Drop Alert!",
            message:
              "iPhone 13 in your wishlist is now \u20B95,000 cheaper. Don't miss this deal!",
            created_at: new Date(Date.now() - 1e3 * 60 * 60 * 72).toISOString(),
            read: !0,
            icon: "trending",
            priority: "medium",
            action: { label: "View Item", path: "/wishlist" },
          },
        ],
        [],
      ),
      fetchNotifications = useCallback(async () => {
        if (!isAuth || !userId) {
          setNotifications([]), setIsLoading(!1);
          return;
        }
        const counter = fetchCounterRef.current + 1;
        (fetchCounterRef.current = counter), setIsLoading(!0);
        try {
          const response = await api.get(
            `/notifications?userId=${encodeURIComponent(userId)}`,
          );
          if (counter !== fetchCounterRef.current) return;
          const data = response?.data ?? response,
            list = Array.isArray(data)
              ? data
              : Array.isArray(data?.notifications)
                ? data.notifications
                : [];
          list.length > 0 ? setNotifications(list.map(normalizeNotification)) : setNotifications(fallbackNotifications.map(normalizeNotification));
        } catch (err) {
          if (counter !== fetchCounterRef.current) return;
          console.error("[Notifications] Failed to load notifications:", err),
            setNotifications(fallbackNotifications.map(normalizeNotification));
        } finally {
          counter === fetchCounterRef.current && setIsLoading(!1);
        }
      }, [isAuth, fallbackNotifications, userId]);
    useEffect(
      () => (
        authLoading || fetchNotifications(),
        () => {
          fetchCounterRef.current += 1;
        }
      ),
      [authLoading, fetchNotifications],
    );
    const renderIcon = (iconType) => {
        const iconClass = "w-5 h-5";
        switch (iconType) {
          case "package":
            return React.createElement(Package, { className: `${iconClass} text-blue-500` });
          case "money":
            return React.createElement(DollarSign, { className: `${iconClass} text-emerald-500` });
          case "gift":
            return React.createElement(Gift, { className: `${iconClass} text-purple-500` });
          case "message":
            return React.createElement(MessageCircle, { className: `${iconClass} text-indigo-500` });
          case "security":
            return React.createElement(Shield, { className: `${iconClass} text-orange-500` });
          case "heart":
            return React.createElement(Heart, { className: `${iconClass} text-pink-500` });
          case "star":
            return React.createElement(Star, { className: `${iconClass} text-yellow-500` });
          case "trending":
            return React.createElement(TrendingUp, { className: `${iconClass} text-green-500` });
          case "alert":
            return React.createElement(AlertCircle, { className: `${iconClass} text-red-500` });
          default:
            return React.createElement(Bell, { className: `${iconClass} text-blue-500` });
        }
      },
      getIconBgClass = (iconType, isRead) => {
        const opacity = isRead ? "20" : "30";
        switch (iconType) {
          case "package":
            return `bg-gradient-to-br from-blue-500/${opacity} to-blue-600/${opacity}`;
          case "money":
            return `bg-gradient-to-br from-emerald-500/${opacity} to-emerald-600/${opacity}`;
          case "gift":
            return `bg-gradient-to-br from-purple-500/${opacity} to-pink-500/${opacity}`;
          case "message":
            return `bg-gradient-to-br from-indigo-500/${opacity} to-blue-500/${opacity}`;
          case "security":
            return `bg-gradient-to-br from-orange-500/${opacity} to-red-500/${opacity}`;
          case "heart":
            return `bg-gradient-to-br from-pink-500/${opacity} to-rose-500/${opacity}`;
          case "star":
            return `bg-gradient-to-br from-yellow-500/${opacity} to-amber-500/${opacity}`;
          case "trending":
            return `bg-gradient-to-br from-green-500/${opacity} to-emerald-500/${opacity}`;
          default:
            return `bg-gradient-to-br from-blue-500/${opacity} to-indigo-500/${opacity}`;
        }
      },
      formatTimeAgo = (timestamp) => {
        const date = new Date(timestamp),
          diff = new Date() - date,
          minutes = Math.floor(diff / (1e3 * 60)),
          hours = Math.floor(diff / (1e3 * 60 * 60)),
          days = Math.floor(diff / (1e3 * 60 * 60 * 24));
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
      },
      markAsRead = useCallback(
        async (notificationId) => {
          setNotifications((prev) =>
            prev.map((item) =>
              (item.notification_id || item.id) === notificationId
                ? { ...item, read: !0, is_read: !0 }
                : item,
            ),
          );
          try {
            await api.put(`/notifications/${notificationId}/read`, { userId: userId });
          } catch (err) {
            console.error(
              "[Notifications] Failed to mark notification as read:",
              err,
            );
          }
        },
        [userId],
      ),
      markAllAsRead = useCallback(async () => {
        setNotifications((prev) => prev.map((item) => ({ ...item, read: !0, is_read: !0 })));
        toast({ title: t("all_caught_up") || "All caught up!", description: t("mark_all_read_success") || "All notifications marked as read." });
        try {
          await api.put("/notifications/mark-all-read", { userId: userId });
        } catch (err) {
          console.error("[Notifications] Failed to mark all as read:", err);
        }
      }, [userId, toast, t]),
      deleteNotification = useCallback(
        async (notificationId) => {
          setNotifications((prev) => prev.filter((item) => (item.notification_id || item.id) !== notificationId)),
            setSelectedIds((prev) => {
              const next = new Set(prev);
              return next.delete(notificationId), next;
            });
          try {
            await api.delete(`/notifications/${notificationId}`, { data: { userId: userId } });
          } catch (err) {
            console.error("[Notifications] Failed to delete notification:", err);
          }
        },
        [userId],
      ),
      deleteSelected = useCallback(async () => {
        const ids = Array.from(selectedIds);
        ids.length !== 0 &&
          (setNotifications((prev) => prev.filter((item) => !selectedIds.has(item.notification_id || item.id))),
          setSelectedIds(new Set()),
          await Promise.allSettled(
            ids.map((id) =>
              api.delete(`/notifications/${id}`, { data: { userId: userId } }),
            ),
          ));
      }, [selectedIds, userId]),
      unreadCount = useMemo(() => notifications.reduce((total, item) => total + (item.read ? 0 : 1), 0), [notifications]),
      handleNotificationClick = useCallback(
        (notification) => {
          const notificationId = notification.notification_id || notification.id,
            rawPath = notification?.action?.path || "",
            resolvedPath = resolveNotificationPath(rawPath);
          markAsRead(notificationId),
            navigate(resolvedPath, {
              state:
                resolvedPath !== rawPath
                  ? { fromNotificationFallback: !0, originalPath: rawPath }
                  : void 0,
            });
        },
        [markAsRead, navigate],
      ),
      filteredNotifications = useMemo(
        () =>
          notifications.filter((item) =>
            activeFilter === "unread" ? !item.read : activeFilter === "read" ? item.read : !0,
          ),
        [activeFilter, notifications],
      ),
      getDateGroupLabel = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return "This Week";
        if (diffDays < 30) return "This Month";
        return "Older";
      },
      groupedNotifications = useMemo(() => {
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
    return authLoading
      ? React.createElement(
          "div",
          { className: "min-h-screen flex items-center justify-center" },
          React.createElement(
            "p",
            { className: "text-gray-500 dark:text-gray-400" },
            t("loading") || "Loading...",
          ),
        )
      : !isAuth || !userId
        ? React.createElement(
            "div",
            {
              className:
                "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4",
            },
            React.createElement(
              "div",
              {
                className:
                  "bg-white/10 backdrop-blur-2xl rounded-3xl p-5 border border-white/20 shadow-2xl max-w-md w-full text-center",
              },
              React.createElement(Bell, {
                className: "w-16 h-16 text-purple-300 mx-auto mb-4",
              }),
              React.createElement(
                "h1",
                { className: "text-2xl font-bold text-white mb-3" },
                t("login_required") || "Login Required",
              ),
              React.createElement(
                "p",
                { className: "text-gray-300 mb-6" },
                t("please_login_to_continue") ||
                  "Please sign in to view your notifications.",
              ),
              React.createElement(
                "button",
                {
                  onClick: () =>
                    navigate("/login", { state: { returnTo: "/notifications" } }),
                  className:
                    "w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-semibold",
                },
                t("sign_in") || "Sign In",
              ),
            ),
          )
        : isLoading
          ? React.createElement(
              "div",
              {
                className:
                  "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center",
              },
              React.createElement(
                "div",
                { className: "flex flex-col items-center gap-4" },
                React.createElement(
                  "div",
                  { className: "relative" },
                  React.createElement("div", {
                    className:
                      "w-16 h-16 border-4 border-purple-500/30 rounded-full",
                  }),
                  React.createElement("div", {
                    className:
                      "absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin",
                  }),
                ),
                React.createElement(
                  "p",
                  { className: "text-purple-200 font-medium animate-pulse" },
                  t("loading") || "Loading...",
                ),
              ),
            )
          : React.createElement(
              "div",
              {
                className:
                  "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 pb-28",
              },
              React.createElement(
                "div",
                {
                  className:
                    "fixed inset-0 overflow-hidden pointer-events-none",
                },
                React.createElement("div", {
                  className:
                    "absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse",
                }),
                React.createElement("div", {
                  className:
                    "absolute bottom-40 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse",
                  style: { animationDelay: "1s" },
                }),
                React.createElement("div", {
                  className:
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl",
                }),
              ),
              React.createElement(PageHeader, {
                title: t("notifications") || "Notifications",
                rightAction: React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  selectedIds.size > 0 &&
                    React.createElement(
                      "button",
                      {
                        onClick: deleteSelected,
                        className:
                          "p-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all",
                      },
                      React.createElement(Trash2, { className: "w-5 h-5 text-red-400" }),
                    ),
                  React.createElement(
                    "button",
                    {
                      onClick: fetchNotifications,
                      className:
                        "p-2 hover:bg-white/10 rounded-xl transition-colors",
                    },
                    React.createElement(RefreshCw, {
                      className: "w-5 h-5 text-purple-300",
                    }),
                  ),
                ),
                className: "bg-slate-900/90 border-slate-700 text-white",
                transparent: !1,
              }),
              React.createElement(
                "div",
                { className: "relative z-10 px-4 mb-4" },
                React.createElement(
                  "div",
                  { className: "max-w-2xl mx-auto pt-2" },
                  React.createElement(
                    "p",
                    { className: "text-purple-300 text-sm mb-4 ps-2" },
                    unreadCount > 0
                      ? `${unreadCount} ${t("new_updates") || "new updates"}`
                      : t("all_caught_up") || "You're all caught up!",
                  ),
                  unreadCount > 0 &&
                    React.createElement(
                      "button",
                      {
                        onClick: markAllAsRead,
                        className:
                          "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-xl transition-all text-sm font-medium text-purple-200 mb-4",
                      },
                      React.createElement(CheckCheck, { className: "w-4 h-4" }),
                      t("mark_all_as_read") || "Mark all as read",
                    ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "flex gap-2 overflow-x-auto pb-2 scrollbar-hide",
                    },
                    [
                      { key: "all", label: "All", count: notifications.length, icon: Sparkles },
                      { key: "unread", label: "Unread", count: unreadCount, icon: Zap },
                      {
                        key: "read",
                        label: "Read",
                        count: notifications.length - unreadCount,
                        icon: Check,
                      },
                    ].map((tab) =>
                      React.createElement(
                        "button",
                        {
                          key: tab.key,
                          onClick: () => setActiveFilter(tab.key),
                          className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${activeFilter === tab.key ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30" : "bg-white/5 text-purple-200 hover:bg-white/10 border border-white/10"}`,
                        },
                        React.createElement(tab.icon, { className: "w-4 h-4" }),
                        tab.label,
                        React.createElement(
                          "span",
                          {
                            className: `px-1.5 py-0.5 rounded-md text-xs ${activeFilter === tab.key ? "bg-white/20" : "bg-white/10"}`,
                          },
                          tab.count,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                { className: "relative z-10 max-w-2xl mx-auto px-4" },
                React.createElement(
                  "div",
                  { className: "space-y-3" },
                  groupedNotifications.length === 0
                    ? React.createElement(
                        "div",
                        { className: "py-20 text-center" },
                        React.createElement(
                          "div",
                          {
                            className:
                              "w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center",
                          },
                          React.createElement(Bell, {
                            className: "w-12 h-12 text-purple-400",
                          }),
                        ),
                        React.createElement(
                          "h3",
                          { className: "text-xl font-bold text-white mb-2" },
                          activeFilter === "unread"
                            ? t("all_caught_up") || "All caught up!"
                            : t("no_notifications") || "No notifications",
                        ),
                        React.createElement(
                          "p",
                          { className: "text-purple-300/70" },
                          activeFilter === "unread"
                            ? t("read_all_notifications") ||
                                "Great job! You've read all your notifications."
                            : t("check_back_later") ||
                                "Check back later for updates and offers.",
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "mt-6 flex flex-wrap justify-center gap-2",
                          },
                          React.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => navigate("/all-posts"),
                              className:
                                "px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium",
                            },
                            "Browse Listings",
                          ),
                          React.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => navigate("/chat"),
                              className:
                                "px-4 py-2 rounded-xl border border-purple-400/40 text-purple-200 text-sm font-medium hover:bg-white/10",
                            },
                            "Open Chat",
                          ),
                        ),
                      )
                    : groupedNotifications.flatMap((group) => [
                        React.createElement(
                          "div",
                          { key: `group-${group.label}`, className: "flex items-center gap-3 my-2" },
                          React.createElement("div", { className: "h-px flex-1 bg-white/10" }),
                          React.createElement("span", { className: "text-xs font-semibold text-purple-300/60 uppercase tracking-widest whitespace-nowrap" }, group.label),
                          React.createElement("div", { className: "h-px flex-1 bg-white/10" }),
                        ),
                        ...group.items.map((notification, index) =>
                        React.createElement(
                          "div",
                          {
                            key: notification.notification_id || notification.id,
                            className: `group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${notification.read ? "bg-white/5 border border-white/10 hover:border-white/20" : "bg-gradient-to-r from-white/10 to-white/5 border border-purple-500/30 shadow-lg shadow-purple-500/10"}`,
                            style: { animationDelay: `${index * 50}ms` },
                          },
                          notification.priority === "high" &&
                            !notification.read &&
                            React.createElement("div", {
                              className:
                                "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500",
                            }),
                          React.createElement(
                            "div",
                            { className: "p-4 flex items-start gap-4" },
                            React.createElement(
                              "div",
                              {
                                className: `w-12 h-12 rounded-2xl ${getIconBgClass(notification.icon, notification.read)} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`,
                              },
                              renderIcon(notification.icon),
                            ),
                            React.createElement(
                              "div",
                              { className: "flex-1 min-w-0" },
                              React.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-start justify-between gap-2 mb-1 min-w-0",
                                },
                                React.createElement(
                                  "h3",
                                  {
                                    className: `font-semibold text-white truncate flex-1 min-w-0 ${notification.read ? "text-gray-200" : "text-white"}`,
                                    title: notification.title,
                                  },
                                  notification.title,
                                ),
                                React.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex items-center gap-2 flex-shrink-0",
                                  },
                                  React.createElement(
                                    "span",
                                    {
                                      className:
                                        "text-xs text-purple-300/70 flex items-center gap-1",
                                    },
                                    React.createElement(Clock, {
                                      className: "w-3 h-3",
                                    }),
                                    formatTimeAgo(notification.created_at),
                                  ),
                                  !notification.read &&
                                    React.createElement("span", {
                                      className:
                                        "w-2 h-2 bg-purple-500 rounded-full animate-pulse",
                                    }),
                                ),
                              ),
                              React.createElement(
                                "p",
                                {
                                  className:
                                    "text-sm text-gray-300/80 line-clamp-2 mb-3",
                                },
                                notification.message,
                              ),
                              notification.action &&
                                React.createElement(
                                  "button",
                                  {
                                    onClick: () => handleNotificationClick(notification),
                                    className:
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-lg text-sm font-medium text-purple-200 transition-all group/btn",
                                  },
                                  notification.action.label,
                                  React.createElement(ChevronRight, {
                                    className:
                                      "w-4 h-4 transition-transform group-hover/btn:translate-x-0.5",
                                  }),
                                ),
                            ),
                            React.createElement(
                              "div",
                              {
                                className:
                                  "flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                              },
                              !notification.read &&
                                React.createElement(
                                  "button",
                                  {
                                    onClick: (evt) => {
                                      evt.stopPropagation(),
                                        markAsRead(notification.notification_id || notification.id);
                                    },
                                    className:
                                      "p-2 hover:bg-green-500/20 rounded-lg transition-colors",
                                    title: "Mark as read",
                                  },
                                  React.createElement(Check, {
                                    className: "w-4 h-4 text-green-400",
                                  }),
                                ),
                              React.createElement(
                                "button",
                                {
                                  onClick: (evt) => {
                                    evt.stopPropagation(),
                                      deleteNotification(notification.notification_id || notification.id);
                                  },
                                  className:
                                    "p-2 hover:bg-red-500/20 rounded-lg transition-colors",
                                  title: "Delete",
                                },
                                React.createElement(XIcon, {
                                  className: "w-4 h-4 text-red-400",
                                }),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ]),
                ),
                notifications.length > 0 &&
                  React.createElement(
                    "div",
                    { className: "grid grid-cols-3 gap-3 mt-8" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 rounded-2xl p-4 text-center",
                      },
                      React.createElement(
                        "div",
                        { className: "text-2xl font-bold text-white" },
                        notifications.length,
                      ),
                      React.createElement(
                        "div",
                        { className: "text-xs text-blue-300 mt-1" },
                        t("total") || "Total",
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 rounded-2xl p-4 text-center",
                      },
                      React.createElement(
                        "div",
                        { className: "text-2xl font-bold text-white" },
                        unreadCount,
                      ),
                      React.createElement(
                        "div",
                        { className: "text-xs text-purple-300 mt-1" },
                        t("unread") || "Unread",
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        className:
                          "bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20 rounded-2xl p-4 text-center",
                      },
                      React.createElement(
                        "div",
                        { className: "text-2xl font-bold text-white" },
                        notifications.length - unreadCount,
                      ),
                      React.createElement(
                        "div",
                        { className: "text-xs text-green-300 mt-1" },
                        t("read") || "Read",
                      ),
                    ),
                  ),
                React.createElement(
                  "div",
                  {
                    className:
                      "mt-8 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl",
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-start gap-3" },
                    React.createElement(
                      "div",
                      {
                        className:
                          "w-10 h-10 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-xl flex items-center justify-center flex-shrink-0",
                      },
                      React.createElement(Sparkles, {
                        className: "w-5 h-5 text-amber-400",
                      }),
                    ),
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "h4",
                        { className: "font-semibold text-amber-200 mb-1" },
                        t("pro_tip") || "Pro Tip",
                      ),
                      React.createElement(
                        "p",
                        { className: "text-sm text-amber-200/70" },
                        t("enable_push_notifications") ||
                          "Enable push notifications to never miss a buyer inquiry or price drop on your wishlist items!",
                      ),
                    ),
                  ),
                ),
              ),
            );
  };
var NotificationsPageDefault = NotificationsPage;
export { NotificationsPageDefault as default };
