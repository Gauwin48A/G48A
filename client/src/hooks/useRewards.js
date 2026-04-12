/**
 * useRewards Hook
 * TanStack Query hooks for rewards profile, log, and SSE streaming
 *
 * Backend endpoints:
 * - GET /api/rewards -> { user, referralChain, referralTree, chainRules }
 * - GET /api/rewards/log -> [{ user_id, action, points, description, created_at }]
 * - GET /api/rewards/stream -> SSE for real-time updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { hasAuthSession } from "@/utils/authStorage";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const LOG_STALE_TIME = 30 * 1000; // 30 seconds for log

// Query keys for cache management
export const rewardKeys = {
    all: ['rewards'],
    profile: () => [...rewardKeys.all, 'profile'],
    log: (limit) => [...rewardKeys.all, 'log', { limit }],
};

/**
 * Fetch rewards profile with user stats, referral chain, tier info
 */
export const useRewards = (options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: rewardKeys.profile(),
        queryFn: async () => {
            const response = await api.get('/api/rewards');
            return response?.data ?? response;
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
        select: (data) => ({
            user: data?.user ?? null,
            referralChain: data?.referralChain ?? [],
            referralTree: data?.referralTree ?? null,
            chainRules: data?.chainRules ?? [],
            // Convenience accessors
            totalCoins: data?.user?.totalCoins ?? 0,
            tier: data?.user?.tier ?? 'Bronze',
            rank: data?.user?.rank ?? 'Bronze',
            level: data?.user?.level ?? 1,
            referralCode: data?.user?.referralCode ?? '',
            directReferrals: data?.user?.directReferrals ?? 0,
            indirectReferrals: data?.user?.indirectReferrals ?? 0,
            streak: data?.user?.streak ?? 0,
            activityStats: data?.user?.activityStats ?? {},
        }),
    });
};

/**
 * Fetch reward log (history of points earned)
 */
export const useRewardLog = (options = {}) => {
    const { limit = 50, enabled = true } = options;

    return useQuery({
        queryKey: rewardKeys.log(limit),
        queryFn: async () => {
            const response = await api.get('/api/rewards/log', {
                params: { limit }
            });
            const data = response?.data ?? response;
            // API returns array directly
            return Array.isArray(data) ? data : [];
        },
        staleTime: LOG_STALE_TIME,
        gcTime: STALE_TIME,
        enabled,
        retry: 2,
    });
};

/**
 * Hook for SSE reward updates streaming
 * Automatically reconnects on disconnect
 */
export const useRewardStream = (options = {}) => {
    const { enabled = true, onUpdate } = options;
    const queryClient = useQueryClient();
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (!enabled) return;

        if (!hasAuthSession()) return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Build SSE URL with auth
        const baseUrl = import.meta.env?.VITE_API_URL || '';
        const url = `${baseUrl}/api/rewards/stream`;

        try {
            const eventSource = new EventSource(url, {
                withCredentials: true,
            });

            eventSource.onopen = () => {
                if (import.meta.env?.DEV) {
                    console.log('[RewardStream] Connected');
                }
            };

            eventSource.addEventListener('reward_update', (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    // Invalidate caches to refresh data
                    queryClient.invalidateQueries({ queryKey: rewardKeys.all });
                    queryClient.invalidateQueries({ queryKey: ['coins'] });
                    // Call custom handler if provided
                    onUpdate?.(payload);
                } catch (err) {
                    if (import.meta.env?.DEV) {
                        console.error('[RewardStream] Parse error:', err);
                    }
                }
            });

            eventSource.addEventListener('connected', (event) => {
                if (import.meta.env?.DEV) {
                    console.log('[RewardStream] Confirmed:', event.data);
                }
            });

            eventSource.onerror = () => {
                eventSource.close();
                // Reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(connect, 5000);
            };

            eventSourceRef.current = eventSource;
        } catch (err) {
            if (import.meta.env?.DEV) {
                console.error('[RewardStream] Connection error:', err);
            }
        }
    }, [enabled, queryClient, onUpdate]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    return {
        isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
        reconnect: connect,
    };
};

/**
 * Combined hook for rewards data with optional streaming
 */
export const useRewardsWithStream = (options = {}) => {
    const { enableStream = false, onStreamUpdate, ...queryOptions } = options;

    const rewards = useRewards(queryOptions);
    const stream = useRewardStream({
        enabled: enableStream && queryOptions.enabled !== false,
        onUpdate: onStreamUpdate,
    });

    return {
        ...rewards,
        stream,
    };
};

export default {
    useRewards,
    useRewardLog,
    useRewardStream,
    useRewardsWithStream,
    rewardKeys,
};
