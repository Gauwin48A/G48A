/**
 * VirtualizedList Component
 * Defender Prompt 3: Hyper-Efficient Frontend
 * 
 * Uses react-window to only render visible items
 * Essential for lists with 10,000+ items
 */

import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * Virtualized list for large datasets
 * Only renders visible items in the DOM
 */
const VirtualizedList = ({
    items,
    itemHeight = 200,
    renderItem,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    className = '',
    overscanCount = 5
}) => {
    // Handle scroll to trigger load more
    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (hasMore && !isLoading && visibleStopIndex >= items.length - 3) {
            onLoadMore?.();
        }
    }, [hasMore, isLoading, items.length, onLoadMore]);

    // Row renderer
    const Row = useCallback(({ index, style }) => {
        if (index >= items.length) {
            // Loading placeholder
            return (
                <div style={style} className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
            );
        }

        const item = items[index];
        return (
            <div style={style}>
                {renderItem(item, index)}
            </div>
        );
    }, [items, renderItem]);

    // Calculate total count including loading row
    const itemCount = hasMore ? items.length + 1 : items.length;

    if (items.length === 0 && !isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No items to display
            </div>
        );
    }

    return (
        <div className={`h-full ${className}`}>
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        width={width}
                        itemCount={itemCount}
                        itemSize={itemHeight}
                        onItemsRendered={handleItemsRendered}
                        overscanCount={overscanCount}
                    >
                        {Row}
                    </List>
                )}
            </AutoSizer>
        </div>
    );
};

/**
 * Grid version for card layouts
 */
export const VirtualizedGrid = ({
    items,
    columns = 2,
    rowHeight = 280,
    renderItem,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    className = '',
    gap = 16
}) => {
    // Calculate rows from items
    const rows = Math.ceil(items.length / columns);

    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        const lastVisibleRow = visibleStopIndex;
        const lastItemIndex = lastVisibleRow * columns;

        if (hasMore && !isLoading && lastItemIndex >= items.length - columns * 2) {
            onLoadMore?.();
        }
    }, [hasMore, isLoading, items.length, columns, onLoadMore]);

    const Row = useCallback(({ index, style }) => {
        const startIndex = index * columns;
        const rowItems = items.slice(startIndex, startIndex + columns);

        if (rowItems.length === 0 && hasMore) {
            return (
                <div style={style} className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
            );
        }

        return (
            <div
                style={{ ...style, display: 'flex', gap: `${gap}px`, padding: `0 ${gap / 2}px` }}
            >
                {rowItems.map((item, i) => (
                    <div key={startIndex + i} style={{ flex: 1 }}>
                        {renderItem(item, startIndex + i)}
                    </div>
                ))}
                {/* Fill empty slots */}
                {Array(columns - rowItems.length).fill(null).map((_, i) => (
                    <div key={`empty-${i}`} style={{ flex: 1 }} />
                ))}
            </div>
        );
    }, [items, columns, gap, hasMore, renderItem]);

    return (
        <div className={`h-full ${className}`}>
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        width={width}
                        itemCount={rows + (hasMore ? 1 : 0)}
                        itemSize={rowHeight}
                        onItemsRendered={handleItemsRendered}
                        overscanCount={3}
                    >
                        {Row}
                    </List>
                )}
            </AutoSizer>
        </div>
    );
};

export default VirtualizedList;
