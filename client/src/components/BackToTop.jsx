import React, { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

/**
 * Floating "Back to top" pill — appears after scrolling down 2 viewports.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = window.innerHeight * 2;
    const handler = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed z-40 right-4 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-lg border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-200 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-2"
      style={{ bottom: "calc(var(--bottom-nav-height, 64px) + 16px)" }}
      aria-label="Back to top"
    >
      <ChevronUp className="w-3.5 h-3.5" />
      Top
    </button>
  );
}
