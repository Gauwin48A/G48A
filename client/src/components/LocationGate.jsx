/**
 * Location Gate Component
 * MANDATORY location capture - no skip option
 * Blocks app access until location is enabled
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { getDeviceInfo } from '../utils/deviceInfo';
import { MapPin, Loader2, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';
import { buildApiPath } from '@/lib/networkConfig';

const DEVICE_INFO_SENT_SESSION_KEY = 'mhub_device_info_sent';

export default function LocationGate({ children }) {
    const {
        loading,
        error,
        permissionGranted,
        permissionDenied,
        requestLocation,
        city,
        accuracy,
        provider
    } = useLocation();

    const [deviceSent, setDeviceSent] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [autoBypass, setAutoBypass] = useState(false); // Auto-bypass after timeout

    // Auto-bypass after 5 seconds to prevent infinite loading
    // This allows the app to load while location continues in background
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading && !permissionGranted) {
                console.log('[LocationGate] Auto-bypassing after 5 seconds - app will load while GPS continues in background');
                setAutoBypass(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [loading, permissionGranted]);

    // Send device info to backend on first load
    useEffect(() => {
        if (sessionStorage.getItem(DEVICE_INFO_SENT_SESSION_KEY) === '1') {
            setDeviceSent(true);
            return;
        }

        if (!deviceSent) {
            sendDeviceInfo();
            setDeviceSent(true);
        }
    }, [deviceSent]);

    const sendDeviceInfo = async () => {
        try {
            const deviceInfo = getDeviceInfo();

            await fetch(buildApiPath('/analytics/device'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(deviceInfo)
            });
            sessionStorage.setItem(DEVICE_INFO_SENT_SESSION_KEY, '1');

            console.log('[LocationGate] Device info sent:', deviceInfo.fingerprint);
        } catch (err) {
            console.error('[LocationGate] Failed to send device info:', err);
        }
    };

    const handleRetry = async () => {
        setRetrying(true);
        await requestLocation();
        setRetrying(false);
    };

    // If location is granted OR auto-bypass timer expired, render children
    // This ensures app loads even if GPS is slow (like banking apps)
    if ((permissionGranted && !loading) || autoBypass) {
        return <>{children}</>;
    }

    // If loading (and not yet bypassed), show loading state with countdown
    if (loading) {
        return (
            <div className="location-gate">
                <div className="location-gate-content">
                    <div className="location-gate-icon pulse">
                        <MapPin size={48} />
                    </div>
                    <h1>Detecting Your Location</h1>
                    <p>Using GPS for accurate location (up to 60 seconds)</p>
                    <div className="location-gate-loader">
                        <Loader2 className="spin" size={32} />
                    </div>
                    <p className="location-gate-hint">App will load shortly even if detection takes time...</p>
                </div>
                <style>{gateStyles}</style>
            </div>
        );
    }

    // If denied, show instructions
    if (permissionDenied) {
        return (
            <div className="location-gate denied">
                <div className="location-gate-content">
                    <div className="location-gate-icon warning">
                        <AlertTriangle size={48} />
                    </div>
                    <h1>Location Access Required</h1>
                    <p>MHub needs your location to show nearby products and connect you with local sellers.</p>

                    <div className="location-gate-instructions">
                        <h3><Smartphone size={20} /> How to Enable Location:</h3>
                        <ol>
                            <li>Tap the <strong>🔒 lock icon</strong> in your browser's address bar</li>
                            <li>Find <strong>Location</strong> setting</li>
                            <li>Change to <strong>Allow</strong></li>
                            <li>Refresh this page</li>
                        </ol>
                    </div>

                    {city && (
                        <div className="location-gate-fallback">
                            <p>Current location source: <strong>{provider || 'unknown'}</strong></p>
                            <p className="muted">
                                {accuracy ? `Last known accuracy: ±${Math.round(accuracy)}m` : 'Enable GPS for the most accurate location.'}
                            </p>
                        </div>
                    )}

                    <button
                        className="location-gate-btn"
                        onClick={handleRetry}
                        disabled={retrying}
                    >
                        {retrying ? (
                            <><Loader2 className="spin" size={20} /> Checking...</>
                        ) : (
                            <><RefreshCw size={20} /> Try Again</>
                        )}
                    </button>
                </div>
                <style>{gateStyles}</style>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="location-gate error">
                <div className="location-gate-content">
                    <div className="location-gate-icon warning">
                        <AlertTriangle size={48} />
                    </div>
                    <h1>Location Error</h1>
                    <p>{error}</p>

                    <button
                        className="location-gate-btn"
                        onClick={handleRetry}
                        disabled={retrying}
                    >
                        {retrying ? (
                            <><Loader2 className="spin" size={20} /> Retrying...</>
                        ) : (
                            <><RefreshCw size={20} /> Try Again</>
                        )}
                    </button>
                </div>
                <style>{gateStyles}</style>
            </div>
        );
    }

    // Default: requesting permission
    return (
        <div className="location-gate">
            <div className="location-gate-content">
                <div className="location-gate-icon pulse">
                    <MapPin size={48} />
                </div>
                <h1>Enable Location</h1>
                <p>Allow location access to discover products near you and connect with local sellers.</p>

                <button
                    className="location-gate-btn primary"
                    onClick={requestLocation}
                >
                    <MapPin size={20} /> Allow Location Access
                </button>

                <p className="location-gate-privacy">
                    🔒 Your location is stored securely and only used to improve your experience.
                </p>
            </div>
            <style>{gateStyles}</style>
        </div>
    );
}

const gateStyles = `
  .location-gate {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  .location-gate-content {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 40px;
    max-width: 420px;
    width: 100%;
    text-align: center;
    color: #fff;
  }

  .location-gate-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: white;
  }

  .location-gate-icon.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  .location-gate-icon.pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }

  .location-gate h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: #fff;
  }

  .location-gate p {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 24px;
    line-height: 1.6;
  }

  .location-gate-loader {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    color: #22c55e;
  }

  .location-gate-hint {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 16px;
    margin-bottom: 0;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .location-gate-instructions {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    text-align: left;
  }

  .location-gate-instructions h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    margin-bottom: 12px;
    color: #fff;
  }

  .location-gate-instructions ol {
    margin: 0;
    padding-left: 20px;
    color: rgba(255, 255, 255, 0.7);
  }

  .location-gate-instructions li {
    margin-bottom: 8px;
  }

  .location-gate-fallback {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .location-gate-fallback p {
    margin-bottom: 8px;
    color: #22c55e;
  }

  .location-gate-fallback .muted {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 0;
  }

  .location-gate-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .location-gate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
  }

  .location-gate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .location-gate-privacy {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 20px;
    margin-bottom: 0;
  }
`;
