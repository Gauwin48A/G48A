/**
 * Relative time formatting utility — U-05
 * Converts timestamps to human-friendly relative strings.
 *
 * Usage:
 *   import { formatRelativeTime } from '@/utils/relativeTime';
 *   <span>{formatRelativeTime(post.created_at)}</span>
 */

/**
 * Formats a timestamp as a relative time string.
 *
 * @param {string|number|Date} timestamp - ISO string, unix ms, or Date object
 * @returns {string} e.g. "Just now", "5 minutes ago", "3 hours ago", "2 days ago", "Jan 15, 2026"
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  const diffWk  = Math.floor(diffDay / 7);
  const diffMo  = Math.floor(diffDay / 30);

  if (diffSec < 30)  return 'Just now';
  if (diffSec < 60)  return `${diffSec} seconds ago`;
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60)  return `${diffMin} minutes ago`;
  if (diffHr  === 1) return '1 hour ago';
  if (diffHr  < 24)  return `${diffHr} hours ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7)   return `${diffDay} days ago`;
  if (diffWk  === 1) return '1 week ago';
  if (diffWk  < 5)   return `${diffWk} weeks ago`;
  if (diffMo  === 1) return '1 month ago';
  if (diffMo  < 12)  return `${diffMo} months ago`;

  // Older than ~1 year: show absolute date
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats a timestamp as a compact relative string for tight UI spaces.
 * e.g. "2m", "4h", "3d", "Jan 15"
 *
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export function formatRelativeTimeCompact(timestamp) {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs  = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)  return 'now';
  if (diffMin < 60)  return `${diffMin}m`;
  if (diffHr  < 24)  return `${diffHr}h`;
  if (diffDay < 30)  return `${diffDay}d`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
