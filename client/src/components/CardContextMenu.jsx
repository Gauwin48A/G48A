import React, { useState, useRef, useCallback } from "react";
import { Share2, Bookmark, Flag, EyeOff } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

const LONG_PRESS_MS = 500;

/**
 * CardContextMenu — wraps a card and shows a bottom sheet on long-press.
 * @param {{ children: React.ReactNode, onShare?: () => void, onSave?: () => void, onReport?: () => void, onHide?: () => void }} props
 */
export default function CardContextMenu({ children, onShare, onSave, onReport, onHide }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const { medium } = useHaptic();

  const handleTouchStart = useCallback(() => {
    timerRef.current = setTimeout(() => {
      medium();
      setOpen(true);
    }, LONG_PRESS_MS);
  }, [medium]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleAction = useCallback((fn) => {
    setOpen(false);
    fn?.();
  }, []);

  return (
    <>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] animate-slideUp">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <div className="flex flex-col gap-1">
              {onShare && (
                <button onClick={() => handleAction(onShare)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] transition-transform">
                  <Share2 className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              )}
              {onSave && (
                <button onClick={() => handleAction(onSave)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] transition-transform">
                  <Bookmark className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium">Save</span>
                </button>
              )}
              {onReport && (
                <button onClick={() => handleAction(onReport)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] transition-transform">
                  <Flag className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium">Report</span>
                </button>
              )}
              {onHide && (
                <button onClick={() => handleAction(onHide)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] transition-transform">
                  <EyeOff className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium">Hide</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
