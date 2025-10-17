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
      <div className="main-container px-2 py-4 sm:px-4 sm:py-8" style={{maxWidth: '600px', margin: '0 auto'}}>
        {/* Banner */}
        <div className="w-full flex flex-col items-center justify-center py-8 bg-gradient-to-r from-blue-100 to-blue-300 rounded-2xl mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none select-none">
            <svg width="100%" height="100%" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="300" cy="60" rx="300" ry="60" fill="#3b82f6" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-4xl mb-2">🔔</span>
            <h1 className="text-3xl font-extrabold text-black mt-2 mb-1 drop-shadow">Notifications</h1>
            <p className="text-base text-black font-medium">Stay updated with your account activity</p>
            <button className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 text-lg font-bold" onClick={()=>window.location.href='/'}>Back to Home</button>
          </div>
        </div>
        {/* Controls */}
        <div className="w-full flex items-center justify-between mb-6">
          <Button variant="outline" className="text-blue-600 border-blue-600 font-bold shadow hover:scale-105 px-6 py-2 text-lg" onClick={markAllAsRead}>Mark All Read</Button>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-6 py-2 ml-6">{unreadCount} unread notifications</Badge>
          )}
        </div>
        {/* Notification List */}
        <div className="w-full flex flex-col gap-6 pb-10">
          {displayedNotifications.length === 0 ? (
            <div className="text-center text-gray-400 py-16 text-2xl font-bold">No notifications yet.</div>
          ) : (
            displayedNotifications.map((notif, idx) => (
              <Card key={notif.notification_id || notif.id || idx} className={`shadow-lg border-0 rounded-2xl px-8 py-6 flex items-center justify-between ${notif.read ? 'bg-white' : 'bg-blue-50'} hover:scale-[1.01] transition-all duration-200`}>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xl text-blue-900 mb-1">{notif.title || 'Notification'}</div>
                    <div className="text-gray-600 text-base mb-1">{notif.message}</div>
                    <div className="text-gray-400 text-sm mt-1">{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</div>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  {!notif.read && <Check className="w-7 h-7 text-green-500 cursor-pointer" title="Mark as read" onClick={() => markAsRead(notif.notification_id || notif.id)} />}
                  <X className="w-7 h-7 text-red-500 cursor-pointer" title="Delete" onClick={() => deleteNotification(notif.notification_id || notif.id)} />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
