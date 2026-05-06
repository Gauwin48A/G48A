import React from "react";

/**
 * Sticky CTA bar — fixed above bottom nav.
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export default function StickyBottomCTA({ children, className = "" }) {
  return (
    <div
      className={`fixed left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-700/60 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] ${className}`}
      style={{
        bottom: "var(--bottom-nav-height, 64px)",
      }}
    >
      {children}
    </div>
  );
}
