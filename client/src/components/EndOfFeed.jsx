/**
 * EndOfFeed — U-13
 * Shown when infinite scroll reaches the end of available posts.
 * Renders a clean "You've seen all posts" message with a divider.
 *
 * Usage:
 *   import EndOfFeed from '@/components/EndOfFeed';
 *   {!hasMore && posts.length > 0 && <EndOfFeed count={posts.length} />}
 */

import React from 'react';

/**
 * @param {object} props
 * @param {number} [props.count]    - Total posts shown (optional — shown in message)
 * @param {string} [props.className] - Extra CSS classes
 */
export default function EndOfFeed({ count, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 ${className}`}
      role="status"
      aria-label="End of feed"
    >
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap select-none">
          {count != null ? `All ${count} posts shown` : "You've seen all posts"}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
        Check back later for new listings
      </p>
    </div>
  );
}
