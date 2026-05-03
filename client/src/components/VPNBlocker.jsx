/**
 * VPN Blocker Component
 * ─────────────────────
 * Wraps the entire app and blocks access when VPN/proxy is detected.
 * Shows a full-screen warning that the user must disable VPN to continue.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  detectVPN,
  startVPNMonitoring,
  onVpnStatusChange,
  stopVPNMonitoring,
} from "../services/vpnDetection";

const VPN_BLOCK_ENABLED =
  import.meta.env.VITE_VPN_BLOCK_ENABLED !== "false"; // Enabled by default
const WEB_REPLICA_USER_AGENT_TOKEN = "MhubAndroidWebReplica/1.0";
const VPN_INITIAL_CHECK_TIMEOUT_MS = 4500;

function shouldBypassVpnGate() {
  if (typeof window === "undefined") return false;
  const host = String(window.location?.hostname || "");
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const ua = String(window.navigator?.userAgent || "");
  const isWebReplicaUa = ua.includes(WEB_REPLICA_USER_AGENT_TOKEN);
  const isReplicaFlag = window.__MHUB_WEB_REPLICA__ === true;
  return (import.meta.env.DEV && isLocalHost) || isWebReplicaUa || isReplicaFlag;
}

export default function VPNBlocker({ children }) {
  const [vpnDetected, setVpnDetected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!VPN_BLOCK_ENABLED || shouldBypassVpnGate()) {
      setVpnDetected(false);
      setChecking(false);
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setChecking(false);
    }, VPN_INITIAL_CHECK_TIMEOUT_MS);

    // Start monitoring
    const cleanup = startVPNMonitoring();

    // Listen for VPN status changes
    const unsubscribe = onVpnStatusChange((status) => {
      setVpnDetected(status?.vpnDetected || false);
      setChecking(false);
      window.clearTimeout(fallbackTimer);
    });

    // Initial check
    detectVPN()
      .then((result) => {
        setVpnDetected(result?.vpnDetected || false);
        setChecking(false);
      })
      .catch(() => {
        setVpnDetected(false);
        setChecking(false);
      })
      .finally(() => {
        window.clearTimeout(fallbackTimer);
      });

    // Listen for server-side VPN blocks forwarded from API interceptor
    const handleServerVpnBlock = (e) => {
      if (e.detail?.code === "VPN_BLOCKED") {
        setVpnDetected(true);
        setChecking(false);
      }
    };
    window.addEventListener("mhub:vpn-blocked", handleServerVpnBlock);

    return () => {
      cleanup();
      unsubscribe();
      stopVPNMonitoring();
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("mhub:vpn-blocked", handleServerVpnBlock);
    };
  }, []);

  const retryTimerRef = useRef(null);
  const [retryCooldown, setRetryCooldown] = useState(0);

  // Cleanup cooldown timer
  useEffect(() => {
    return () => { if (retryTimerRef.current) clearInterval(retryTimerRef.current); };
  }, []);

  const handleRetry = useCallback(async () => {
    if (retrying || retryCooldown > 0) return;
    setRetrying(true);

    const result = await detectVPN();
    setVpnDetected(result?.vpnDetected || false);
    setRetrying(false);

    // If still blocked, start a 15s cooldown to prevent retry spam
    if (result?.vpnDetected) {
      setRetryCooldown(15);
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
      retryTimerRef.current = setInterval(() => {
        setRetryCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(retryTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [retrying, retryCooldown]);

  // Skip VPN check in dev mode if explicitly disabled or in Android web replica parity surface
  if (!VPN_BLOCK_ENABLED || shouldBypassVpnGate()) {
    return children;
  }

  // Show loading while first check runs
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Verifying network security...
          </p>
        </div>
      </div>
    );
  }

  // VPN detected — block the app
  if (vpnDetected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Shield icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            VPN / Proxy Detected
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            For security purposes, MHub cannot be used with a VPN, proxy, or
            anonymizing service enabled. Please disable your VPN and try again.
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
              How to fix:
            </p>
            <ol className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 list-decimal list-inside">
              <li>Turn off your VPN or proxy application</li>
              <li>Disconnect from any VPN browser extensions</li>
              <li>Make sure you&apos;re on a regular WiFi or mobile network</li>
              <li>Click &quot;Check Again&quot; below</li>
            </ol>
          </div>

          <button
            onClick={handleRetry}
            disabled={retrying || retryCooldown > 0}
            className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {retrying ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking...
              </>
            ) : retryCooldown > 0 ? (
              `Retry in ${retryCooldown}s`
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Check Again
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            This security measure protects your account and ensures fair usage
            for all users.
          </p>
        </div>
      </div>
    );
  }

  // All clear — render the app
  return children;
}
