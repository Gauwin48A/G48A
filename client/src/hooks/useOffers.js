/**
 * useOffers Hook
 * TanStack Query hooks for offers CRUD with optimistic updates
 *
 * Backend endpoints:
 * - GET /api/offers?role=seller|buyer&status=&page=&limit= -> { offers, total, page, limit }
 * - POST /api/offers -> { message, offer }
 * - PUT /api/offers/:offerId -> { message, offer }
 * - GET /api/offers/history/:postId -> { history, total, limit }
 * - POST /api/offers/auto-accept -> { message, autoAcceptedCount }
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const PAGE_SIZE = 20;

// Query keys for cache management
export const offerKeys = {
    all: ['offers'],
    lists: () => [...offerKeys.all, 'list'],
    list: (filters) => [...offerKeys.all, 'list', filters],
    history: (postId) => [...offerKeys.all, 'history', postId],
};

/**
 * Fetch offers for the authenticated user (paginated)
 * @param {Object} options - { role: 'seller'|'buyer', status, enabled }
 */
export const useOffers = (options = {}) => {
    const { role = 'seller', status, enabled = true } = options;

    return useInfiniteQuery({
        queryKey: offerKeys.list({ role, status }),
        initialPageParam: 1,
        queryFn: async ({ pageParam = 1 }) => {
            const response = await api.get('/api/offers', {
                params: {
                    role,
                    status: status || undefined,
                    page: pageParam,
                    limit: PAGE_SIZE,
                }
            });
            const data = response?.data ?? response;
            return {
                offers: data?.offers ?? [],
                total: data?.total ?? 0,
                page: data?.page ?? pageParam,
                hasMore: (data?.offers?.length ?? 0) === PAGE_SIZE,
            };
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        retry: 2,
    });
};

/**
 * Get flattened offers array from infinite query result
 */
export const useOffersList = (options = {}) => {
    const query = useOffers(options);

    const offers = query.data?.pages.flatMap(page => page.offers) ?? [];
    const total = query.data?.pages[0]?.total ?? 0;

    return {
        ...query,
        offers,
        total,
    };
};

/**
 * Fetch offer history for a specific post
 */
export const useOfferHistory = (postId, options = {}) => {
    const { enabled = true, limit = 100 } = options;

    return useQuery({
        queryKey: offerKeys.history(postId),
        queryFn: async () => {
            const response = await api.get(`/api/offers/history/${postId}`, {
                params: { limit }
            });
            const data = response?.data ?? response;
            return {
                history: data?.history ?? [],
                total: data?.total ?? 0,
            };
        },
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled: enabled && !!postId,
        retry: 2,
    });
};

/**
 * Create a new offer mutation
 */
export const useCreateOffer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId, offeredPrice, message }) => {
            const response = await api.post('/api/offers', {
                postId,
                offeredPrice,
                message,
            });
            return response?.data ?? response;
        },
        onSuccess: () => {
            // Invalidate buyer offers list
            queryClient.invalidateQueries({ queryKey: offerKeys.lists() });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Create offer failed:', error);
            }
        },
    });
};

/**
 * Respond to offer mutation (accept/reject/counter) with optimistic updates
 */
export const useRespondToOffer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ offerId, action, counterPrice }) => {
            const response = await api.put(`/api/offers/${offerId}`, {
                action,
                counterPrice: action === 'counter' ? counterPrice : undefined,
            });
            return response?.data ?? response;
        },

        // Optimistic update
        onMutate: async ({ offerId, action, counterPrice }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: offerKeys.lists() });

            // Snapshot current data
            const previousOffers = queryClient.getQueriesData({ queryKey: offerKeys.lists() });

            // Determine new status
            const newStatus = action === 'accept' ? 'accepted'
                : action === 'reject' ? 'rejected'
                : 'countered';

            // Optimistically update all offer lists
            previousOffers.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (old) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map(page => ({
                            ...page,
                            offers: page.offers.map(offer =>
                                String(offer.offer_id) === String(offerId)
                                    ? {
                                        ...offer,
                                        status: newStatus,
                                        counter_price: action === 'counter' ? counterPrice : offer.counter_price,
                                    }
                                    : offer
                            ),
                        })),
                    };
                });
            });

            return { previousOffers };
        },

        // Rollback on error
        onError: (err, variables, context) => {
            context?.previousOffers?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            if (import.meta.env?.DEV) {
                console.error('Respond to offer failed:', err);
            }
        },

        // Always refetch after mutation
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: offerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
};

/**
 * Accept offer shorthand
 */
export const useAcceptOffer = () => {
    const respondMutation = useRespondToOffer();

    return {
        ...respondMutation,
        mutate: (offerId) => respondMutation.mutate({ offerId, action: 'accept' }),
        mutateAsync: (offerId) => respondMutation.mutateAsync({ offerId, action: 'accept' }),
    };
};

/**
 * Reject offer shorthand
 */
export const useRejectOffer = () => {
    const respondMutation = useRespondToOffer();

    return {
        ...respondMutation,
        mutate: (offerId) => respondMutation.mutate({ offerId, action: 'reject' }),
        mutateAsync: (offerId) => respondMutation.mutateAsync({ offerId, action: 'reject' }),
    };
};

/**
 * Counter offer shorthand
 */
export const useCounterOffer = () => {
    const respondMutation = useRespondToOffer();

    return {
        ...respondMutation,
        mutate: ({ offerId, counterPrice }) =>
            respondMutation.mutate({ offerId, action: 'counter', counterPrice }),
        mutateAsync: ({ offerId, counterPrice }) =>
            respondMutation.mutateAsync({ offerId, action: 'counter', counterPrice }),
    };
};

/**
 * Set auto-accept threshold for a post
 */
export const useSetAutoAccept = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId, minAcceptPrice }) => {
            const response = await api.post('/api/offers/auto-accept', {
                postId,
                minAcceptPrice,
            });
            return response?.data ?? response;
        },
        onSuccess: (data, { postId }) => {
            // Invalidate offers if any were auto-accepted
            if (data?.autoAcceptedCount > 0) {
                queryClient.invalidateQueries({ queryKey: offerKeys.lists() });
            }
            // Invalidate the post cache
            queryClient.invalidateQueries({ queryKey: ['posts', postId] });
        },
        onError: (error) => {
            if (import.meta.env?.DEV) {
                console.error('Set auto-accept failed:', error);
            }
        },
    });
};

export default {
    useOffers,
    useOffersList,
    useOfferHistory,
    useCreateOffer,
    useRespondToOffer,
    useAcceptOffer,
    useRejectOffer,
    useCounterOffer,
    useSetAutoAccept,
    offerKeys,
};
