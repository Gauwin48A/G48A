import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useRealtimeChat } from "../hooks/useRealtimeChat";
import api from "../services/api";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  MessageSquare,
  ArrowLeft,
  User,
  CheckCheck,
  Clock,
  ShieldCheck,
  Search,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlSellerId = searchParams.get("sellerId");
  const urlPostId = searchParams.get("postId");
  const urlTitle = searchParams.get("title");

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [inputText, setInputText] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Current user info from localStorage session
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser.user_id || currentUser.id || null;

  // Connect active room to Pusher / real-time hook
  const activeRoomId = activeConv ? activeConv.id || activeConv.conversationId : null;
  const { messages, sendMessage, isConnected, isLoading: messagesLoading } = useRealtimeChat(activeRoomId, currentUserId);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user conversations
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const res = await api.get("/api/chat/conversations");
      const data = res.data?.conversations || res.data || [];
      
      let convList = Array.isArray(data) ? data : [];

      // If URL params exist and no conversation matches, inject an active draft
      if (urlSellerId && !convList.some(c => c.sellerId === urlSellerId || c.id === urlSellerId)) {
        const draftConv = {
          id: `conv_${urlSellerId}_${urlPostId || 'general'}`,
          sellerId: urlSellerId,
          recipientName: searchParams.get("sellerName") || "Seller",
          postTitle: urlTitle || "Inquired Item",
          lastMessage: "Drafting message...",
          updatedAt: new Date().toISOString(),
          unreadCount: 0
        };
        convList = [draftConv, ...convList];
        setActiveConv(draftConv);
      } else if (convList.length > 0 && !activeConv) {
        setActiveConv(convList[0]);
      }

      setConversations(convList);
    } catch (err) {
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }, [urlSellerId, urlPostId, urlTitle, searchParams, activeConv]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv) return;

    const textToSend = inputText.trim();
    setInputText("");

    try {
      await sendMessage(textToSend);
      // Update local conversation last message
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConv.id
            ? { ...c, lastMessage: textToSend, updatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      toast({
        title: "Message Failed",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredConvs = conversations.filter(c =>
    c.recipientName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.postTitle?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 h-[calc(100vh-5rem)]">
      <div className="bg-card border rounded-2xl shadow-xl overflow-hidden h-full flex flex-col md:flex-row">
        
        {/* Left Sidebar: Conversations List */}
        <div className={`w-full md:w-80 border-r flex flex-col bg-slate-50/50 dark:bg-slate-900/50 ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Messages
              </h2>
              {isConnected && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
                  Live Sync
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {loadingConvs ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Loading conversations...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground space-y-2">
                <Store className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-sm font-medium">No active chats yet</p>
                <p className="text-xs">Inquire on any post to start chatting with a seller!</p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeConv?.id === conv.id ? "bg-primary/10 border-l-4 border-primary" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 border">
                      <AvatarImage src={conv.avatarUrl} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {conv.recipientName?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm truncate">
                          {conv.recipientName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(conv.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-primary/80 truncate mb-1">
                        {conv.postTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Chat Messages Thread */}
        <div className={`flex-1 flex flex-col bg-background ${!activeConv ? 'hidden md:flex' : 'flex'}`}>
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setActiveConv(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10 border">
                    <AvatarImage src={activeConv.avatarUrl} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {activeConv.recipientName?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base leading-none">
                        {activeConv.recipientName}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Item: <span className="font-medium text-foreground">{activeConv.postTitle}</span>
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/post/${urlPostId || ''}`)}
                >
                  View Listing
                </Button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
                {messagesLoading ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    Syncing conversation history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-sm">Start your conversation regarding "{activeConv.postTitle}"</p>
                    <p className="text-xs">Ask about availability, pricing, or inspection location.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = String(msg.sender_id || msg.senderId) === String(currentUserId);
                    return (
                      <div
                        key={msg.message_id || index}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-card border text-card-foreground rounded-bl-none"
                          }`}
                        >
                          <p className="leading-relaxed">{msg.content || msg.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at || Date.now()).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSend} className="p-3 border-t bg-card flex items-center gap-2">
                <Input
                  placeholder="Type a message to the seller..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!inputText.trim()}>
                  <Send className="w-4 h-4 mr-1" />
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <h3 className="text-lg font-bold text-foreground">No Chat Selected</h3>
              <p className="text-sm max-w-sm mt-1">
                Select a conversation from the left menu or click "Chat with Seller" on any item page to begin.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Chat;
