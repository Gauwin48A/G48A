/**
 * useRealtimeChat Hook
 * Defender Prompt 4: Zero-Server Load Chat
 * 
 * Uses Pusher for realtime + optimistic updates
 * Chat runs without loading the Node.js server
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';
import api from '../lib/api';

// Pusher config from environment
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';

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

    // Initialize Pusher connection
    useEffect(() => {
        if (!roomId || !PUSHER_KEY) {
            console.log('[Chat] Pusher not configured, using polling fallback');
            return;
        }

        try {
            pusherRef.current = new Pusher(PUSHER_KEY, {
                cluster: PUSHER_CLUSTER,
                forceTLS: true
            });

            channelRef.current = pusherRef.current.subscribe(`chat-room-${roomId}`);

            channelRef.current.bind('pusher:subscription_succeeded', () => {
                console.log('[Chat] Connected to room:', roomId);
                setIsConnected(true);
            });

            channelRef.current.bind('pusher:subscription_error', (err) => {
                console.error('[Chat] Subscription error:', err);
                setError('Failed to connect to chat');
            });

            // Listen for new messages
            channelRef.current.bind('new-message', (data) => {
                // Skip if this is our own message (already added optimistically)
                if (pendingMessages.current.has(data.id)) {
                    pendingMessages.current.delete(data.id);
                    return;
                }

                setMessages(prev => [...prev, {
                    message_id: data.id,
                    content: data.content,
                    sender_id: data.senderId,
                    created_at: data.createdAt,
                    is_realtime: true
                }]);
            });

        } catch (err) {
            console.error('[Chat] Pusher init error:', err);
            setError('Failed to initialize chat');
        }

        return () => {
            if (channelRef.current) {
                channelRef.current.unbind_all();
                pusherRef.current?.unsubscribe(`chat-room-${roomId}`);
            }
            if (pusherRef.current) {
                pusherRef.current.disconnect();
            }
        };
    }, [roomId]);

    // Fetch initial messages
    useEffect(() => {
        if (!roomId) return;

        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('authToken');
                const res = await api.get(`/api/chat/conversations/${roomId}?page=1&limit=50`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setMessages(res.data.messages || []);
                setHasMore((res.data.messages || []).length === 50);
            } catch (err) {
                console.error('[Chat] Fetch error:', err);
                setError('Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();
    }, [roomId]);

    // Load older messages (infinite scroll upward)
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;

        try {
            const nextPage = page + 1;
            const token = localStorage.getItem('authToken');
            const res = await api.get(`/api/chat/conversations/${roomId}?page=${nextPage}&limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const olderMessages = res.data.messages || [];
            if (olderMessages.length > 0) {
                setMessages(prev => [...olderMessages, ...prev]);
                setPage(nextPage);
            }
            setHasMore(olderMessages.length === 50);
        } catch (err) {
            console.error('[Chat] Load more error:', err);
        }
    }, [roomId, page, hasMore, isLoading]);

    // Send message with optimistic update
    const sendMessage = useCallback(async (content, receiverId) => {
        if (!content.trim()) return { success: false, error: 'Empty message' };

        // Generate temporary ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            message_id: tempId,
            content,
            sender_id: parseInt(userId),
            created_at: new Date().toISOString(),
            is_pending: true
        };

        // Add to UI immediately (optimistic)
        setMessages(prev => [...prev, optimisticMessage]);
        pendingMessages.current.add(tempId);

        try {
            const token = localStorage.getItem('authToken');
            const res = await api.post('/api/chat/send', {
                receiverId,
                content,
                conversationId: roomId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update the optimistic message with real data
            const realMessage = res.data.data;
            pendingMessages.current.delete(tempId);
            pendingMessages.current.add(realMessage.message_id);

            setMessages(prev => prev.map(msg =>
                msg.message_id === tempId
                    ? { ...realMessage, is_pending: false }
                    : msg
            ));

            return { success: true, message: realMessage };

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
    }, [roomId, userId]);

    // Retry failed message
    const retryMessage = useCallback(async (messageId, content, receiverId) => {
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
        // Resend
        return sendMessage(content, receiverId);
    }, [sendMessage]);

    // Mark messages as read
    const markAsRead = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            await api.post(`/api/chat/read/${roomId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('[Chat] Mark read error:', err);
        }
    }, [roomId]);

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
