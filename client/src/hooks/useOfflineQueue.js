import { useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "mhub_offline_msg_queue";

/**
 * Hook for queuing messages when offline and replaying when online.
 * @param {Function} sendFn - Async function to send a message: (msg) => Promise
 * @returns {{ enqueue: (msg) => void, pendingCount: number }}
 */
export function useOfflineQueue(sendFn) {
  const queueRef = useRef([]);
  const processingRef = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        queueRef.current = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const persistQueue = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queueRef.current));
    } catch {
      // storage full — ignore
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !navigator.onLine) return;
    processingRef.current = true;

    while (queueRef.current.length > 0 && navigator.onLine) {
      const msg = queueRef.current[0];
      try {
        await sendFn(msg);
        queueRef.current.shift();
        persistQueue();
      } catch {
        break; // stop processing - will retry on next online event
      }
    }
    processingRef.current = false;
  }, [sendFn, persistQueue]);

  // Replay queue when coming back online
  useEffect(() => {
    const handler = () => processQueue();
    window.addEventListener("online", handler);
    // Try processing on mount in case we're already online
    processQueue();
    return () => window.removeEventListener("online", handler);
  }, [processQueue]);

  const enqueue = useCallback(
    (msg) => {
      if (navigator.onLine) {
        // Try sending immediately
        sendFn(msg).catch(() => {
          queueRef.current.push(msg);
          persistQueue();
        });
      } else {
        queueRef.current.push(msg);
        persistQueue();
      }
    },
    [sendFn, persistQueue],
  );

  return { enqueue, pendingCount: queueRef.current.length };
}
