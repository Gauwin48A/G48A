import { useEffect, useRef, useCallback } from "react";

/**
 * useInfiniteScroll — IntersectionObserver-based infinite scroll
 * Per Deatiled_doc.txt: Replace "Load More" buttons with auto-loading.
 *
 * @param {Function} onLoadMore - Called when sentinel enters viewport
 * @param {Object} options
 * @param {boolean} options.hasMore - Whether more items exist
 * @param {boolean} options.loading - Whether a load is in progress
 * @param {number} options.threshold - IntersectionObserver threshold (0-1)
 * @param {string} options.rootMargin - Preload margin (e.g. "200px")
 * @returns {{ sentinelRef: React.RefObject }}
 */
export default function useInfiniteScroll(
  onLoadMore,
  { hasMore = true, loading = false, threshold = 0, rootMargin = "200px" } = {}
) {
  const sentinelRef = useRef(null);
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  const handleIntersect = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !loading) {
        callbackRef.current?.();
      }
    },
    [hasMore, loading]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect, threshold, rootMargin]);

  return { sentinelRef };
}
