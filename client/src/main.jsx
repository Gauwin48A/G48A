import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { runBackendPreflight } from './lib/backendPreflight';
import './i18n/index';
import './index.css';
import './styles/ui-enhancements.css';
import { ToastProvider } from '@/hooks/use-toast';
import { activateDefenseMode, isAuthorizedHostname } from './utils/security';
import { initCodeProtection } from './utils/codeProtection';
import { initErrorReporting } from './lib/errorReporting';
import { requestSoftReload } from './utils/softReload';

// Initialize code protection (anti-debug, DevTools blocking) — only active in production
initCodeProtection();
import { warnIfFirebaseMisconfigured } from './lib/firebase';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalContentTranslator from './components/GlobalContentTranslator';
import AuthEventRouter from './components/AuthEventRouter';
import { CategoryModeProvider } from '@/context/CategoryModeContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { HelmetProvider } from 'react-helmet-async';

const App = React.lazy(() => import('./App.jsx'));
const ROOT_INSTANCE_KEY = '__mhub_react_root__';
const CONTAINER_ROOT_KEY = '__mhub_react_root_instance__';
const BOOTSTRAP_STATE_KEY = '__mhub_bootstrap_state__';
const BOOTSTRAP_LISTENER_FLAG = '__mhub_bootstrap_listeners_bound__';
const ENABLE_RUNTIME_TRANSLATION =
  String(import.meta.env.VITE_ENABLE_RUNTIME_TRANSLATION || 'true').toLowerCase() === 'true';

const PRELOAD_RELOAD_KEY = 'mhub:vite-preload-reload-at';
const PRELOAD_RELOAD_COOLDOWN_MS = 10 * 1000;
const IMPORT_RELOAD_KEY = 'mhub:module-import-reload-at';
const IMPORT_RELOAD_COOLDOWN_MS = 10 * 1000;
const DOM_RELOAD_KEY = 'mhub:dom-recovery-reload-at';
const DOM_RELOAD_COOLDOWN_MS = 7 * 1000;
const RootMode = import.meta.env.DEV ? React.Fragment : React.StrictMode;

function isRecoverableModuleError(message) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i.test(
    String(message || '')
  );
}

function isRecoverableDomError(message) {
  return /Failed to execute ['"]removeChild['"] on ['"]Node['"]|The node to be removed is not a child of this node/i.test(
    String(message || '')
  );
}

function getBootstrapState() {
  if (typeof window === 'undefined') {
    return { runId: 0 };
  }

  if (!window[BOOTSTRAP_STATE_KEY]) {
    window[BOOTSTRAP_STATE_KEY] = { runId: 0 };
  }
  return window[BOOTSTRAP_STATE_KEY];
}

activateDefenseMode();
initErrorReporting();
warnIfFirebaseMisconfigured();

if (typeof window !== 'undefined' && !window[BOOTSTRAP_LISTENER_FLAG]) {
  window[BOOTSTRAP_LISTENER_FLAG] = true;

  const reloadOnceWithinCooldown = (storageKey, cooldownMs, reasonLabel) => {
    const now = Date.now();
    const lastReloadAt = Number.parseInt(window.sessionStorage.getItem(storageKey) || '0', 10);
    if (!Number.isFinite(lastReloadAt) || now - lastReloadAt > cooldownMs) {
      window.sessionStorage.setItem(storageKey, String(now));
      if (import.meta.env.DEV) {
        console.warn(`[bootstrap] ${reasonLabel}. Prompting for refresh to recover stale deps/chunks.`);
      }
      requestSoftReload({
        title: 'Refresh recommended',
        description: `${reasonLabel}. Refresh to recover.`,
      });
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
      return;
    }

    if (isRecoverableDomError(message)) {
      reloadOnceWithinCooldown(DOM_RELOAD_KEY, DOM_RELOAD_COOLDOWN_MS, 'React DOM reconciliation mismatch detected');
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
    window.sessionStorage.removeItem(DOM_RELOAD_KEY);
  }

  root.render(
    <RootMode>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
        <ThemeProvider>
        <Suspense fallback={<LoadingScreen />}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ToastProvider>
              <ErrorBoundary>
                {ENABLE_RUNTIME_TRANSLATION ? <GlobalContentTranslator /> : null}
                <AuthEventRouter />
                <CategoryModeProvider>
                  <App />
                </CategoryModeProvider>
              </ErrorBoundary>
            </ToastProvider>
          </BrowserRouter>
        </Suspense>
        </ThemeProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </RootMode>
  );
}

function renderBackendFailure(root, failure) {
  root.render(
    <RootMode>
      <BackendUnavailableScreen failure={failure} />
    </RootMode>
  );
}

function getOrCreateRoot() {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container not found');
  }

  if (container[CONTAINER_ROOT_KEY]) {
    return container[CONTAINER_ROOT_KEY];
  }

  const globalWindow = typeof window !== 'undefined' ? window : null;
  if (globalWindow && globalWindow[ROOT_INSTANCE_KEY]) {
    return globalWindow[ROOT_INSTANCE_KEY];
  }

  const root = ReactDOM.createRoot(container);
  container[CONTAINER_ROOT_KEY] = root;
  if (globalWindow) {
    globalWindow[ROOT_INSTANCE_KEY] = root;
  }
  return root;
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
  const bootstrapState = getBootstrapState();
  const runId = Number(bootstrapState.runId || 0) + 1;
  bootstrapState.runId = runId;

  const isCurrentRun = () => {
    if (typeof window === 'undefined') {
      return true;
    }
    const state = window[BOOTSTRAP_STATE_KEY];
    return Boolean(state) && Number(state.runId) === runId;
  };

  const root = getOrCreateRoot();
  root.render(
    <RootMode>
      <LoadingScreen />
    </RootMode>
  );

  runBackendPreflight()
    .then((result) => {
      if (!isCurrentRun()) {
        return;
      }
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
      if (!isCurrentRun()) {
        return;
      }
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    const globalWindow = typeof window !== 'undefined' ? window : null;
    const container = typeof document !== 'undefined' ? document.getElementById('root') : null;
    const root = globalWindow?.[ROOT_INSTANCE_KEY] || container?.[CONTAINER_ROOT_KEY];

    if (root?.unmount) {
      try {
        root.unmount();
      } catch {
        // noop: stale HMR roots can already be detached
      }
    }

    if (globalWindow) {
      delete globalWindow[ROOT_INSTANCE_KEY];
      if (globalWindow[BOOTSTRAP_STATE_KEY]) {
        globalWindow[BOOTSTRAP_STATE_KEY].runId = 0;
      }
    }
    if (container && container[CONTAINER_ROOT_KEY]) {
      delete container[CONTAINER_ROOT_KEY];
    }
  });
}
