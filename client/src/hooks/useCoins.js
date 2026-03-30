/**
 * useCoins Hook
 * TanStack Query hooks for coin balance, history, engagement, and mutations
 *
 * Backend endpoints:
 * - GET /api/coins/balance -> { success, balance }
 * - GET /api/coins/history -> { success, transactions, total, limit, offset }
 * - GET /api/coins/engagement -> { dailyCheckIn, spin, scratch, referralMilestone }
 * - POST /api/coins/daily-checkin -> { success, reward, streak, newBalance }
 * - POST /api/coins/spin -> { success, reward, newBalance }
 * - POST /api/coins/scratch -> { success, reward, newBalance, remaining }
 * - POST /api/coins/redeem -> { success, newBalance, boost }
 * - POST /api/coins/store-redeem -> { success, newBalance, fulfillment }
 * - POST /api/coins/referral-milestones -> { success, applied, milestone, balance }
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const HISTORY_PAGE_SIZE = 20;

// Query keys for cache management
export const coinKeys = {
    all: ['coins'],
    balance: () => [...coinKeys.all, 'balance'],
    history: () => [...coinKeys.all, 'history'],
    engagement: () => [...coinKeys.all, 'engagement'],
};

/**
 * Fetch coin balance
 */
export const useCoinBalance = (options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: coinKeys.balance(),
        queryFn: async () => {
            const response = await api.get('/api/coins/balance');
            const data = response?.data ?? response;
            return data?.balance ?? 0;
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch coin transaction history with infinite scroll
 */
export const useCoinHistory = (options = {}) => {
    const { enabled = true } = options;

    return useInfiniteQuery({
        queryKey: coinKeys.history(),
        initialPageParam: 0,
        queryFn: async ({ pageParam = 0 }) => {
            const response = await api.get('/api/coins/history', {
                params: { limit: HISTORY_PAGE_SIZE, offset: pageParam }
            });
            const data = response?.data ?? response;
            return {
                transactions: data?.transactions ?? [],
                total: data?.total ?? 0,
                offset: pageParam,
                hasMore: (data?.transactions?.length ?? 0) === HISTORY_PAGE_SIZE
            };
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.offset + HISTORY_PAGE_SIZE : undefined,
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Fetch engagement status (daily check-in, spin, scratch, milestones)
 */
export const useEngagementStatus = (options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: coinKeys.engagement(),
        queryFn: async () => {
            const response = await api.get('/api/coins/engagement');
            return response?.data ?? response;
        },
        staleTime: 60 * 1000, // 1 minute - more frequent updates for engagement
        gcTime: STALE_TIME,
        enabled,
        retry: 2,
    });
};

/**
 * Claim daily check-in mutation
 */
export const useClaimCheckIn = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.post('/api/coins/daily-checkin');
            return response?.data ?? response;
        },
        onSuccess: (data) => {
            // Update balance cache with new balance
            if (data?.newBalance !== undefined) {
                queryClient.setQueryData(coinKeys.balance(), data.newBalance);
            }
            // Invalidate engagement to reflect checked-in state
            queryClient.invalidateQueries({ queryKey: coinKeys.engagement() });
            // Invalidate history to show new transaction
            queryClient.invalidateQueries({ queryKey: coinKeys.history() });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Daily check-in failed:', error);
            }
        },
    });
};

/**
 * Spin wheel mutation
 */
export const useSpinWheel = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.post('/api/coins/spin');
            return response?.data ?? response;
        },
        onSuccess: (data) => {
            if (data?.newBalance !== undefined) {
                queryClient.setQueryData(coinKeys.balance(), data.newBalance);
            }
            queryClient.invalidateQueries({ queryKey: coinKeys.engagement() });
            queryClient.invalidateQueries({ queryKey: coinKeys.history() });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Spin wheel failed:', error);
            }
        },
    });
};

/**
 * Claim scratch card mutation
 */
export const useClaimScratch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.post('/api/coins/scratch');
            return response?.data ?? response;
        },
        onSuccess: (data) => {
            if (data?.newBalance !== undefined) {
                queryClient.setQueryData(coinKeys.balance(), data.newBalance);
            }
            queryClient.invalidateQueries({ queryKey: coinKeys.engagement() });
            queryClient.invalidateQueries({ queryKey: coinKeys.history() });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Scratch card claim failed:', error);
            }
        },
    });
};

/**
 * Redeem coins for boost/featured/spotlight
 */
export const useRedeemCoins = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ type, postId, idempotencyKey }) => {
            const response = await api.post('/api/coins/redeem', {
                type,
                postId,
                idempotencyKey,
            });
            return response?.data ?? response;
        },
        onSuccess: (data) => {
            if (data?.newBalance !== undefined) {
                queryClient.setQueryData(coinKeys.balance(), data.newBalance);
            }
            queryClient.invalidateQueries({ queryKey: coinKeys.history() });
            // Invalidate posts cache if a post was boosted
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Redeem coins failed:', error);
            }
        },
    });
};

/**
 * Redeem store rewards (boost, badge, top_search)
 */
export const useStoreRedeem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ type, postId, idempotencyKey }) => {
            const response = await api.post('/api/coins/store-redeem', {
                type,
                postId,
                idempotencyKey,
            });
            return response?.data ?? response;
        },
        onSuccess: (data) => {
            if (data?.newBalance !== undefined) {
                queryClient.setQueryData(coinKeys.balance(), data.newBalance);
            }
            queryClient.invalidateQueries({ queryKey: coinKeys.history() });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Store redeem failed:', error);
            }
        },
    });
};

/**
 * Claim referral milestones
 */
export const useClaimReferralMilestones = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.post('/api/coins/referral-milestones');
            return response?.data ?? response;
        },
        onSuccess: (data) => {
            if (data?.balance !== undefined) {
                queryClient.setQueryData(coinKeys.balance(), data.balance);
            }
            queryClient.invalidateQueries({ queryKey: coinKeys.engagement() });
            queryClient.invalidateQueries({ queryKey: coinKeys.history() });
            queryClient.invalidateQueries({ queryKey: ['rewards'] });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Claim referral milestones failed:', error);
            }
        },
    });
};

export default {
    useCoinBalance,
    useCoinHistory,
    useEngagementStatus,
    useClaimCheckIn,
    useSpinWheel,
    useClaimScratch,
    useRedeemCoins,
    useStoreRedeem,
    useClaimReferralMilestones,
    coinKeys,
};
