import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { runBackendPreflight } from './lib/backendPreflight';
import './i18n/index';
import './index.css';
import { ToastProvider } from '@/hooks/use-toast';
import { activateDefenseMode, isAuthorizedHostname } from './utils/security';
import { initErrorReporting } from './lib/errorReporting';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalContentTranslator from './components/GlobalContentTranslator';

const App = React.lazy(() => import('./App.jsx'));

const PRELOAD_RELOAD_KEY = 'mhub:vite-preload-reload-at';
const PRELOAD_RELOAD_COOLDOWN_MS = 10 * 1000;
const IMPORT_RELOAD_KEY = 'mhub:module-import-reload-at';
const IMPORT_RELOAD_COOLDOWN_MS = 10 * 1000;

function isRecoverableModuleError(message) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i.test(
    String(message || '')
  );
}

activateDefenseMode();
initErrorReporting();

if (typeof window !== 'undefined') {
  const reloadOnceWithinCooldown = (storageKey, cooldownMs, reasonLabel) => {
    const now = Date.now();
    const lastReloadAt = Number.parseInt(window.sessionStorage.getItem(storageKey) || '0', 10);
    if (!Number.isFinite(lastReloadAt) || now - lastReloadAt > cooldownMs) {
      window.sessionStorage.setItem(storageKey, String(now));
      if (import.meta.env.DEV) {
        console.warn(`[bootstrap] ${reasonLabel}. Reloading page once to recover stale deps/chunks.`);
      }
      window.location.reload();
      return true;
    }

    if (import.meta.env.DEV) {
      console.error(`[bootstrap] Repeated ${reasonLabel} shortly after reload; skipping auto-reload loop.`);
    }
    return false;
  };

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceWithinCooldown(PRELOAD_RELOAD_KEY, PRELOAD_RELOAD_COOLDOWN_MS, 'Vite preload error detected');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '');
    if (isRecoverableModuleError(reason)) {
      reloadOnceWithinCooldown(IMPORT_RELOAD_KEY, IMPORT_RELOAD_COOLDOWN_MS, 'dynamic import failure detected');
    }
  });

  window.addEventListener('error', (event) => {
    const message = String(event?.error?.message || event?.message || '');
    if (isRecoverableModuleError(message)) {
      reloadOnceWithinCooldown(IMPORT_RELOAD_KEY, IMPORT_RELOAD_COOLDOWN_MS, 'module script failure detected');
    }
  });
}

const runtimeHost = window.location.hostname;
const isAuthorizedHost = isAuthorizedHostname(runtimeHost);

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function BackendUnavailableScreen({ failure }) {
  const healthUrl = failure?.healthUrl || '/api/health';
  const statusLabel = Number.isInteger(failure?.status) ? `${failure.status}` : 'No response';
  const details = String(failure?.bodyText || 'Unable to connect to backend server.').slice(0, 240);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6">
      <div className="max-w-xl w-full rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 p-6">
        <h1 className="text-xl font-semibold text-red-700 dark:text-red-300">Backend unavailable</h1>
        <p className="mt-2 text-sm text-red-900 dark:text-red-100">
          The app cannot start because the backend health check failed.
        </p>
        <div className="mt-4 space-y-2 text-xs text-red-800 dark:text-red-200 break-all">
          <p>
            <strong>Checked:</strong> {healthUrl}
          </p>
          <p>
            <strong>Status:</strong> {statusLabel}
          </p>
          <p>
            <strong>Details:</strong> {details}
          </p>
        </div>
      </div>
    </div>
  );
}

function renderApp(root) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
    window.sessionStorage.removeItem(IMPORT_RELOAD_KEY);
  }

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingScreen />}>
          <BrowserRouter>
            <ToastProvider>
              <ErrorBoundary>
                <GlobalContentTranslator />
                <App />
              </ErrorBoundary>
            </ToastProvider>
          </BrowserRouter>
        </Suspense>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

function renderBackendFailure(root, failure) {
  root.render(
    <React.StrictMode>
      <BackendUnavailableScreen failure={failure} />
    </React.StrictMode>
  );
}

if (!isAuthorizedHost && import.meta.env.MODE !== 'development') {
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:black;color:red;font-family:monospace;flex-direction:column;">
      <h1 style="font-size:3rem;">SECURITY ALERT</h1>
      <p>UNAUTHORIZED HOST DETECTED.</p>
      <p>SYSTEM LOCKED.</p>
    </div>
  `;
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <LoadingScreen />
    </React.StrictMode>
  );

  runBackendPreflight()
    .then((result) => {
      if (!result.ok) {
        if (import.meta.env.DEV) {
          console.error('[bootstrap] backend preflight failed', result.failure);
        }
        renderBackendFailure(root, result.failure);
        return;
      }
      renderApp(root);
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.error('[bootstrap] backend preflight error', error);
      }
      renderBackendFailure(root, {
        healthUrl: '/api/health',
        status: null,
        bodyText: error?.message || String(error)
      });
    });
}
