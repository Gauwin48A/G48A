import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, Clock, Shield, DollarSign, User, AlertTriangle } from "lucide-react";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const userId = localStorage.getItem('userId') || 1;
    fetch(`${baseUrl}/api/notifications?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch notifications');
        }
      })
      .catch(err => setError(err.message || 'Failed to fetch notifications'))
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      (notif.notification_id || notif.id) === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(notif => (notif.notification_id || notif.id) !== id));
  };

  const handleRetry = () => window.location.reload();

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayedNotifications = notifications;

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>;
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col items-center">
      <button className="self-start mt-4 ml-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={()=>window.location.href='/'}>Back to Home</button>
      <div className="max-w-4xl mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600">Stay updated with your account activity</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="border-sky-500 text-sky-600 hover:bg-sky-50"
              >
                Mark All Read
              </Button>
            )}
          </div>
          
          {unreadCount > 0 && (
            <div className="mt-4">
              <Badge className="bg-red-500 text-white">
                {unreadCount} unread notifications
              </Badge>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
          {displayedNotifications.length > 0 ? (
            displayedNotifications.map((notification) => {
              // Backend notifications may not have icon/color/bgColor, so fallback
              let IconComponent = Bell;
              let color = 'text-gray-400';
              let bgColor = 'bg-gray-100';
              if (notification.type === 'sale') { IconComponent = DollarSign; color = 'text-green-600'; bgColor = 'bg-green-50'; }
              if (notification.type === 'security') { IconComponent = Shield; color = 'text-red-600'; bgColor = 'bg-red-50'; }
              if (notification.type === 'reward') { IconComponent = DollarSign; color = 'text-yellow-600'; bgColor = 'bg-yellow-50'; }
              if (notification.type === 'referral') { IconComponent = User; color = 'text-blue-600'; bgColor = 'bg-blue-50'; }
              if (notification.type === 'system') { IconComponent = Clock; color = 'text-orange-600'; bgColor = 'bg-orange-50'; }
              return (
                <Card 
                  key={notification.notification_id || notification.id} 
                  className={`shadow-lg border-0 rounded-2xl overflow-hidden transition-all hover:shadow-xl ${
                    !notification.read ? 'ring-2 ring-sky-200' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className={`w-6 h-6 ${color}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title || notification.message?.slice(0, 30) || 'Notification'}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              {notification.timestamp || notification.created_at}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.read && (
                              <Button
                                onClick={() => markAsRead(notification.notification_id || notification.id)}
                                size="sm"
                                variant="ghost"
                                className="text-sky-600 hover:bg-sky-50"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteNotification(notification.notification_id || notification.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Notifications</h3>
                <p className="text-gray-500">You're all caught up! Check back later for updates.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
