import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Smartphone } from 'lucide-react';
import { isFirebaseConfigured, requestNotificationPermission, registerTokenWithBackend } from '../lib/firebase';

import { useTranslation } from 'react-i18next';

/**
 * Notification Permission Component
 * 
 * Shows a prompt to enable push notifications.
 * Appears after user logs in if they haven't granted permission.
 */
export default function NotificationPermission({ userId, onDismiss }) {
  const { t } = useTranslation();
    const [status, setStatus] = useState('idle'); // idle, requesting, granted, denied, not-configured
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if Firebase is configured
        if (!isFirebaseConfigured()) {
            setStatus('not-configured');
            return;
        }

        // Check current permission status
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                setStatus('granted');
            } else if (Notification.permission === 'denied') {
                setStatus('denied');
            } else {
                // Permission not yet requested - show prompt after delay
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const handleEnable = async () => {
        setStatus('requesting');

        const token = await requestNotificationPermission();

        if (token) {
            setStatus('granted');
            // Register with backend if user is logged in
            if (userId) {
                await registerTokenWithBackend(token, userId);
            }
            // Store token for later registration if not logged in
            localStorage.setItem('fcm_token', token);
            setShowPrompt(false);
        } else {
            setStatus('denied');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('notification_prompt_dismissed', 'true');
        onDismiss?.();
    };

    // Don't show if Firebase not configured
    if (status === 'not-configured') {
        return null;
    }

    // Don't show if already granted/denied or dismissed
    if (!showPrompt || status === 'granted') {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-2xl">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                    <X className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                        <h3 className="font-bold text-white mb-1">
                            Never Miss a Deal! 🔔
                        </h3>
                        <p className="text-white/80 text-sm mb-3">
                            Get instant alerts for new messages, price drops, and exclusive offers.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleEnable}
                                disabled={status === 'requesting'}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
                            >
                                {status === 'requesting' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                        Enabling...
                                    </>
                                ) : (
                                    <>
                                        <Bell className="w-4 h-4" />
                                        Enable
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 text-white/80 hover:text-white font-medium transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>

                {status === 'denied' && (
                    <p className="mt-3 text-white/70 text-xs text-center">
                        Notifications blocked. Enable them in your browser settings.
                    </p>
                )}
            </div>
        </div>
    );
}
