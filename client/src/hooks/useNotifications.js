/**
 * useNotifications Hook
 * TanStack Query hooks for notification management
 *
 * Backend endpoints:
 * - GET /api/notifications -> notifications list
 * - GET /api/notifications/unread-count -> { count }
 * - PUT /api/notifications/:id/read -> mark as read
 * - PUT /api/notifications/mark-all-read -> mark all as read
 * - DELETE /api/notifications/:id -> delete notification
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const STALE_TIME = 60 * 1000; // 1 minute
const PAGE_SIZE = 20;

// Query keys for cache management
export const notificationKeys = {
    all: ['notifications'],
    lists: () => [...notificationKeys.all, 'list'],
    list: (filters) => [...notificationKeys.all, 'list', filters],
    unreadCount: () => [...notificationKeys.all, 'unread-count'],
};

/**
 * Fetch notifications with infinite scroll
 */
export const useNotifications = (options = {}) => {
    const { enabled = true } = options;

    return useInfiniteQuery({
        queryKey: notificationKeys.lists(),
        initialPageParam: 1,
        queryFn: async ({ pageParam = 1 }) => {
            const response = await api.get('/api/notifications', {
                params: {
                    page: pageParam,
                    limit: PAGE_SIZE,
                }
            });
            const data = response?.data ?? response;
            const notifications = Array.isArray(data) ? data : (data?.notifications ?? []);
            return {
                notifications,
                page: pageParam,
                hasMore: notifications.length === PAGE_SIZE,
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
 * Get flattened notifications array from infinite query
 */
export const useNotificationsList = (options = {}) => {
    const query = useNotifications(options);

    const notifications = query.data?.pages.flatMap(page => page.notifications) ?? [];

    return {
        ...query,
        notifications,
    };
};

/**
 * Fetch unread notification count
 */
export const useUnreadCount = (options = {}) => {
    const { enabled = true, refetchInterval = 30000 } = options;

    return useQuery({
        queryKey: notificationKeys.unreadCount(),
        queryFn: async () => {
            const response = await api.get('/api/notifications/unread-count');
            const data = response?.data ?? response;
            return data?.count ?? 0;
        },
        staleTime: STALE_TIME / 2, // 30 seconds
        gcTime: STALE_TIME,
        enabled,
        refetchInterval,
        retry: 2,
    });
};

/**
 * Mark single notification as read with optimistic update
 */
export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId) => {
            const response = await api.put(`/api/notifications/${notificationId}/read`);
            return response?.data ?? response;
        },

        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
            await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });

            const previousLists = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });
            const previousCount = queryClient.getQueryData(notificationKeys.unreadCount());

            // Optimistically update notifications list
            previousLists.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (old) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n =>
                                String(n.notification_id || n.id) === String(notificationId)
                                    ? { ...n, read: true, is_read: true }
                                    : n
                            ),
                        })),
                    };
                });
            });

            // Optimistically decrement unread count
            if (typeof previousCount === 'number') {
                queryClient.setQueryData(notificationKeys.unreadCount(), Math.max(0, previousCount - 1));
            }

            return { previousLists, previousCount };
        },

        onError: (err, notificationId, context) => {
            context?.previousLists?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            if (context?.previousCount !== undefined) {
                queryClient.setQueryData(notificationKeys.unreadCount(), context.previousCount);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
        },
    });
};

/**
 * Mark all notifications as read
 */
export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.put('/api/notifications/mark-all-read');
            return response?.data ?? response;
        },

        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
            await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });

            const previousLists = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });

            // Optimistically mark all as read
            previousLists.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (old) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n => ({
                                ...n,
                                read: true,
                                is_read: true,
                            })),
                        })),
                    };
                });
            });

            // Set unread count to 0
            queryClient.setQueryData(notificationKeys.unreadCount(), 0);

            return { previousLists };
        },

        onError: (err, variables, context) => {
            context?.previousLists?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
        },
    });
};

/**
 * Delete a notification with optimistic update
 */
export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId) => {
            const response = await api.delete(`/api/notifications/${notificationId}`);
            return response?.data ?? response;
        },

        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

            const previousLists = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });

            // Optimistically remove the notification
            previousLists.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (old) => {
                    if (!old?.pages) return old;
                    return {
                        ...old,
                        pages: old.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.filter(n =>
                                String(n.notification_id || n.id) !== String(notificationId)
                            ),
                        })),
                    };
                });
            });

            return { previousLists };
        },

        onError: (err, notificationId, context) => {
            context?.previousLists?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
        },
    });
};

export default {
    useNotifications,
    useNotificationsList,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
    notificationKeys,
};
