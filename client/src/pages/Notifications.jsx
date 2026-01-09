import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import {
  Bell, Check, Trash2, Package, DollarSign, Shield, Heart,
  AlertCircle, MessageCircle, Gift, ChevronRight, RefreshCw,
  Sparkles, TrendingUp, ShoppingBag, Star, Zap, Clock, Filter,
  CheckCheck, X, MoreHorizontal, ArrowLeft
} from "lucide-react";
import PageHeader from '../components/PageHeader';

const Notifications = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showActions, setShowActions] = useState(false);

  // Sample realistic notifications for demo
  const sampleNotifications = [
    {
      id: 1,
      type: 'order',
      title: '🎉 Order Confirmed!',
      message: 'Your order #MH2024001 for iPhone 14 Pro has been confirmed. Seller will ship within 24 hours.',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      read: false,
      icon: 'package',
      priority: 'high',
      action: { label: 'Track Order', path: '/orders/MH2024001' }
    },
    {
      id: 2,
      type: 'payment',
      title: '💰 Ka-ching! Payment Received',
      message: '₹45,000 has been credited to your wallet for the sale of Samsung Galaxy S24.',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: false,
      icon: 'money',
      priority: 'high',
      action: { label: 'View Wallet', path: '/wallet' }
    },
    {
      id: 3,
      type: 'like',
      title: '❤️ Your Post is Trending!',
      message: '15 people liked your MacBook Pro M2 listing in the last hour. Your post is gaining traction!',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      read: false,
      icon: 'heart',
      priority: 'medium',
      action: { label: 'View Stats', path: '/my-home' }
    },
    {
      id: 4,
      type: 'promo',
      title: '✨ Flash Sale: Premium Listing FREE!',
      message: 'List your item as Premium for FREE today only! Get 10x more visibility and sell faster.',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      read: true,
      icon: 'gift',
      priority: 'medium',
      action: { label: 'Claim Now', path: '/tier-selection' }
    },
    {
      id: 5,
      type: 'message',
      title: '💬 New Message from Buyer',
      message: 'Rahul S. asked: "Is the laptop still available? Can we negotiate the price?"',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      read: true,
      icon: 'message',
      priority: 'medium',
      action: { label: 'Reply Now', path: '/messages' }
    },
    {
      id: 6,
      type: 'security',
      title: '🔐 New Login Detected',
      message: 'Login from Chrome on Windows in Hyderabad. If this wasn\'t you, secure your account immediately.',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      read: true,
      icon: 'security',
      priority: 'high',
      action: { label: 'Review Activity', path: '/profile' }
    },
    {
      id: 7,
      type: 'reward',
      title: '🏆 Congratulations! You earned 500 points',
      message: 'You completed 5 successful sales this month. Redeem your points for exclusive discounts!',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      read: true,
      icon: 'star',
      priority: 'low',
      action: { label: 'View Rewards', path: '/rewards' }
    },
    {
      id: 8,
      type: 'price_drop',
      title: '📉 Price Drop Alert!',
      message: 'iPhone 13 in your wishlist is now ₹5,000 cheaper. Don\'t miss this deal!',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      read: true,
      icon: 'trending',
      priority: 'medium',
      action: { label: 'View Item', path: '/wishlist' }
    }
  ];

  useEffect(() => {
    setLoading(true);
    const userId = localStorage.getItem('userId') || 1;
    api.get(`/api/notifications?userId=${userId}`)
      .then(res => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setNotifications(data);
        } else {
          setNotifications(sampleNotifications);
        }
        setError(null);
      })
      .catch(() => {
        setNotifications(sampleNotifications);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (iconType) => {
    const iconClass = "w-5 h-5";
    switch (iconType) {
      case 'package': return <Package className={`${iconClass} text-blue-500`} />;
      case 'money': return <DollarSign className={`${iconClass} text-emerald-500`} />;
      case 'gift': return <Gift className={`${iconClass} text-purple-500`} />;
      case 'message': return <MessageCircle className={`${iconClass} text-indigo-500`} />;
      case 'security': return <Shield className={`${iconClass} text-orange-500`} />;
      case 'heart': return <Heart className={`${iconClass} text-pink-500`} />;
      case 'star': return <Star className={`${iconClass} text-yellow-500`} />;
      case 'trending': return <TrendingUp className={`${iconClass} text-green-500`} />;
      case 'alert': return <AlertCircle className={`${iconClass} text-red-500`} />;
      default: return <Bell className={`${iconClass} text-blue-500`} />;
    }
  };

  const getGradientBg = (iconType, isRead) => {
    const opacity = isRead ? '20' : '30';
    switch (iconType) {
      case 'package': return `bg-gradient-to-br from-blue-500/${opacity} to-blue-600/${opacity}`;
      case 'money': return `bg-gradient-to-br from-emerald-500/${opacity} to-emerald-600/${opacity}`;
      case 'gift': return `bg-gradient-to-br from-purple-500/${opacity} to-pink-500/${opacity}`;
      case 'message': return `bg-gradient-to-br from-indigo-500/${opacity} to-blue-500/${opacity}`;
      case 'security': return `bg-gradient-to-br from-orange-500/${opacity} to-red-500/${opacity}`;
      case 'heart': return `bg-gradient-to-br from-pink-500/${opacity} to-rose-500/${opacity}`;
      case 'star': return `bg-gradient-to-br from-yellow-500/${opacity} to-amber-500/${opacity}`;
      case 'trending': return `bg-gradient-to-br from-green-500/${opacity} to-emerald-500/${opacity}`;
      default: return `bg-gradient-to-br from-blue-500/${opacity} to-indigo-500/${opacity}`;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(notif =>
      (notif.notification_id || notif.id) === id ? { ...notif, read: true } : notif
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => (notif.notification_id || notif.id) !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    setNotifications(prev => prev.filter(notif => !selectedIds.has(notif.notification_id || notif.id)));
    setSelectedIds(new Set());
    setShowActions(false);
  }, [selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-purple-200 font-medium animate-pulse">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 pb-28">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <PageHeader
        title={t('notifications') || 'Notifications'}
        rightAction={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-purple-300" />
            </button>
          </div>
        }
        className="bg-slate-900/90 border-slate-700 text-white"
        transparent={false}
      />

      {/* Sub-header / Stats */}
      <div className="relative z-10 px-4 mb-4">
        <div className="max-w-2xl mx-auto pt-2">
          <p className="text-purple-300 text-sm mb-4 ps-2">
            {unreadCount > 0 ? `${unreadCount} ${t('new_updates') || 'new updates'}` : t('all_caught_up') || 'You\'re all caught up!'}
          </p>

          {/* Quick Actions */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-xl transition-all text-sm font-medium text-purple-200 mb-4"
            >
              <CheckCheck className="w-4 h-4" />
              {t('mark_all_as_read') || 'Mark all as read'}
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { key: 'all', label: 'All', count: notifications.length, icon: Sparkles },
              { key: 'unread', label: 'Unread', count: unreadCount, icon: Zap },
              { key: 'read', label: 'Read', count: notifications.length - unreadCount, icon: Check }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${filter === tab.key
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 text-purple-200 hover:bg-white/10 border border-white/10'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-xs ${filter === tab.key ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center">
                <Bell className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {filter === 'unread' ? (t('all_caught_up') || 'All caught up!') : (t('no_notifications') || 'No notifications')}
              </h3>
              <p className="text-purple-300/70">
                {filter === 'unread'
                  ? (t('read_all_notifications') || 'Great job! You\'ve read all your notifications.')
                  : (t('check_back_later') || 'Check back later for updates and offers.')
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif, index) => (
              <div
                key={notif.notification_id || notif.id}
                className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${!notif.read
                  ? 'bg-gradient-to-r from-white/10 to-white/5 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
                  }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Priority Indicator */}
                {notif.priority === 'high' && !notif.read && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                )}

                <div className="p-4 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl ${getGradientBg(notif.icon, notif.read)} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                    {getIcon(notif.icon)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold text-white ${!notif.read ? 'text-white' : 'text-gray-200'}`}>
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-purple-300/70 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(notif.created_at)}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300/80 line-clamp-2 mb-3">
                      {notif.message}
                    </p>

                    {/* Action Button */}
                    {notif.action && (
                      <button
                        onClick={() => {
                          markAsRead(notif.notification_id || notif.id);
                          navigate(notif.action.path);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-lg text-sm font-medium text-purple-200 transition-all group/btn"
                      >
                        {notif.action.label}
                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.notification_id || notif.id); }}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.notification_id || notif.id); }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Cards */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{notifications.length}</div>
              <div className="text-xs text-blue-300 mt-1">{t('total') || 'Total'}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{unreadCount}</div>
              <div className="text-xs text-purple-300 mt-1">{t('unread') || 'Unread'}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{notifications.length - unreadCount}</div>
              <div className="text-xs text-green-300 mt-1">{t('read') || 'Read'}</div>
            </div>
          </div>
        )}

        {/* Pro Tips */}
        <div className="mt-8 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-200 mb-1">{t('pro_tip') || 'Pro Tip'}</h4>
              <p className="text-sm text-amber-200/70">
                {t('enable_push_notifications') || 'Enable push notifications to never miss a buyer inquiry or price drop on your wishlist items!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
