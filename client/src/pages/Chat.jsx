import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Wifi,
  WifiOff,
  AlertCircle,
  RotateCcw,
  Compass,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { socket, connectSocketWithToken } from "../lib/socket";
import { navigateBack } from "@/utils/navigation";
import PageDensityToggle from "@/components/ui/PageDensityToggle";
import { usePageDensity } from "@/hooks/usePageDensity";
import { useTranslation } from "react-i18next";
const ChatPage = () => {
  const { t } = useTranslation();
  const tr = useCallback(
    (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options }),
    [t],
  );
  const navigate = useNavigate(),
    { density, setDensity } = usePageDensity("mhub_chat_density"),
    densityClass = density === "compact" ? " mhub-compact" : "",
    [conversations, setConversations] = useState([]),
    [selectedConversation, setSelectedConversation] = useState(null),
    [messages, setMessages] = useState([]),
    [messageInput, setMessageInput] = useState(""),
    [loading, setLoading] = useState(!0),
    [sending, setSending] = useState(!1),
    [searchQuery, setSearchQuery] = useState(""),
    [loadingMessages, setLoadingMessages] = useState(!1),
    [messagesError, setMessagesError] = useState(""),
    [sendError, setSendError] = useState(""),
    [connectionStatus, setConnectionStatus] = useState(socket.connected ? "connected" : "connecting"),
    messagesEndRef = useRef(null),
    [isTyping, setIsTyping] = useState(!1),
    [typingUser, setTypingUser] = useState(null),
    [onlineUsers, setOnlineUsers] = useState(new Set()),
    typingTimeoutRef = useRef(null),
    lastTypingEmitRef = useRef(0),
    selectedConversationRef = useRef(null),
    fetchCounterRef = useRef(0),
    currentUserId = useMemo(() => {
      const rawId = localStorage.getItem("userId"),
        parsed = Number.parseInt(rawId || "", 10);
      return Number.isNaN(parsed) ? null : parsed;
    }, []);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]),
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
  const fetchConversations = useCallback(async () => {
      if (!currentUserId) {
        setLoading(!1);
        return;
      }
      try {
        const response = await api.get("/chat/conversations"),
          data = response?.data ?? response;
        setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
      } catch (err) {
        import.meta.env.DEV &&
          console.error("Failed to fetch conversations:", err);
        setConversations([]);
      } finally {
        setLoading(!1);
      }
    }, [currentUserId]),
    fetchMessages = useCallback(async (conversationId) => {
      const counter = ++fetchCounterRef.current;
      setLoadingMessages(!0), setMessagesError("");
      try {
        const response = await api.get(`/chat/conversations/${conversationId}`);
        if (counter !== fetchCounterRef.current) return;
        const data = response?.data ?? response;
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
      } catch (err) {
        import.meta.env.DEV && console.error("Failed to fetch messages:", err),
          counter === fetchCounterRef.current &&
            (setMessages([]), setMessagesError(tr("chat_load_failed", "Unable to load this conversation right now.")));
      } finally {
        counter === fetchCounterRef.current && setLoadingMessages(!1);
      }
    }, []);
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]),
    useEffect(() => {
      if (!currentUserId) return;
      socket.connected ? setConnectionStatus("connected") : (setConnectionStatus("connecting"), connectSocketWithToken()),
        socket.emit("join_room", `user_${currentUserId}`);
      const handleNewMessage = (payload) => {
          const currentConv = selectedConversationRef.current,
            convId = payload?.conversation_id,
            msg = payload?.message;
          currentConv?.conversation_id === convId &&
            msg &&
            setMessages((prev) => {
              const msgId = msg.id ?? msg.message_id;
              return msgId && prev.some((item) => (item.id ?? item.message_id) === msgId)
                ? prev
                : [...prev, msg];
            }),
            convId &&
              setConversations((prev) => {
                const idx = prev.findIndex((conv) => conv.conversation_id === convId);
                if (idx === -1) return prev;
                const existing = prev[idx],
                  updated = {
                    ...existing,
                    last_message: msg?.content ?? existing.last_message,
                    last_message_time: msg?.created_at ?? existing.last_message_time,
                    unread_count:
                      currentConv?.conversation_id === convId
                        ? 0
                        : (Number(existing.unread_count) || 0) + 1,
                  };
                if (idx === 0) {
                  const copy = [...prev];
                  return (copy[0] = updated), copy;
                }
                return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
              });
        },
        handleUserTyping = (payload) => {
          const currentConv = selectedConversationRef.current,
            otherId = Number.parseInt(currentConv?.other_user_id, 10),
            typerId = Number.parseInt(payload?.user_id, 10);
          (!Number.isNaN(otherId) && !Number.isNaN(typerId)
            ? otherId === typerId
            : String(currentConv?.other_user_id) === String(payload?.user_id)) &&
            (setIsTyping(!0),
            setTypingUser(payload?.username || tr("someone", "Someone")),
            clearTimeout(typingTimeoutRef.current),
            (typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(!1), setTypingUser(null);
            }, 3e3)));
        },
        handleUserStoppedTyping = (payload) => {
          const currentConv = selectedConversationRef.current,
            otherId = Number.parseInt(currentConv?.other_user_id, 10),
            typerId = Number.parseInt(payload?.user_id, 10);
          (!Number.isNaN(otherId) && !Number.isNaN(typerId)
            ? otherId === typerId
            : String(currentConv?.other_user_id) === String(payload?.user_id)) &&
            (setIsTyping(!1), setTypingUser(null));
        },
        handleUserOnline = (payload) => {
          const parsedId = Number.parseInt(payload?.user_id, 10);
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            return next.add(Number.isNaN(parsedId) ? payload?.user_id : parsedId), next;
          });
        },
        handleUserOffline = (payload) => {
          const parsedId = Number.parseInt(payload?.user_id, 10),
            resolvedId = Number.isNaN(parsedId) ? payload?.user_id : parsedId;
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            return next.delete(resolvedId), next;
          });
        },
        handleMessagesRead = (payload) => {
          const currentConv = selectedConversationRef.current;
          payload?.conversation_id === currentConv?.conversation_id &&
            setMessages((prev) => prev.map((msg) => ({ ...msg, is_read: !0 })));
        },
        handleConnect = () => {
          setConnectionStatus("connected");
        },
        handleDisconnect = () => {
          setConnectionStatus("offline");
        },
        handleReconnectAttempt = () => {
          setConnectionStatus("reconnecting");
        },
        handleConnectError = () => {
          setConnectionStatus("offline");
        };
      return (
        socket.on("new_message", handleNewMessage),
        socket.on("user_typing", handleUserTyping),
        socket.on("user_stopped_typing", handleUserStoppedTyping),
        socket.on("user_online", handleUserOnline),
        socket.on("user_offline", handleUserOffline),
        socket.on("messages_read", handleMessagesRead),
        socket.on("connect", handleConnect),
        socket.on("disconnect", handleDisconnect),
        socket.on("reconnect_attempt", handleReconnectAttempt),
        socket.on("connect_error", handleConnectError),
        () => {
          socket.off("new_message", handleNewMessage),
            socket.off("user_typing", handleUserTyping),
            socket.off("user_stopped_typing", handleUserStoppedTyping),
            socket.off("user_online", handleUserOnline),
            socket.off("user_offline", handleUserOffline),
            socket.off("messages_read", handleMessagesRead),
            socket.off("connect", handleConnect),
            socket.off("disconnect", handleDisconnect),
            socket.off("reconnect_attempt", handleReconnectAttempt),
            socket.off("connect_error", handleConnectError),
            clearTimeout(typingTimeoutRef.current);
        }
      );
    }, [currentUserId, tr]);
  const handleInputChange = useCallback(
      (evt) => {
        const value = evt.target.value;
        if ((setMessageInput(value), !selectedConversation)) return;
        const now = Date.now();
        value.trim() &&
          now - lastTypingEmitRef.current > 1e3 &&
          (socket.emit("typing", {
            conversation_id: selectedConversation.conversation_id,
            receiver_id: selectedConversation.other_user_id,
          }),
          (lastTypingEmitRef.current = now)),
          value.trim() ||
            socket.emit("stopped_typing", {
              conversation_id: selectedConversation.conversation_id,
              receiver_id: selectedConversation.other_user_id,
            });
      },
      [selectedConversation],
    ),
    handleSend = useCallback(async () => {
      const trimmed = messageInput.trim();
      if (!(!trimmed || !selectedConversation || sending)) {
        setSending(!0), setSendError("");
        try {
          const response = await api.post("/chat/send", {
              receiverId: selectedConversation.other_user_id,
              postId: selectedConversation.post_id,
              content: trimmed,
            }),
            data = response?.data ?? response,
            sentMessage = typeof data?.message == "object" ? data.message : data?.data || null;
          setMessages((prev) => {
            const msgId = sentMessage?.id ?? sentMessage?.message_id;
            return msgId && prev.some((item) => (item.id ?? item.message_id) === msgId)
              ? prev
              : [
                  ...prev,
                  sentMessage || {
                    sender_id: currentUserId,
                    content: trimmed,
                    created_at: new Date().toISOString(),
                    sender_username: tr("you", "You"),
                    delivery_status: "sent",
                  },
                ];
          }),
            setConversations((prev) =>
              prev.map((conv) =>
                conv.conversation_id === selectedConversation.conversation_id
                  ? {
                      ...conv,
                      last_message: trimmed,
                      last_message_time: new Date().toISOString(),
                    }
                  : conv,
              ),
            ),
            setMessageInput("");
        } catch (err) {
          import.meta.env.DEV && console.error("Failed to send message:", err),
            setSendError(tr("chat_send_failed", "Message failed to send. Check your connection and retry."));
        } finally {
          setSending(!1);
        }
      }
    }, [currentUserId, messageInput, selectedConversation, sending]),
    selectConversation = useCallback(
      (conv) => {
        setSelectedConversation(conv),
          setIsTyping(!1),
          setTypingUser(null),
          setSendError(""),
          setMessagesError(""),
          setMessages([]),
          fetchMessages(conv.conversation_id),
          setConversations((prev) =>
            prev.map((item) =>
              item.conversation_id === conv.conversation_id
                ? { ...item, unread_count: 0 }
                : item,
            ),
          );
      },
      [fetchMessages],
    ),
    searchFilter = searchQuery.trim().toLowerCase(),
    filteredConversations = useMemo(
      () =>
        searchFilter
          ? conversations.filter((conv) =>
              [conv.other_name, conv.other_username, conv.post_title, conv.last_message]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(searchFilter),
            )
          : conversations,
      [conversations, searchFilter],
    ),
    otherUserId = useMemo(() => {
      const parsed = Number.parseInt(selectedConversation?.other_user_id, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }, [selectedConversation]),
    isOtherUserOnline = otherUserId !== null && (onlineUsers.has(otherUserId) || onlineUsers.has(String(otherUserId))),
    formatTime = useCallback((timestamp) => {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }, []);
  return loading
    ? React.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 flex items-center justify-center dark:bg-gradient-to-br" +
            densityClass,
        },
        React.createElement("div", {
          className:
            "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-b-2 dark:border-blue-500/40",
        }),
      )
    : React.createElement(
        "div",
        {
          className:
            "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br" +
            densityClass,
        },
        React.createElement(
          "div",
          {
            className: "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#0b1220] dark:to-[#1b2542] px-4 py-6 dark:bg-gradient-to-r",
          },
          React.createElement(
            "div",
            { className: "max-w-4xl mx-auto flex items-center gap-4" },
            React.createElement(
              Button,
              {
                variant: "ghost",
                size: "icon",
                className: "text-white dark:text-white",
                onClick: () => navigateBack(navigate),
              },
              React.createElement(ArrowLeft, { className: "w-6 h-6" }),
            ),
            React.createElement(
              "div",
              null,
              React.createElement(
                "h1",
                {
                  className:
                    "text-2xl font-bold text-white flex items-center gap-2 dark:text-white",
                },
                React.createElement(MessageCircle, { className: "w-6 h-6" }),
                tr("messages", "Messages"),
              ),
              React.createElement(
                "p",
                { className: "text-blue-100 dark:text-blue-200" },
                tr("chat_subtitle", "Chat with buyers and sellers"),
              ),
            ),
            React.createElement(
              "div",
              { className: "ml-auto" },
              React.createElement(PageDensityToggle, {
                value: density,
                onChange: setDensity,
                className:
                  "[&>span]:text-white/80 [&_select]:bg-white/15 [&_select]:text-white [&_select]:border-white/30",
              }),
            ),
          ),
        ),
        !(connectionStatus === "connected") &&
          React.createElement(
            "div",
            {
              className:
                "bg-amber-50 border-b border-amber-200 dark:bg-amber-500/10 dark:border-amber-400/30 px-4 py-3 dark:bg-amber-950/20 dark:border-b dark:border-amber-600/40",
            },
            React.createElement(
              "div",
              {
                className:
                  "max-w-4xl mx-auto flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200",
              },
              React.createElement(
                "div",
                { className: "flex items-center gap-2 text-sm" },
                connectionStatus === "offline"
                  ? React.createElement(WifiOff, { className: "w-4 h-4" })
                  : React.createElement(Wifi, { className: "w-4 h-4" }),
                React.createElement(
                  "span",
                  null,
                  connectionStatus === "reconnecting"
                    ? tr("chat_reconnecting", "Reconnecting to chat service...")
                    : connectionStatus === "offline"
                      ? tr(
                          "chat_disconnected",
                          "Realtime chat disconnected. You can still retry sending manually.",
                        )
                      : tr("chat_connecting", "Connecting to chat service..."),
                ),
              ),
              React.createElement(
                Button,
                {
                  type: "button",
                  size: "sm",
                  variant: "outline",
                  className:
                    "border-amber-300 text-amber-800 dark:border-amber-400/40 dark:text-amber-200 dark:border-amber-600/40",
                  onClick: () => {
                    setConnectionStatus("connecting"), connectSocketWithToken();
                  },
                },
                tr("reconnect", "Reconnect"),
              ),
            ),
          ),
        React.createElement(
          "div",
          { className: "max-w-4xl mx-auto px-4 py-6" },
          React.createElement(
            "div",
            {
              className:
                "mhub-premium-surface rounded-2xl overflow-hidden",
              style: { height: "calc(100vh - 240px)" },
            },
            React.createElement(
              "div",
              { className: "flex h-full" },
              React.createElement(
                "div",
                {
                  className: `w-full md:w-1/3 border-r dark:border-gray-700 flex flex-col ${selectedConversation ? "hidden md:flex" : "flex"}`,
                },
                React.createElement(
                  "div",
                  { className: "p-4 border-b dark:border-gray-700 dark:border-b" },
                  React.createElement(
                    "div",
                    { className: "relative" },
                    React.createElement(Search, {
                      className:
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-300",
                    }),
                    React.createElement(Input, {
                      placeholder: tr("search_conversations", "Search conversations..."),
                      value: searchQuery,
                      onChange: (evt) => setSearchQuery(evt.target.value),
                      className: "pl-10",
                    }),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex-1 overflow-y-auto" },
                  filteredConversations.length === 0
                    ? React.createElement(
                        "div",
                        { className: "p-8 text-center text-gray-500 dark:text-center dark:text-gray-300" },
                        React.createElement(MessageCircle, {
                          className: "w-12 h-12 mx-auto mb-4 opacity-50",
                        }),
                          React.createElement(
                          "p",
                          null,
                          searchFilter
                            ? tr("no_matching_conversations", "No matching conversations")
                            : tr("no_conversations_yet", "No conversations yet"),
                        ),
                        !searchFilter &&
                          React.createElement(
                            "p",
                            { className: "text-sm" },
                            tr(
                              "start_chatting_hint",
                              "Start chatting by inquiring on a post",
                            ),
                          ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "mt-4 flex flex-wrap justify-center gap-2",
                          },
                            React.createElement(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                onClick: () => navigate("/all-posts"),
                              },
                              tr("browse_listings", "Browse Listings"),
                            ),
                            React.createElement(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                variant: "outline",
                                onClick: () => navigate("/for-you"),
                              },
                              tr("for_you", "For You"),
                            ),
                        ),
                      )
                    : filteredConversations.map((conv) =>
                        React.createElement(
                          "div",
                          {
                            key: conv.conversation_id,
                            onClick: () => selectConversation(conv),
                            className: `p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 transition dark:hover:bg-gray-950 dark:border-b ${selectedConversation?.conversation_id === conv.conversation_id ? "bg-blue-50 dark:bg-gray-700" : ""}`,
                          },
                          React.createElement(
                            "div",
                            { className: "flex items-center gap-3" },
                            React.createElement(
                              Avatar,
                              null,
                              React.createElement(AvatarImage, { src: conv.other_avatar }),
                              React.createElement(
                                AvatarFallback,
                                null,
                                conv.other_name?.[0] ||
                                  conv.other_username?.[0] ||
                                  "U",
                              ),
                            ),
                            React.createElement(
                              "div",
                              { className: "flex-1 min-w-0" },
                              React.createElement(
                                "div",
                                {
                                  className:
                                    "flex justify-between items-center",
                                },
                                React.createElement(
                                  "h3",
                                  {
                                    className:
                                      "font-semibold text-gray-900 dark:text-white truncate dark:text-gray-100",
                                  },
                                  conv.other_name || conv.other_username,
                                ),
                                React.createElement(
                                  "span",
                                  { className: "text-xs text-gray-500 dark:text-gray-300" },
                                  formatTime(conv.last_message_time),
                                ),
                              ),
                              React.createElement(
                                "p",
                                { className: "text-sm text-gray-500 truncate dark:text-gray-300" },
                                conv.last_message,
                              ),
                              conv.post_title &&
                                React.createElement(
                                  Badge,
                                  {
                                    variant: "secondary",
                                    className: "text-xs mt-1",
                                  },
                                  conv.post_title,
                                ),
                            ),
                            conv.unread_count > 0 &&
                              React.createElement(
                                Badge,
                                { className: "bg-blue-600 dark:bg-blue-700/40" },
                                conv.unread_count,
                              ),
                          ),
                        ),
                      ),
                ),
              ),
              React.createElement(
                "div",
                {
                  className: `flex-1 flex flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`,
                },
                selectedConversation
                  ? React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(
                        "div",
                        {
                          className:
                            "p-4 border-b dark:border-gray-700 flex items-center gap-3 dark:border-b",
                        },
                        React.createElement(
                          Button,
                          {
                            variant: "ghost",
                            size: "icon",
                            className: "md:hidden",
                            onClick: () => setSelectedConversation(null),
                          },
                          React.createElement(ArrowLeft, { className: "w-5 h-5" }),
                        ),
                        React.createElement(
                          Avatar,
                          null,
                          React.createElement(AvatarImage, { src: selectedConversation.other_avatar }),
                          React.createElement(AvatarFallback, null, selectedConversation.other_name?.[0] || "U"),
                        ),
                        React.createElement(
                          "div",
                          { className: "flex-1" },
                          React.createElement(
                            "h3",
                            { className: "font-semibold" },
                            selectedConversation.other_name || selectedConversation.other_username,
                          ),
                            React.createElement(
                            "p",
                            { className: "text-sm text-gray-500 dark:text-gray-300" },
                            selectedConversation.post_title
                              ? tr(
                                  "chat_re_prefix",
                                  "Re: {{title}} | ",
                                  { title: selectedConversation.post_title },
                                )
                              : "",
                            isOtherUserOnline
                              ? tr("status_online", "Online")
                              : tr("status_offline", "Offline"),
                          ),
                        ),
                      ),
                      React.createElement(
                        "div",
                        { className: "flex-1 overflow-y-auto p-4 space-y-4" },
                        loadingMessages
                          ? React.createElement(
                              "div",
                              {
                                className:
                                  "h-full flex items-center justify-center",
                              },
                              React.createElement("div", {
                                className:
                                  "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-b-2 dark:border-blue-500/40",
                              }),
                            )
                          : messagesError
                            ? React.createElement(
                                "div",
                                {
                                  className:
                                    "rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 p-4 text-sm text-red-700 dark:border dark:border-red-600/40 dark:bg-red-950/20 dark:text-red-300",
                                },
                                React.createElement(
                                  "p",
                                  { className: "font-medium" },
                                  messagesError,
                                ),
                                React.createElement(
                                  "div",
                                  { className: "mt-3" },
                                  React.createElement(
                                    Button,
                                    {
                                      type: "button",
                                      size: "sm",
                                      className:
                                        "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700/40 dark:hover:bg-red-700/40 dark:text-white",
                                      onClick: () => fetchMessages(selectedConversation.conversation_id),
                                    },
                                    tr("retry", "Retry"),
                                  ),
                                ),
                              )
                            : messages.length === 0
                              ? React.createElement(
                                  "div",
                                  {
                                    className:
                                      "h-full flex items-center justify-center",
                                  },
                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "text-center text-gray-500 max-w-sm dark:text-center dark:text-gray-300",
                                    },
                                    React.createElement(MessageCircle, {
                                      className:
                                        "w-12 h-12 mx-auto mb-3 opacity-50",
                                    }),
                                    React.createElement(
                                      "p",
                                      {
                                        className:
                                          "font-medium text-gray-700 dark:text-gray-300 dark:text-gray-200",
                                      },
                                      tr("no_messages_yet", "No messages yet"),
                                    ),
                                    React.createElement(
                                      "p",
                                      { className: "text-sm mt-1" },
                                      tr(
                                        "start_conversation_hint",
                                        "Start the conversation to close this deal faster.",
                                      ),
                                    ),
                                    React.createElement(
                                      "div",
                                      {
                                        className:
                                          "mt-4 flex flex-wrap justify-center gap-2",
                                      },
                                      selectedConversation.post_id
                                        ? React.createElement(
                                            Button,
                                            {
                                              type: "button",
                                              size: "sm",
                                              variant: "outline",
                                            onClick: () =>
                                              navigate(`/post/${selectedConversation.post_id}`),
                                          },
                                          tr("view_listing", "View Listing"),
                                        )
                                      : null,
                              React.createElement(
                                Button,
                                        {
                                          type: "button",
                                          size: "sm",
                                          onClick: () => navigate("/all-posts"),
                                        },
                                        tr("explore_listings", "Explore Listings"),
                                      ),
                                    ),
                                  ),
                                )
                              : messages.map((msg, index) => {
                                  const isMine =
                                    Number.parseInt(msg.sender_id, 10) === currentUserId;
                                  const statusRaw = String(
                                    msg.delivery_status || msg.status || "",
                                  ).toLowerCase();
                                  const statusLabel = msg.pending
                                    ? tr("sending", "Sending")
                                    : msg.failed || statusRaw === "failed"
                                      ? tr("failed", "Failed")
                                      : msg.is_read
                                        ? tr("read", "Read")
                                        : msg.delivered_at ||
                                            msg.is_delivered ||
                                            statusRaw === "delivered"
                                          ? tr("delivered", "Delivered")
                                          : tr("sent", "Sent");
                                  return React.createElement(
                                    "div",
                                    {
                                      key:
                                        msg.id ||
                                        msg.message_id ||
                                        `${msg.sender_id}-${msg.created_at}-${index}`,
                                      className: `flex ${isMine ? "justify-end" : "justify-start"}`,
                                    },
                                    React.createElement(
                                      "div",
                                      {
                                        className: `max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 dark:bg-gray-700 rounded-bl-sm"}`,
                                      },
                                      React.createElement("p", null, msg.content),
                                      React.createElement(
                                        "div",
                                        {
                                          className:
                                            "mt-1 flex items-center justify-between gap-2 text-xs",
                                        },
                                        React.createElement(
                                          "span",
                                          {
                                            className: isMine
                                              ? "text-blue-100"
                                              : "text-gray-500",
                                          },
                                          formatTime(msg.created_at),
                                        ),
                                        isMine &&
                                          React.createElement(
                                            "span",
                                            {
                                              className:
                                                statusLabel === "Failed"
                                                  ? "text-red-200"
                                                  : "text-blue-100",
                                              "aria-label": `Delivery status: ${statusLabel}`,
                                            },
                                            statusLabel,
                                          ),
                                      ),
                                    ),
                                  );
                                }),
                        isTyping &&
                          React.createElement(
                            "p",
                            { className: "text-xs text-gray-500 dark:text-gray-300" },
                            tr("is_typing", "{{name}} is typing...", {
                              name: typingUser || tr("someone", "Someone"),
                            }),
                          ),
                        React.createElement("div", { ref: messagesEndRef }),
                      ),
                      React.createElement(
                        "div",
                        { className: "p-4 border-t dark:border-gray-700 dark:border-t" },
                        sendError &&
                          React.createElement(
                            "div",
                            {
                              className:
                                "mb-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 p-2 text-xs text-red-700 flex items-center justify-between gap-2 dark:border dark:border-red-600/40 dark:bg-red-950/20 dark:text-red-300",
                            },
                            React.createElement(
                              "span",
                              { className: "flex items-center gap-1" },
                              React.createElement(AlertCircle, { className: "w-3.5 h-3.5" }),
                              sendError,
                            ),
                            React.createElement(
                              Button,
                              {
                                type: "button",
                                size: "sm",
                                variant: "outline",
                                className:
                                  "h-7 px-2 border-red-300 text-red-700 dark:border-red-600/40 dark:text-red-300",
                                  onClick: handleSend,
                                },
                              React.createElement(RotateCcw, {
                                className: "w-3 h-3 mr-1",
                              }),
                              tr("retry", "Retry"),
                            ),
                          ),
                        React.createElement(
                          "div",
                          { className: "flex gap-2" },
                          React.createElement(Input, {
                            placeholder: tr("type_message", "Type a message..."),
                            value: messageInput,
                            onChange: handleInputChange,
                            onKeyDown: (evt) => {
                              evt.key === "Enter" &&
                                !evt.shiftKey &&
                                (evt.preventDefault(), handleSend());
                            },
                            className: "flex-1",
                          }),
                          React.createElement(
                            Button,
                            {
                              onClick: handleSend,
                              disabled: sending || !messageInput.trim() || connectionStatus === "offline",
                              className: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700/40 dark:hover:bg-blue-700/40",
                            },
                            React.createElement(Send, { className: "w-5 h-5" }),
                          ),
                        ),
                      ),
                    )
                  : React.createElement(
                      "div",
                      { className: "flex-1 flex items-center justify-center" },
                      React.createElement(
                        "div",
                        { className: "text-center text-gray-500 dark:text-center dark:text-gray-300" },
                        React.createElement(MessageCircle, {
                          className: "w-16 h-16 mx-auto mb-4 opacity-50",
                        }),
                        React.createElement(
                          "p",
                          { className: "text-lg" },
                          tr(
                            "select_conversation",
                            "Select a conversation to start chatting",
                          ),
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "mt-4 flex flex-wrap justify-center gap-2",
                          },
                          React.createElement(
                            Button,
                            {
                              type: "button",
                              size: "sm",
                              onClick: () => navigate("/all-posts"),
                            },
                            tr("browse_listings", "Browse Listings"),
                          ),
                          React.createElement(
                            Button,
                            {
                              type: "button",
                              size: "sm",
                              variant: "outline",
                              onClick: () => navigate("/for-you"),
                            },
                            React.createElement(Compass, { className: "w-4 h-4 mr-1" }),
                            tr("for_you", "For You"),
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
var ChatPageDefault = ChatPage;

// Chat-specific error boundary wrapper (#90)
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error("[Chat ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement(
        "div",
        { className: "flex flex-col items-center justify-center min-h-[60vh] p-6 text-center" },
        React.createElement(MessageCircle, { className: "w-12 h-12 text-gray-400 mb-4" }),
        React.createElement("h2", { className: "text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2" }, "Chat encountered an error"),
        React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-4" }, "Something went wrong. Please try refreshing."),
        React.createElement(
          "button",
          {
            type: "button",
            className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition",
            onClick: () => { this.setState({ hasError: false }); },
          },
          "Retry"
        ),
      );
    }
    return this.props.children;
  }
}

const ChatWithBoundary = (props) =>
  React.createElement(ChatErrorBoundary, null, React.createElement(ChatPage, props));

export { ChatWithBoundary as default };
