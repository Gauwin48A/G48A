import { useEffect } from "react";

/**
 * One-line hook: listens to the global `mhub:pull-refresh` event and calls the provided refetch.
 * @param {() => void} refetch — function to call when pull-to-refresh triggers
 */
export function usePageRefresh(refetch) {
  useEffect(() => {
    if (!refetch) return;
    const handler = () => refetch();
    window.addEventListener("mhub:pull-refresh", handler);
    return () => window.removeEventListener("mhub:pull-refresh", handler);
  }, [refetch]);
}
