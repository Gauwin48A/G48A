import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Smartphone } from 'lucide-react';
import {
  isPushConfigured as isFirebaseConfigured,
  requestNotificationPermission,
  registerTokenWithBackend,
} from '../lib/pushService';

import { useTranslation } from 'react-i18next';

/**
 * Notification Permission Component
 * 
 * Shows a prompt to enable push notifications.
 * Appears after user logs in if they haven't granted permission.
 */
export default function NotificationPermission({ userId, onDismiss }) {
  const { t } = useTranslation();
  const tr = (key, fallback) => t(key, { defaultValue: fallback });
  const LAYOUT_STORAGE_KEY = "mhub_layout_preview_mode";
  const readLayoutMode = () => {
    if (typeof window === "undefined") return "desktop";
    const attr =
      typeof document !== "undefined"
        ? document.documentElement?.getAttribute("data-layout-preview")
        : "";
    const normalizedAttr = String(attr || "").trim().toLowerCase();
    if (normalizedAttr) return normalizedAttr;
    const stored = String(localStorage.getItem(LAYOUT_STORAGE_KEY) || "")
      .trim()
      .toLowerCase();
    return stored || "desktop";
  };
  const isSmallViewport = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(max-width: 767px)").matches;
  };
  const [status, setStatus] = useState('idle'); // idle, requesting, granted, denied, not-configured
  const [showPrompt, setShowPrompt] = useState(false);
  const [layoutMode, setLayoutMode] = useState(readLayoutMode);
  const baseDismissKey = "notification_prompt_dismissed";
  const dismissKey = userId
    ? `mhub:notifications:prompt:dismissed:${userId}`
    : baseDismissKey;
  const isMobilePreview = layoutMode === "mobile";
  const isDesktopPreview = layoutMode === "desktop";
  const shouldShowForViewport = (nextLayout) => {
    const mode = String(nextLayout || layoutMode || "").trim().toLowerCase();
    const isMobileMode = mode === "mobile";
    const isDesktopMode = mode === "desktop";
    return isMobileMode || (isDesktopMode && isSmallViewport());
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleLayoutChange = (event) => {
      const next = String(event?.detail?.mode || "").trim().toLowerCase();
      const resolved = next || readLayoutMode();
      setLayoutMode(resolved);
      if (!shouldShowForViewport(resolved)) {
        setShowPrompt(false);
      }
    };
    const handleResize = () => {
      const resolved = readLayoutMode();
      setLayoutMode(resolved);
      if (!shouldShowForViewport(resolved)) {
        setShowPrompt(false);
      }
    };
    window.addEventListener("mhub:layout-change", handleLayoutChange);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("mhub:layout-change", handleLayoutChange);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) {
      setShowPrompt(false);
      setStatus('idle');
      return;
    }
    const allowPromptContext =
      isMobilePreview || (isDesktopPreview && isSmallViewport());
    if (!allowPromptContext) {
      setShowPrompt(false);
      return;
    }
    const dismissed =
      localStorage.getItem(dismissKey) === "true" ||
      (dismissKey !== baseDismissKey &&
        localStorage.getItem(baseDismissKey) === "true");
    if (dismissed && dismissKey !== baseDismissKey) {
      localStorage.setItem(dismissKey, "true");
    }
    if (dismissed) {
      setShowPrompt(false);
      return;
    }

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      setStatus('not-configured');
      setShowPrompt(false);
      return;
    }

    // Check current permission status
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setStatus('granted');
        setShowPrompt(false);
      } else if (Notification.permission === 'denied') {
        setStatus('denied');
        setShowPrompt(true);
      } else {
        // Permission not yet requested - show prompt after delay
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [dismissKey, isMobilePreview, isDesktopPreview, layoutMode, userId]);

    const handleEnable = async () => {
        setStatus('requesting');

        try {
            const token = await requestNotificationPermission();

            if (token) {
                setStatus('granted');
                // Register with backend if user is logged in
                if (userId) {
                    await registerTokenWithBackend(token, userId);
                }
                // Store token for later registration if not logged in
                localStorage.setItem('fcm_token', token);
                localStorage.setItem(dismissKey, "true");
                setShowPrompt(false);
                onDismiss?.();
                return;
            }
        } catch {
            // fallthrough to denied handling
        }

        setStatus('denied');
        setShowPrompt(true);
        onDismiss?.();
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem(dismissKey, "true");
        onDismiss?.();
    };

    // Don't show if Firebase not configured
    if (!userId) {
        return null;
    }

    if (status === 'not-configured') {
        return null;
    }

    // Don't show if already granted/denied or dismissed
    if (!showPrompt || status === 'granted') {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] animate-slide-up">
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
                            {tr("notification_prompt_title", "Never Miss a Deal!")}
                        </h3>
                        <p className="text-white/80 text-sm mb-3">
                            {tr(
                                "notification_prompt_desc",
                                "Get instant alerts for new messages, price drops, and exclusive offers.",
                            )}
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleEnable}
                                disabled={status === 'requesting'}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white text-purple-600 dark:text-purple-400 rounded-lg font-medium hover:bg-white/90 dark:hover:bg-white/90 transition-colors disabled:opacity-50"
                            >
                                {status === 'requesting' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                        {tr("notification_enabling", "Enabling...")}
                                    </>
                                ) : status === 'denied' ? (
                                    <>
                                        <BellOff className="w-4 h-4" />
                                        {tr("notification_enable", "Enable")}
                                    </>
                                ) : (
                                    <>
                                        <Bell className="w-4 h-4" />
                                        {tr("notification_enable", "Enable")}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 text-white/80 hover:text-white font-medium transition-colors"
                            >
                                {tr("notification_later", "Later")}
                            </button>
                        </div>
                    </div>
                </div>

                {status === 'denied' && (
                    <p className="mt-3 text-white/70 text-xs text-center">
                        {tr(
                            "notification_blocked",
                            "Notifications blocked. Enable them in your browser settings.",
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}
