import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BACK_HIDDEN = new Set(["/login", "/signup"]);

const AUTH_HERO = {
  "/login": { emoji: "👋", title: "Welcome back", subtitle: "Sign in to continue" },
  "/signup": { emoji: "🚀", title: "Get started", subtitle: "Create your account" },
  "/forgot-password": { emoji: "🔑", title: "Reset password", subtitle: "We'll help you recover access" },
  "/reset-password": { emoji: "🔒", title: "New password", subtitle: "Choose a strong password" },
};

export default function AuthShell({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const showBack = !BACK_HIDDEN.has(pathname);
  const hero = AUTH_HERO[pathname] || AUTH_HERO[pathname.replace(/\/[^/]+$/, "")];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50/60 to-white dark:from-gray-900 dark:to-gray-950">
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-border/40"
        style={{
          height: "var(--top-nav-height, 60px)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="min-h-12 min-w-12 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Mhub</span>
        </div>
      </header>
      <div className="flex-1 flex flex-col">
        {hero && (
          <div className="text-center pt-6 pb-2 px-4">
            <span className="text-4xl mb-2 block">{hero.emoji}</span>
            <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">{hero.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{hero.subtitle}</p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
