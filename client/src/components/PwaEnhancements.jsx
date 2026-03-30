/**
 * PWA Enhancement Layer — fire-and-forget component
 * Handles: install prompt, SW update toast, offline banner, share target
 * Mount once in App.jsx: <PwaEnhancements />
 */
import { useState, useEffect, useCallback } from 'react';
import { canInstall, promptInstall, skipWaiting, registerSW, initInstallPrompt } from '@/lib/pwa';
import { initWebVitals } from '@/lib/webVitals';
import { isOnline, onOnlineChange } from '@/lib/network';

let initialized = false;

export default function PwaEnhancements() {
  const [installable, setInstallable] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [offline, setOffline] = useState(!isOnline());
  const [dismissed, setDismissed] = useState({ install: false, update: false });

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    // Init all fire-and-forget systems
    initInstallPrompt();
    initWebVitals();
    registerSW();

    // Listen for installability
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => { setInstallable(false); setDismissed((d) => ({ ...d, install: true })); };
    window.addEventListener('mhub:installable', onInstallable);
    window.addEventListener('mhub:installed', onInstalled);

    // Listen for SW update
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener('mhub:sw-update', onUpdate);

    // Online/offline
    const unsub = onOnlineChange((online) => setOffline(!online));

    return () => {
      window.removeEventListener('mhub:installable', onInstallable);
      window.removeEventListener('mhub:installed', onInstalled);
      window.removeEventListener('mhub:sw-update', onUpdate);
      unsub();
    };
  }, []);

  const handleInstall = useCallback(async () => {
    await promptInstall();
    setDismissed((d) => ({ ...d, install: true }));
  }, []);

  const handleUpdate = useCallback(() => {
    skipWaiting();
    window.location.reload();
  }, []);

  return (
    <>
      {/* Offline banner */}
      {offline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#dc2626', color: '#fff', textAlign: 'center',
          padding: '8px 16px', fontSize: '13px', fontWeight: 600,
        }}>
          You're offline — browsing cached content
        </div>
      )}

      {/* Install prompt */}
      {installable && !dismissed.install && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9998,
          background: '#1e293b', color: '#f8fafc', borderRadius: 16,
          padding: '14px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: 14 }}>📲 Install MHub for the best experience</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setDismissed((d) => ({ ...d, install: true }))}
              style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 13, cursor: 'pointer' }}>
              Later
            </button>
            <button onClick={handleInstall}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Install
            </button>
          </div>
        </div>
      )}

      {/* SW update toast */}
      {updateReady && !dismissed.update && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9998,
          background: '#1e293b', color: '#f8fafc', borderRadius: 16,
          padding: '14px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: 14 }}>🚀 New version available</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setDismissed((d) => ({ ...d, update: true }))}
              style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 13, cursor: 'pointer' }}>
              Later
            </button>
            <button onClick={handleUpdate}
              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Update
            </button>
          </div>
        </div>
      )}
    </>
  );
}
