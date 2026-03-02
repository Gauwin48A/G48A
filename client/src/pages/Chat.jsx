import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowLeft, Search, Wifi, WifiOff, AlertCircle, RotateCcw, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { socket } from '../lib/socket';

const Chat = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState('');
    const [sendError, setSendError] = useState('');
    const [connectionState, setConnectionState] = useState(socket.connected ? 'connected' : 'connecting');
    const messagesEndRef = useRef(null);

    // Real-time features
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);
    const lastTypingEmitRef = useRef(0);
    const selectedConversationRef = useRef(null);
    const messageRequestIdRef = useRef(0);

    const currentUserId = useMemo(() => {
        const rawUserId = localStorage.getItem('userId');
        const parsed = Number.parseInt(rawUserId || '', 10);
        return Number.isNaN(parsed) ? null : parsed;
    }, []);

    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await api.get('/chat/conversations');
            const payload = response?.data ?? response;
            setConversations(Array.isArray(payload?.conversations) ? payload.conversations : []);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to fetch conversations:', error);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (conversationId) => {
        const requestId = ++messageRequestIdRef.current;
        setMessagesLoading(true);
        setMessagesError('');
        try {
            const response = await api.get(`/chat/conversations/${conversationId}`);
            if (requestId !== messageRequestIdRef.current) {
                return;
            }
            const payload = response?.data ?? response;
            setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to fetch messages:', error);
            }
            if (requestId === messageRequestIdRef.current) {
                setMessages([]);
                setMessagesError('Unable to load this conversation right now.');
            }
        } finally {
            if (requestId === messageRequestIdRef.current) {
                setMessagesLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        if (!currentUserId) {
            return undefined;
        }

        if (!socket.connected) {
            setConnectionState('connecting');
            socket.connect();
        } else {
            setConnectionState('connected');
        }
        socket.emit('join_room', `user_${currentUserId}`);

        const handleNewMessage = (data) => {
            const activeConversation = selectedConversationRef.current;
            const incomingConversationId = data?.conversation_id;
            const incomingMessage = data?.message;

            if (activeConversation?.conversation_id === incomingConversationId && incomingMessage) {
                setMessages((prev) => {
                    const incomingId = incomingMessage.id ?? incomingMessage.message_id;
                    if (incomingId && prev.some((msg) => (msg.id ?? msg.message_id) === incomingId)) {
                        return prev;
                    }
                    return [...prev, incomingMessage];
                });
            }

            if (!incomingConversationId) {
                return;
            }

            setConversations((prev) => {
                const conversationIndex = prev.findIndex((conv) => conv.conversation_id === incomingConversationId);
                if (conversationIndex === -1) {
                    return prev;
                }

                const existingConversation = prev[conversationIndex];
                const updatedConversation = {
                    ...existingConversation,
                    last_message: incomingMessage?.content ?? existingConversation.last_message,
                    last_message_time: incomingMessage?.created_at ?? existingConversation.last_message_time,
                    unread_count: activeConversation?.conversation_id === incomingConversationId
                        ? 0
                        : (Number(existingConversation.unread_count) || 0) + 1
                };

                if (conversationIndex === 0) {
                    const cloned = [...prev];
                    cloned[0] = updatedConversation;
                    return cloned;
                }

                return [
                    updatedConversation,
                    ...prev.slice(0, conversationIndex),
                    ...prev.slice(conversationIndex + 1)
                ];
            });
        };

        const handleUserTyping = (data) => {
            const activeConversation = selectedConversationRef.current;
            const activeOtherId = Number.parseInt(activeConversation?.other_user_id, 10);
            const typingUserId = Number.parseInt(data?.user_id, 10);
            const matchesUser = !Number.isNaN(activeOtherId) && !Number.isNaN(typingUserId)
                ? activeOtherId === typingUserId
                : String(activeConversation?.other_user_id) === String(data?.user_id);
            if (matchesUser) {
                setIsTyping(true);
                setTypingUser(data?.username || 'Someone');
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                    setTypingUser(null);
                }, 3000);
            }
        };

        const handleUserStoppedTyping = (data) => {
            const activeConversation = selectedConversationRef.current;
            const activeOtherId = Number.parseInt(activeConversation?.other_user_id, 10);
            const typingUserId = Number.parseInt(data?.user_id, 10);
            const matchesUser = !Number.isNaN(activeOtherId) && !Number.isNaN(typingUserId)
                ? activeOtherId === typingUserId
                : String(activeConversation?.other_user_id) === String(data?.user_id);
            if (matchesUser) {
                setIsTyping(false);
                setTypingUser(null);
            }
        };

        const handleUserOnline = (data) => {
            const onlineId = Number.parseInt(data?.user_id, 10);
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.add(Number.isNaN(onlineId) ? data?.user_id : onlineId);
                return next;
            });
        };

        const handleUserOffline = (data) => {
            const offlineId = Number.parseInt(data?.user_id, 10);
            const normalized = Number.isNaN(offlineId) ? data?.user_id : offlineId;
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.delete(normalized);
                return next;
            });
        };

        const handleMessagesRead = (data) => {
            const activeConversation = selectedConversationRef.current;
            if (data?.conversation_id === activeConversation?.conversation_id) {
                setMessages((prev) => prev.map((msg) => ({ ...msg, is_read: true })));
            }
        };
        const handleSocketConnect = () => {
            setConnectionState('connected');
        };
        const handleSocketDisconnect = () => {
            setConnectionState('offline');
        };
        const handleSocketReconnectAttempt = () => {
            setConnectionState('reconnecting');
        };
        const handleSocketConnectError = () => {
            setConnectionState('offline');
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);
        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);
        socket.on('messages_read', handleMessagesRead);
        socket.on('connect', handleSocketConnect);
        socket.on('disconnect', handleSocketDisconnect);
        socket.on('reconnect_attempt', handleSocketReconnectAttempt);
        socket.on('connect_error', handleSocketConnectError);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stopped_typing', handleUserStoppedTyping);
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
            socket.off('messages_read', handleMessagesRead);
            socket.off('connect', handleSocketConnect);
            socket.off('disconnect', handleSocketDisconnect);
            socket.off('reconnect_attempt', handleSocketReconnectAttempt);
            socket.off('connect_error', handleSocketConnectError);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [currentUserId]);

    const handleTyping = useCallback((event) => {
        const value = event.target.value;
        setNewMessage(value);

        if (!selectedConversation) {
            return;
        }

        const now = Date.now();
        if (value.trim() && now - lastTypingEmitRef.current > 1000) {
            socket.emit('typing', {
                conversation_id: selectedConversation.conversation_id,
                receiver_id: selectedConversation.other_user_id
            });
            lastTypingEmitRef.current = now;
        }

        if (!value.trim()) {
            socket.emit('stopped_typing', {
                conversation_id: selectedConversation.conversation_id,
                receiver_id: selectedConversation.other_user_id
            });
        }
    }, [selectedConversation]);

    const sendMessage = useCallback(async () => {
        const content = newMessage.trim();
        if (!content || !selectedConversation || sending) return;

        setSending(true);
        setSendError('');
        try {
            const response = await api.post('/chat/send', {
                receiverId: selectedConversation.other_user_id,
                postId: selectedConversation.post_id,
                content
            });
            const payload = response?.data ?? response;
            const createdMessage = typeof payload?.message === 'object'
                ? payload.message
                : payload?.data || null;

            setMessages((prev) => {
                const createdMessageId = createdMessage?.id ?? createdMessage?.message_id;
                if (createdMessageId && prev.some((msg) => (msg.id ?? msg.message_id) === createdMessageId)) {
                    return prev;
                }

                return [...prev, createdMessage || {
                    sender_id: currentUserId,
                    content,
                    created_at: new Date().toISOString(),
                    sender_username: 'You'
                }];
            });

            setConversations((prev) => prev.map((conversation) =>
                conversation.conversation_id === selectedConversation.conversation_id
                    ? { ...conversation, last_message: content, last_message_time: new Date().toISOString() }
                    : conversation
            ));

            setNewMessage('');
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to send message:', error);
            }
            setSendError('Message failed to send. Check your connection and retry.');
        } finally {
            setSending(false);
        }
    }, [currentUserId, newMessage, selectedConversation, sending]);

    const selectConversation = useCallback((conversation) => {
        setSelectedConversation(conversation);
        setIsTyping(false);
        setTypingUser(null);
        setSendError('');
        setMessagesError('');
        setMessages([]);
        fetchMessages(conversation.conversation_id);
        setConversations((prev) => prev.map((conv) =>
            conv.conversation_id === conversation.conversation_id
                ? { ...conv, unread_count: 0 }
                : conv
        ));
    }, [fetchMessages]);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredConversations = useMemo(() => {
        if (!normalizedSearch) {
            return conversations;
        }

        return conversations.filter((conversation) => {
            const haystack = [
                conversation.other_name,
                conversation.other_username,
                conversation.post_title,
                conversation.last_message
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });
    }, [conversations, normalizedSearch]);

    const selectedOtherUserId = useMemo(() => {
        const parsed = Number.parseInt(selectedConversation?.other_user_id, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }, [selectedConversation]);

    const isSelectedUserOnline = selectedOtherUserId !== null
        && (onlineUsers.has(selectedOtherUserId) || onlineUsers.has(String(selectedOtherUserId)));

    const formatTime = useCallback((date) => {
        if (!date) {
            return '';
        }
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
            return '';
        }
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const connectionBannerLabel = connectionState === 'reconnecting'
        ? 'Reconnecting to chat service...'
        : connectionState === 'offline'
            ? 'Realtime chat disconnected. You can still retry sending manually.'
            : 'Connecting to chat service...';
    const connectionIsHealthy = connectionState === 'connected';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-6">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <MessageCircle className="w-6 h-6" /> Messages
                        </h1>
                        <p className="text-blue-100">Chat with buyers and sellers</p>
                    </div>
                </div>
            </div>

            {!connectionIsHealthy && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-amber-800">
                        <div className="flex items-center gap-2 text-sm">
                            {connectionState === 'offline' ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                            <span>{connectionBannerLabel}</span>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-800"
                            onClick={() => {
                                setConnectionState('connecting');
                                socket.connect();
                            }}
                        >
                            Reconnect
                        </Button>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
                    <div className="flex h-full">
                        {/* Conversations List */}
                        <div className={`w-full md:w-1/3 border-r dark:border-gray-700 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                            {/* Search */}
                            <div className="p-4 border-b dark:border-gray-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Search conversations..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Conversation Items */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredConversations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>{normalizedSearch ? 'No matching conversations' : 'No conversations yet'}</p>
                                        {!normalizedSearch && <p className="text-sm">Start chatting by inquiring on a post</p>}
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                            <Button type="button" size="sm" onClick={() => navigate('/all-posts')}>
                                                Browse Listings
                                            </Button>
                                            <Button type="button" size="sm" variant="outline" onClick={() => navigate('/my-recommendations')}>
                                                Find Recommendations
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <div
                                            key={conv.conversation_id}
                                            onClick={() => selectConversation(conv)}
                                            className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 transition ${selectedConversation?.conversation_id === conv.conversation_id ? 'bg-blue-50 dark:bg-gray-700' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={conv.other_avatar} />
                                                    <AvatarFallback>{conv.other_name?.[0] || conv.other_username?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                            {conv.other_name || conv.other_username}
                                                        </h3>
                                                        <span className="text-xs text-gray-500">{formatTime(conv.last_message_time)}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                                                    {conv.post_title && (
                                                        <Badge variant="secondary" className="text-xs mt-1">{conv.post_title}</Badge>
                                                    )}
                                                </div>
                                                {conv.unread_count > 0 && (
                                                    <Badge className="bg-blue-600">{conv.unread_count}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Messages View */}
                        <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
                            {selectedConversation ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
                                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
                                            <ArrowLeft className="w-5 h-5" />
                                        </Button>
                                        <Avatar>
                                            <AvatarImage src={selectedConversation.other_avatar} />
                                            <AvatarFallback>{selectedConversation.other_name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{selectedConversation.other_name || selectedConversation.other_username}</h3>
                                            <p className="text-sm text-gray-500">
                                                {selectedConversation.post_title ? `Re: ${selectedConversation.post_title} | ` : ''}
                                                {isSelectedUserOnline ? 'Online' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messagesLoading ? (
                                            <div className="h-full flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                            </div>
                                        ) : messagesError ? (
                                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                                <p className="font-medium">{messagesError}</p>
                                                <div className="mt-3">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                        onClick={() => fetchMessages(selectedConversation.conversation_id)}
                                                    >
                                                        Retry
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center">
                                                <div className="text-center text-gray-500 max-w-sm">
                                                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                    <p className="font-medium text-gray-700 dark:text-gray-300">No messages yet</p>
                                                    <p className="text-sm mt-1">Start the conversation to close this deal faster.</p>
                                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                                        {selectedConversation.post_id ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => navigate(`/post/${selectedConversation.post_id}`)}
                                                            >
                                                                View Listing
                                                            </Button>
                                                        ) : null}
                                                        <Button type="button" size="sm" onClick={() => navigate('/all-posts')}>
                                                            Explore Listings
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            messages.map((msg, idx) => (
                                                <div
                                                    key={msg.id || msg.message_id || `${msg.sender_id}-${msg.created_at}-${idx}`}
                                                    className={`flex ${Number.parseInt(msg.sender_id, 10) === currentUserId ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${Number.parseInt(msg.sender_id, 10) === currentUserId
                                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                                        : 'bg-gray-100 dark:bg-gray-700 rounded-bl-sm'
                                                        }`}>
                                                        <p>{msg.content}</p>
                                                        <p className={`text-xs mt-1 ${Number.parseInt(msg.sender_id, 10) === currentUserId ? 'text-blue-100' : 'text-gray-500'}`}>
                                                            {formatTime(msg.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {isTyping && (
                                            <p className="text-xs text-gray-500">
                                                {typingUser || 'Someone'} is typing...
                                            </p>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="p-4 border-t dark:border-gray-700">
                                        {sendError && (
                                            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-1">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    {sendError}
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 border-red-300 text-red-700"
                                                    onClick={sendMessage}
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    Retry
                                                </Button>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Type a message..."
                                                value={newMessage}
                                                onChange={handleTyping}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        sendMessage();
                                                    }
                                                }}
                                                className="flex-1"
                                            />
                                            <Button
                                                onClick={sendMessage}
                                                disabled={sending || !newMessage.trim() || connectionState === 'offline'}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Send className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center text-gray-500">
                                        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg">Select a conversation to start chatting</p>
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                            <Button type="button" size="sm" onClick={() => navigate('/all-posts')}>
                                                Browse Listings
                                            </Button>
                                            <Button type="button" size="sm" variant="outline" onClick={() => navigate('/my-recommendations')}>
                                                <Compass className="w-4 h-4 mr-1" />
                                                Find Matches
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
