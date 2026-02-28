/**
 * Optimistic Like Hook
 * Protocol: UX Perfection - Phase 2
 * 
 * Instant UI updates - no waiting for server
 * Automatic rollback on failure
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

function toggleLikeOnPost(post, targetPostId) {
    if (!post || String(post.post_id) !== String(targetPostId)) {
        return post;
    }

    const currentlyLiked = Boolean(post.is_liked);
    const currentCount = Number(post.likes_count ?? post.likes ?? 0) || 0;

    return {
        ...post,
        is_liked: !currentlyLiked,
        likes_count: currentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1
    };
}

function applyOptimisticLikeUpdate(data, postId) {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map((post) => toggleLikeOnPost(post, postId));
    }

    if (Array.isArray(data?.pages)) {
        return {
            ...data,
            pages: data.pages.map((page) => {
                if (Array.isArray(page)) {
                    return page.map((post) => toggleLikeOnPost(post, postId));
                }

                if (Array.isArray(page?.posts)) {
                    return {
                        ...page,
                        posts: page.posts.map((post) => toggleLikeOnPost(post, postId))
                    };
                }

                return page;
            })
        };
    }

    if (Array.isArray(data?.posts)) {
        return {
            ...data,
            posts: data.posts.map((post) => toggleLikeOnPost(post, postId))
        };
    }

    return data;
}

export const useLikePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (postId) => {
            const response = await api.post(`/posts/${postId}/like`);
            return response?.data ?? response;
        },

        // ON MUTATE: Run immediately when user clicks (0ms response)
        onMutate: async (postId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['feed'] });
            await queryClient.cancelQueries({ queryKey: ['posts'] });

            // Snapshot all matching query values for rollback
            const previousFeedEntries = queryClient.getQueriesData({ queryKey: ['feed'] });
            const previousPostsEntries = queryClient.getQueriesData({ queryKey: ['posts'] });

            // Optimistic updates across all feed/posts cache variants
            previousFeedEntries.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (old) => applyOptimisticLikeUpdate(old, postId));
            });
            previousPostsEntries.forEach(([queryKey]) => {
                queryClient.setQueryData(queryKey, (old) => applyOptimisticLikeUpdate(old, postId));
            });

            return { previousFeedEntries, previousPostsEntries };
        },

        // ON ERROR: Rollback to previous state
        onError: (err, postId, context) => {
            context?.previousFeedEntries?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            context?.previousPostsEntries?.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            if (import.meta.env.DEV) {
                console.error('Like failed:', err);
            }
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
            return response?.data ?? response;
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
