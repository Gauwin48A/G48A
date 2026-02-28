/**
 * Query Client Configuration
 * 
 * IMPORTANT: Persistence DISABLED to guarantee fresh data on every refresh.
 * Query defaults are tuned to reduce redundant network chatter while keeping
 * data fresh on normal navigation.
 */

import { QueryClient } from '@tanstack/react-query';

const DEFAULT_GC_TIME_MS = 5 * 60 * 1000;
const DEFAULT_STALE_TIME_MS = 30 * 1000;

// Create the Cache Manager - no persistence
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: DEFAULT_GC_TIME_MS,      // Keep in memory for 5 minutes only
            staleTime: DEFAULT_STALE_TIME_MS, // Reuse fresh data briefly to avoid duplicate fetches
            retry: 1,                        // Only retry failed requests once
            refetchOnWindowFocus: false,     // Don't refetch on tab switch
            refetchOnReconnect: true,        // Refetch when internet comes back
            refetchOnMount: true,            // Refetch on mount only when stale
        },
        mutations: {
            retry: 1,
        },
    },
});

const QUERY_CACHE_CLEAR_MARKER = 'mhub-query-cache-cleared-v1';

// Clear stale persisted cache once per browser profile.
if (typeof window !== 'undefined') {
    if (!window.localStorage.getItem(QUERY_CACHE_CLEAR_MARKER)) {
        window.localStorage.removeItem('mhub-query-cache');
        window.localStorage.setItem(QUERY_CACHE_CLEAR_MARKER, '1');
    }
}

export default queryClient;
