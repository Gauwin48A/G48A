/**
 * VirtualizedFeed Component
 * Protocol: Hyper-Scale - Phase 1
 * 
 * Uses react-virtuoso for 60FPS scrolling with 1000+ items
 * Only renders visible items (~10-15), not all 1000
 */

import React, { forwardRef } from 'react';
import { Virtuoso } from 'react-virtuoso';

/**
 * High-performance virtualized list for feeds
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function that renders each item: (item, index) => JSX
 * @param {Function} onLoadMore - Callback when user reaches bottom
 * @param {boolean} hasMore - Whether more items are available
 * @param {boolean} isLoading - Whether currently loading more
 * @param {Component} EmptyComponent - Component to show when no items
 * @param {Component} LoaderComponent - Component to show while loading more
 * @param {string} className - Additional classes for container
 */
const VirtualizedFeed = forwardRef(({
    items = [],
    renderItem,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    EmptyComponent,
    LoaderComponent,
    className = '',
    itemClassName = '',
    overscan = 5, // Number of items to render outside viewport
}, ref) => {

    // Empty state
    if (!items.length && !isLoading) {
        return EmptyComponent || (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No items to display
            </div>
        );
    }

    // Handle end reached
    const handleEndReached = () => {
        if (hasMore && !isLoading && onLoadMore) {
            onLoadMore();
        }
    };

    // Default loader
    const DefaultLoader = () => (
        <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
    );

    return (
        <Virtuoso
            ref={ref}
            style={{ height: '100%' }}
            className={className}
            data={items}
            overscan={overscan}
            endReached={handleEndReached}
            itemContent={(index, item) => (
                <div className={itemClassName}>
                    {renderItem(item, index)}
                </div>
            )}
            components={{
                Footer: () => {
                    if (isLoading) {
                        return LoaderComponent || <DefaultLoader />;
                    }
                    if (!hasMore && items.length > 0) {
                        return (
                            <div className="text-center py-4 text-sm text-gray-400">
                                You've seen all items
                            </div>
                        );
                    }
                    return null;
                },
            }}
        />
    );
});

VirtualizedFeed.displayName = 'VirtualizedFeed';

/**
 * Grid version for 2-column layouts
 */
export const VirtualizedGrid = forwardRef(({
    items = [],
    renderItem,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    columns = 2,
    gap = 4,
    className = '',
}, ref) => {

    // Group items into rows
    const rows = [];
    for (let i = 0; i < items.length; i += columns) {
        rows.push(items.slice(i, i + columns));
    }

    return (
        <VirtualizedFeed
            ref={ref}
            items={rows}
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={onLoadMore}
            className={className}
            renderItem={(row, rowIndex) => (
                <div
                    className={`grid grid-cols-${columns} gap-${gap}`}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: `${gap * 4}px`
                    }}
                >
                    {row.map((item, colIndex) => (
                        <div key={`${rowIndex}-${colIndex}`}>
                            {renderItem(item, rowIndex * columns + colIndex)}
                        </div>
                    ))}
                </div>
            )}
        />
    );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

export default VirtualizedFeed;
