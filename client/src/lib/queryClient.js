/**
 * Query Client Configuration
 * 
 * IMPORTANT: Persistence DISABLED to guarantee fresh data on every refresh
 * Users MUST see new posts when they refresh the page
 */

import { QueryClient } from '@tanstack/react-query';

// Create the Cache Manager - NO PERSISTENCE
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 5,         // Keep in memory for 5 minutes only
            staleTime: 0,                   // Data is ALWAYS stale - forces refetch
            retry: 1,                       // Only retry failed requests once
            refetchOnWindowFocus: false,    // Don't refetch on tab switch
            refetchOnReconnect: true,       // Refetch when internet comes back
            refetchOnMount: 'always',       // ALWAYS refetch when component mounts
        },
        mutations: {
            retry: 1,
        },
    },
});

// CLEAR any old persisted cache from previous versions
if (typeof window !== 'undefined') {
    localStorage.removeItem('mhub-query-cache');
    console.log('[QueryClient] Fresh data mode - no localStorage caching');
}

export default queryClient;
