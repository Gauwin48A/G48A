import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * Pull-to-refresh hook for mobile feed pages.
 * Returns a pull indicator element and attaches touch handlers to window.
 *
 * @param {{ onRefresh: () => Promise<void>|void, disabled?: boolean }} opts
 */
export function usePullToRefresh({ onRefresh, disabled = false }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e) => {
      if (disabled || refreshing) return;
      // Only activate if scrolled to top
      if (window.scrollY > 5) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [disabled, refreshing],
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!pulling.current || disabled || refreshing) return;
      const deltaY = e.touches[0].clientY - startY.current;
      if (deltaY < 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      // Dampen the pull (feels natural)
      const dampened = Math.min(deltaY * 0.5, MAX_PULL);
      setPullDistance(dampened);
    },
    [disabled, refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    if (disabled) return;
    const opts = { passive: true };
    window.addEventListener("touchstart", handleTouchStart, opts);
    window.addEventListener("touchmove", handleTouchMove, opts);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isTriggered = pullDistance >= PULL_THRESHOLD || refreshing;

  const pullIndicator = (pullDistance > 0 || refreshing) ? (
    <div
      className="flex justify-center items-center overflow-hidden transition-all"
      style={{ height: refreshing ? 48 : pullDistance }}
    >
      <div
        className={`w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full ${
          isTriggered ? "animate-spin" : ""
        }`}
        style={{
          transform: isTriggered ? "none" : `rotate(${pullDistance * 3}deg)`,
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
          borderWidth: 3,
        }}
      />
    </div>
  ) : null;

  return { pullDistance, refreshing, pullIndicator };
}
