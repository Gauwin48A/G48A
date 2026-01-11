/**
 * Optimistic Like Hook
 * Protocol: UX Perfection - Phase 2
 * 
 * Instant UI updates - no waiting for server
 * Automatic rollback on failure
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useLikePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (postId) => {
            const response = await api.post(`/posts/${postId}/like`);
            return response.data;
        },

        // ON MUTATE: Run immediately when user clicks (0ms response)
        onMutate: async (postId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['feed'] });
            await queryClient.cancelQueries({ queryKey: ['posts'] });

            // Snapshot previous values for rollback
            const previousFeed = queryClient.getQueryData(['feed']);
            const previousPosts = queryClient.getQueryData(['posts']);

            // Optimistic update for feed
            queryClient.setQueryData(['feed'], (old) => {
                if (!old) return old;
                return old.map(post =>
                    post.post_id === postId
                        ? {
                            ...post,
                            is_liked: !post.is_liked,
                            likes_count: post.is_liked
                                ? Math.max(0, (post.likes_count || 0) - 1)
                                : (post.likes_count || 0) + 1
                        }
                        : post
                );
            });

            // Optimistic update for posts list
            queryClient.setQueryData(['posts'], (old) => {
                if (!old) return old;
                return old.map(post =>
                    post.post_id === postId
                        ? {
                            ...post,
                            is_liked: !post.is_liked,
                            likes_count: post.is_liked
                                ? Math.max(0, (post.likes_count || 0) - 1)
                                : (post.likes_count || 0) + 1
                        }
                        : post
                );
            });

            return { previousFeed, previousPosts };
        },

        // ON ERROR: Rollback to previous state
        onError: (err, postId, context) => {
            if (context?.previousFeed) {
                queryClient.setQueryData(['feed'], context.previousFeed);
            }
            if (context?.previousPosts) {
                queryClient.setQueryData(['posts'], context.previousPosts);
            }
            console.error('Like failed:', err);
        },

        // ON SETTLED: Sync with server to confirm
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
};

/**
 * Optimistic Save/Wishlist Hook
 */
export const useSavePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (postId) => {
            const response = await api.post(`/wishlist/${postId}`);
            return response.data;
        },

        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['posts'] });
            const previousPosts = queryClient.getQueryData(['posts']);

            queryClient.setQueryData(['posts'], (old) => {
                if (!old) return old;
                return old.map(post =>
                    post.post_id === postId
                        ? { ...post, is_saved: !post.is_saved }
                        : post
                );
            });

            return { previousPosts };
        },

        onError: (err, postId, context) => {
            if (context?.previousPosts) {
                queryClient.setQueryData(['posts'], context.previousPosts);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        },
    });
};

export default useLikePost;
