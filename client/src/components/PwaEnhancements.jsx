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
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-2 px-4 text-[13px] font-semibold">
          You're offline — browsing cached content
        </div>
      )}

      {/* Install prompt */}
      {installable && !dismissed.install && (
        <div className="fixed bottom-20 left-4 right-4 z-[9998] bg-[var(--card,#1e293b)] text-[var(--text-primary,#f8fafc)] rounded-2xl py-3.5 px-4.5 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-[var(--border,transparent)]">
          <span className="text-sm">📲 Install MHub for the best experience</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setDismissed((d) => ({ ...d, install: true }))}
              className="bg-transparent text-[var(--text-faint,#94a3b8)] border-none text-[13px] cursor-pointer">
              Later
            </button>
            <button onClick={handleInstall}
              className="bg-blue-500 text-white border-none rounded-lg px-4 py-1.5 text-[13px] font-semibold cursor-pointer hover:bg-blue-600 transition-colors">
              Install
            </button>
          </div>
        </div>
      )}

      {/* SW update toast */}
      {updateReady && !dismissed.update && (
        <div className="fixed bottom-20 left-4 right-4 z-[9998] bg-[var(--card,#1e293b)] text-[var(--text-primary,#f8fafc)] rounded-2xl py-3.5 px-4.5 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-[var(--border,transparent)]">
          <span className="text-sm">🚀 New version available</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setDismissed((d) => ({ ...d, update: true }))}
              className="bg-transparent text-[var(--text-faint,#94a3b8)] border-none text-[13px] cursor-pointer">
              Later
            </button>
            <button onClick={handleUpdate}
              className="bg-emerald-500 text-white border-none rounded-lg px-4 py-1.5 text-[13px] font-semibold cursor-pointer hover:bg-emerald-600 transition-colors">
              Update
            </button>
          </div>
        </div>
      )}
    </>
  );
}
