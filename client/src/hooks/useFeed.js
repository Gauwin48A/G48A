/**
 * useFeed Hook
 * Defender Prompt 3: Hyper-Efficient Frontend
 * 
 * Uses TanStack Query for caching (5 min stale time)
 * Supports infinite scroll with pagination
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, useEffect } from 'react';
import api from '../lib/api';
import { getBestAvailableLocation } from '../services/locationService';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 20;

const hasValue = (value) => value !== undefined && value !== null && value !== '';

/**
 * Custom hook for efficient feed fetching with caching
 */
export const useFeed = (options = {}) => {
    const {
        category = null,
        minPrice = null,
        maxPrice = null,
        sortBy = 'created_at',
        lat = null,
        lng = null,
        radius = 50,
        searchQuery = null,
        enabled = true
    } = options;

    const queryClient = useQueryClient();

    // Build query key for caching
    const queryKey = useMemo(() => [
        'feed',
        { category, minPrice, maxPrice, sortBy, lat, lng, radius, searchQuery }
    ], [category, minPrice, maxPrice, sortBy, lat, lng, radius, searchQuery]);

    // Fetch function
    const fetchPosts = async ({ pageParam = 1, signal }) => {
        const params = new URLSearchParams({
            page: pageParam.toString(),
            limit: PAGE_SIZE.toString()
        });

        if (hasValue(category)) params.set('category', String(category));
        if (hasValue(minPrice)) params.set('minPrice', String(minPrice));
        if (hasValue(maxPrice)) params.set('maxPrice', String(maxPrice));
        if (hasValue(sortBy)) params.set('sortBy', String(sortBy));
        if (hasValue(lat)) params.set('lat', String(lat));
        if (hasValue(lng)) params.set('lng', String(lng));
        if (hasValue(radius)) params.set('radius', String(radius));
        if (hasValue(searchQuery)) params.set('search', String(searchQuery));

        const hasCoordinates = hasValue(lat) && hasValue(lng);
        const endpoint = hasCoordinates
            ? `/api/posts/nearby-v2?${params}`
            : `/api/posts?${params}`;

        const response = await api.get(endpoint, { signal });
        const payload = response?.data ?? response;
        const feedPosts = Array.isArray(payload?.posts)
            ? payload.posts
            : (Array.isArray(payload) ? payload : []);

        return {
            posts: feedPosts,
            page: pageParam,
            hasMore: feedPosts.length === PAGE_SIZE
        };
    };

    // Use infinite query for pagination
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey,
        initialPageParam: 1,
        queryFn: fetchPosts,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: STALE_TIME,
        gcTime: STALE_TIME * 2,
        enabled,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 2
    });

    // Flatten pages into single array
    const posts = useMemo(() =>
        data?.pages.flatMap(page => page.posts) || [],
        [data]
    );

    // Load more callback for infinite scroll
    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Prefetch next page for smoother UX
    const prefetchNext = useCallback(async () => {
        const currentPage = data?.pages.length || 0;
        if (hasNextPage) {
            await queryClient.prefetchInfiniteQuery({
                queryKey,
                queryFn: () => fetchPosts({ pageParam: currentPage + 1 })
            });
        }
    }, [data, hasNextPage, queryClient, queryKey]);

    // Invalidate cache and refetch
    const refresh = useCallback(() => {
        return refetch();
    }, [refetch]);

    return {
        posts,
        isLoading,
        isError,
        error,
        loadMore,
        hasNextPage,
        isFetchingNextPage,
        refetch: refresh,
        isRefetching,
        prefetchNext,
        totalLoaded: posts.length
    };
};

/**
 * Hook for nearby posts with geolocation
 */
export const useNearbyPosts = (options = {}) => {
    const { radius = 50, category = null, enabled = true } = options;

    // Get user location
    const [location, setLocation] = useState(null);

    useEffect(() => {
        if (!enabled) return;
        let active = true;

        const detectLocation = async () => {
            try {
                const bestLoc = await getBestAvailableLocation({
                    allowCache: true,
                    allowIpFallback: true,
                    requiredAccuracy: 500
                });
                if (!active) return;
                setLocation({
                    lat: bestLoc.latitude ?? bestLoc.lat,
                    lng: bestLoc.longitude ?? bestLoc.lng
                });
            } catch (err) {
                console.warn('[Geolocation] Error:', err?.message || err);
                if (!active) return;
                // Fallback to default location (Hyderabad)
                setLocation({ lat: 17.385, lng: 78.4867 });
            }
        };

        detectLocation();

        return () => {
            active = false;
        };
    }, [enabled]);

    return useFeed({
        ...options,
        lat: location?.lat,
        lng: location?.lng,
        radius,
        category,
        enabled: enabled && !!location
    });
};

export default useFeed;
