/**
 * useRealtimeChat Hook
 * Defender Prompt 4: Zero-Server Load Chat
 * 
 * Uses Pusher for realtime + optimistic updates
 * Chat runs without loading the Node.js server
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Pusher from 'pusher-js';
import api from '../lib/api';

// Pusher config from environment
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';
const DEFAULT_PAGE = 1;
const PAGE_SIZE = 50;

/**
 * Realtime chat hook with optimistic UI
 */
export const useRealtimeChat = (roomId, userId) => {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);

    const pusherRef = useRef(null);
    const channelRef = useRef(null);
    const pendingMessages = useRef(new Set());
    const loadMoreInFlightRef = useRef(false);
    const fetchRequestIdRef = useRef(0);
    const markReadInFlightRef = useRef(false);
    const userIdAsNumber = useMemo(() => {
        const parsed = Number.parseInt(userId, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }, [userId]);
    const normalizedRoomId = useMemo(
        () => (roomId === undefined || roomId === null ? '' : String(roomId).trim()),
        [roomId]
    );

    // Initialize Pusher connection
    useEffect(() => {
        if (!normalizedRoomId || !PUSHER_KEY) {
            if (import.meta.env.DEV) {
                console.log('[Chat] Pusher not configured, using polling fallback');
            }
            return;
        }

        try {
            pusherRef.current = new Pusher(PUSHER_KEY, {
                cluster: PUSHER_CLUSTER,
                forceTLS: true
            });

            const channelName = `chat-room-${normalizedRoomId}`;
            channelRef.current = pusherRef.current.subscribe(channelName);

            channelRef.current.bind('pusher:subscription_succeeded', () => {
                if (import.meta.env.DEV) {
                    console.log('[Chat] Connected to room:', normalizedRoomId);
                }
                setIsConnected(true);
            });

            channelRef.current.bind('pusher:subscription_error', (err) => {
                if (import.meta.env.DEV) {
                    console.error('[Chat] Subscription error:', err);
                }
                setError('Failed to connect to chat');
            });

            // Listen for new messages
            channelRef.current.bind('new-message', (data) => {
                const incomingIdRaw = data?.id ?? data?.message_id;
                const incomingId = incomingIdRaw === undefined || incomingIdRaw === null
                    ? ''
                    : String(incomingIdRaw);
                // Skip if this is our own message (already added optimistically)
                if (incomingId && pendingMessages.current.has(incomingId)) {
                    pendingMessages.current.delete(incomingId);
                    return;
                }

                setMessages((prev) => {
                    const normalizedIncomingId = incomingId || `${data?.senderId || ''}-${data?.createdAt || Date.now()}`;
                    if (prev.some((msg) => String(msg.message_id || msg.id) === String(normalizedIncomingId))) {
                        return prev;
                    }

                    return [...prev, {
                        message_id: normalizedIncomingId,
                        content: data?.content || '',
                        sender_id: data?.senderId,
                        created_at: data?.createdAt || new Date().toISOString(),
                        is_realtime: true
                    }];
                });
            });

        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('[Chat] Pusher init error:', err);
            }
            setError('Failed to initialize chat');
        }

        return () => {
            setIsConnected(false);
            if (channelRef.current) {
                channelRef.current.unbind_all();
                pusherRef.current?.unsubscribe(`chat-room-${normalizedRoomId}`);
            }
            if (pusherRef.current) {
                pusherRef.current.disconnect();
            }
        };
    }, [normalizedRoomId]);

    // Fetch initial messages
    useEffect(() => {
        if (!normalizedRoomId) {
            setMessages([]);
            setHasMore(true);
            setPage(DEFAULT_PAGE);
            setIsLoading(false);
            return;
        }

        const fetchMessages = async () => {
            const requestId = ++fetchRequestIdRef.current;
            try {
                setIsLoading(true);
                setError(null);
                const response = await api.get(`/api/chat/conversations/${encodeURIComponent(normalizedRoomId)}`, {
                    params: { page: DEFAULT_PAGE, limit: PAGE_SIZE }
                });
                if (requestId !== fetchRequestIdRef.current) {
                    return;
                }

                const payload = response?.data ?? response;
                const initialMessages = Array.isArray(payload?.messages) ? payload.messages : [];

                setMessages(initialMessages);
                setHasMore(initialMessages.length === PAGE_SIZE);
                setPage(DEFAULT_PAGE);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.error('[Chat] Fetch error:', err);
                }
                setError('Failed to load messages');
            } finally {
                if (requestId === fetchRequestIdRef.current) {
                    setIsLoading(false);
                }
            }
        };

        fetchMessages();
    }, [normalizedRoomId]);

    // Load older messages (infinite scroll upward)
    const loadMore = useCallback(async () => {
        if (!normalizedRoomId || !hasMore || isLoading || loadMoreInFlightRef.current) return;
        loadMoreInFlightRef.current = true;

        try {
            const nextPage = page + 1;
            const response = await api.get(`/api/chat/conversations/${encodeURIComponent(normalizedRoomId)}`, {
                params: { page: nextPage, limit: PAGE_SIZE }
            });

            const payload = response?.data ?? response;
            const olderMessages = Array.isArray(payload?.messages) ? payload.messages : [];
            if (olderMessages.length > 0) {
                setMessages((prev) => {
                    const knownIds = new Set(prev.map((msg) => String(msg.message_id || msg.id)));
                    const dedupedOlder = olderMessages.filter((msg) => {
                        const msgId = String(msg.message_id || msg.id);
                        if (!msgId) return true;
                        if (knownIds.has(msgId)) return false;
                        knownIds.add(msgId);
                        return true;
                    });
                    return [...dedupedOlder, ...prev];
                });
                setPage(nextPage);
            }
            setHasMore(olderMessages.length === PAGE_SIZE);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('[Chat] Load more error:', err);
            }
        } finally {
            loadMoreInFlightRef.current = false;
        }
    }, [normalizedRoomId, page, hasMore, isLoading]);

    // Send message with optimistic update
    const sendMessage = useCallback(async (content, receiverId) => {
        const normalizedContent = String(content || '').trim();
        if (!normalizedContent) return { success: false, error: 'Empty message' };

        // Generate temporary ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            message_id: tempId,
            content: normalizedContent,
            sender_id: userIdAsNumber,
            created_at: new Date().toISOString(),
            is_pending: true
        };

        // Add to UI immediately (optimistic)
        setMessages(prev => [...prev, optimisticMessage]);
        pendingMessages.current.add(tempId);

        try {
            const response = await api.post('/api/chat/send', {
                receiverId,
                content: normalizedContent,
                conversationId: normalizedRoomId
            });

            // Update the optimistic message with real data
            const payload = response?.data ?? response;
            const messagePayload = (payload && typeof payload === 'object')
                ? (payload.data || (typeof payload.message === 'object' ? payload.message : null))
                : null;
            const normalizedMessageId = messagePayload?.message_id || messagePayload?.id;
            const realMessage = messagePayload
                ? { ...messagePayload, message_id: normalizedMessageId || messagePayload.message_id }
                : null;

            pendingMessages.current.delete(tempId);
            if (realMessage?.message_id) {
                const realId = String(realMessage.message_id);
                pendingMessages.current.add(realId);
                // Keep pending-tracking bounded if realtime echo never arrives.
                setTimeout(() => pendingMessages.current.delete(realId), 30 * 1000);
            }

            if (pendingMessages.current.size > 500) {
                pendingMessages.current = new Set(Array.from(pendingMessages.current).slice(-250));
            }

            setMessages(prev => prev.map(msg =>
                msg.message_id === tempId
                    ? { ...(realMessage || msg), is_pending: false }
                    : msg
            ));

            return { success: true, message: realMessage || optimisticMessage };

        } catch (err) {
            // Mark message as failed
            setMessages(prev => prev.map(msg =>
                msg.message_id === tempId
                    ? { ...msg, is_pending: false, is_failed: true }
                    : msg
            ));
            pendingMessages.current.delete(tempId);

            return { success: false, error: err.message };
        }
    }, [normalizedRoomId, userIdAsNumber]);

    // Retry failed message
    const retryMessage = useCallback(async (messageId, content, receiverId) => {
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
        // Resend
        return sendMessage(content, receiverId);
    }, [sendMessage]);

    // Mark messages as read
    const markAsRead = useCallback(async () => {
        if (!normalizedRoomId || markReadInFlightRef.current) return;
        markReadInFlightRef.current = true;

        try {
            // Backend marks messages read when the conversation is fetched.
            await api.get(`/api/chat/conversations/${encodeURIComponent(normalizedRoomId)}`, {
                params: { page: 1, limit: 1 }
            });
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('[Chat] Mark read error:', err);
            }
        } finally {
            markReadInFlightRef.current = false;
        }
    }, [normalizedRoomId]);

    return {
        messages,
        isConnected,
        isLoading,
        error,
        hasMore,
        sendMessage,
        loadMore,
        retryMessage,
        markAsRead
    };
};

export default useRealtimeChat;
