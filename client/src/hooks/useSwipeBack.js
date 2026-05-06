import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const EDGE_WIDTH = 24;    // px from left edge to start detecting
const SWIPE_THRESHOLD = 80; // px horizontal distance to trigger back
const MAX_TIME = 400;       // ms max swipe duration

/**
 * Swipe-back gesture hook — detects left-edge horizontal swipe and navigates back.
 * Only activates when touch starts within EDGE_WIDTH px of the left screen edge.
 */
export function useSwipeBack({ disabled = false } = {}) {
  const navigate = useNavigate();
  const startRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    const touch = e.touches[0];
    if (touch.clientX <= EDGE_WIDTH) {
      startRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    }
  }, [disabled]);

  const handleTouchEnd = useCallback((e) => {
    if (!startRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = Math.abs(touch.clientY - startRef.current.y);
    const dt = Date.now() - startRef.current.t;
    startRef.current = null;

    // Horizontal swipe must dominate vertical, exceed threshold, within time
    if (dx > SWIPE_THRESHOLD && dx > dy * 1.5 && dt < MAX_TIME) {
      navigate(-1);
    }
  }, [disabled, navigate]);

  useEffect(() => {
    if (disabled) return;
    const opts = { passive: true };
    window.addEventListener("touchstart", handleTouchStart, opts);
    window.addEventListener("touchend", handleTouchEnd, opts);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchEnd]);
}
