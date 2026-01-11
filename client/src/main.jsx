
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient' // Persisted query client
import './i18n/index' // Initialize i18n before App
import App from './App.jsx'
import './index.css'
import { ToastProvider } from "@/hooks/use-toast"
import { activateDefenseMode } from './utils/security'

// 1. ACTIVATE RUNTIME SHIELD
activateDefenseMode();

// 2. DOMAIN LOCKING (Prevent Piracy)
const AUTHORIZED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'mhub-mini.vercel.app',
  'mhub-app.vercel.app',
  // Add your production domains here
];

const currentDomain = window.location.hostname;
const isAuthorized = AUTHORIZED_DOMAINS.some(domain =>
  currentDomain === domain || currentDomain.endsWith(`.${domain}`)
);

// Lightweight loading screen for initial load
const LoadingScreen = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

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
  ReactDOM.createRoot(document.getElementById('root')).render(
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

