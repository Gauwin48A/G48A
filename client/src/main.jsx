
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient' // Persisted query client
import { runBackendPreflight } from './lib/backendPreflight'
import './i18n/index' // Initialize i18n before App
import './index.css'
import { ToastProvider } from "@/hooks/use-toast"
import { activateDefenseMode, isAuthorizedHostname } from './utils/security'
import { initErrorReporting } from './lib/errorReporting'

const App = React.lazy(() => import('./App.jsx'))

// 1. ACTIVATE RUNTIME SHIELD
activateDefenseMode();
initErrorReporting();

// 2. DOMAIN LOCKING (Prevent Piracy)
const currentDomain = window.location.hostname;
const isAuthorized = isAuthorizedHostname(currentDomain);

// Lightweight loading screen for initial load
const LoadingScreen = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

const BackendUnavailableScreen = ({ failure }) => {
  const endpoint = failure?.healthUrl || '/api/health';
  const statusText = Number.isInteger(failure?.status) ? `${failure.status}` : 'No response';
  const details = String(failure?.bodyText || 'Unable to connect to backend server.').slice(0, 240);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6">
      <div className="max-w-xl w-full rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 p-6">
        <h1 className="text-xl font-semibold text-red-700 dark:text-red-300">Backend unavailable</h1>
        <p className="mt-2 text-sm text-red-900 dark:text-red-100">
          The app cannot start because the backend health check failed.
        </p>
        <div className="mt-4 space-y-2 text-xs text-red-800 dark:text-red-200 break-all">
          <p><strong>Checked:</strong> {endpoint}</p>
          <p><strong>Status:</strong> {statusText}</p>
          <p><strong>Details:</strong> {details}</p>
        </div>
      </div>
    </div>
  );
};

function renderApp(root) {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingScreen />}>
          <BrowserRouter>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BrowserRouter>
        </Suspense>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

function renderBackendUnavailable(root, failure) {
  root.render(
    <React.StrictMode>
      <BackendUnavailableScreen failure={failure} />
    </React.StrictMode>,
  )
}

// Only render if authorized domain or in development
if (!isAuthorized && import.meta.env.MODE !== 'development') {
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:black;color:red;font-family:monospace;flex-direction:column;">
      <h1 style="font-size:3rem;">SECURITY ALERT</h1>
      <p>UNAUTHORIZED HOST DETECTED.</p>
      <p>SYSTEM LOCKED.</p>
    </div>
  `;
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'))

  root.render(
    <React.StrictMode>
      <LoadingScreen />
    </React.StrictMode>,
  )

  runBackendPreflight()
    .then((result) => {
      if (!result.ok) {
        if (import.meta.env.DEV) {
          console.error('[bootstrap] backend preflight failed', result.failure);
        }
        renderBackendUnavailable(root, result.failure);
        return;
      }
      renderApp(root);
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.error('[bootstrap] backend preflight error', error);
      }
      renderBackendUnavailable(root, {
        healthUrl: '/api/health',
        status: null,
        bodyText: error?.message || String(error)
      });
    });
}

