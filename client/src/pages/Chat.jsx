import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowLeft, Search, MoreVertical, Check, CheckCheck } from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef(null);

    // Real-time features
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);

    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        fetchConversations();

        // Join user's room for real-time updates
        if (userId) {
            socket.emit('join_room', `user_${userId}`);
        }

        // Listen for new messages
        socket.on('new_message', (data) => {
            if (selectedConversation?.conversation_id === data.conversation_id) {
                setMessages(prev => [...prev, data.message]);
            }
            // Update conversation list with new message
            setConversations(prev => prev.map(conv =>
                conv.conversation_id === data.conversation_id
                    ? { ...conv, last_message: data.message.content, last_message_time: data.message.created_at }
                    : conv
            ));
        });

        // Listen for typing indicators
        socket.on('user_typing', (data) => {
            if (selectedConversation?.other_user_id === data.user_id) {
                setIsTyping(true);
                setTypingUser(data.username);
                // Auto-hide after 3 seconds
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
            }
        });

        socket.on('user_stopped_typing', (data) => {
            if (selectedConversation?.other_user_id === data.user_id) {
                setIsTyping(false);
            }
        });

        // Listen for online status
        socket.on('user_online', (data) => {
            setOnlineUsers(prev => new Set([...prev, data.user_id]));
        });

        socket.on('user_offline', (data) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.user_id);
                return newSet;
            });
        });

        // Listen for read receipts
        socket.on('messages_read', (data) => {
            if (data.conversation_id === selectedConversation?.conversation_id) {
                setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
            }
        });

        return () => {
            socket.off('new_message');
            socket.off('user_typing');
            socket.off('user_stopped_typing');
            socket.off('user_online');
            socket.off('user_offline');
            socket.off('messages_read');
            clearTimeout(typingTimeoutRef.current);
        };
    }, [selectedConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Emit typing event when user types
    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (selectedConversation && e.target.value) {
            socket.emit('typing', {
                conversation_id: selectedConversation.conversation_id,
                receiver_id: selectedConversation.other_user_id
            });
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await api.get('/api/chat/conversations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data.conversations || []);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (conversationId) => {
        try {
            const res = await api.get(`/api/chat/conversations/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.messages || []);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            await api.post('/api/chat/send', {
                receiverId: selectedConversation.other_user_id,
                postId: selectedConversation.post_id,
                content: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessages(prev => [...prev, {
                sender_id: parseInt(userId),
                content: newMessage,
                created_at: new Date().toISOString(),
                sender_username: 'You'
            }]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const selectConversation = (conv) => {
        setSelectedConversation(conv);
        fetchMessages(conv.conversation_id);
    };

    const formatTime = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

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
                                {conversations.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No conversations yet</p>
                                        <p className="text-sm">Start chatting by inquiring on a post</p>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
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
                                            {selectedConversation.post_title && (
                                                <p className="text-sm text-gray-500">Re: {selectedConversation.post_title}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.sender_id === parseInt(userId) ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === parseInt(userId)
                                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                                    : 'bg-gray-100 dark:bg-gray-700 rounded-bl-sm'
                                                    }`}>
                                                    <p>{msg.content}</p>
                                                    <p className={`text-xs mt-1 ${msg.sender_id === parseInt(userId) ? 'text-blue-100' : 'text-gray-500'}`}>
                                                        {formatTime(msg.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="p-4 border-t dark:border-gray-700">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Type a message..."
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                                className="flex-1"
                                            />
                                            <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700">
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
