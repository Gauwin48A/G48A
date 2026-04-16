/**
 * Avatar color utility — U-04
 * Generates a consistent, deterministic color from a user ID string.
 * Uses a character-code hash so the same user always gets the same color.
 *
 * Usage:
 *   import { getAvatarColor } from '@/utils/avatarColor';
 *   <div style={{ background: getAvatarColor(userId) }}>...</div>
 */

const AVATAR_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
];

/**
 * Returns a deterministic hex color string for the given ID.
 * Falls back gracefully on null/undefined IDs.
 *
 * @param {string|null|undefined} id - user ID or any string
 * @returns {string} hex color, e.g. '#6366f1'
 */
export function getAvatarColor(id) {
  if (!id) return AVATAR_COLORS[0];

  // Simple djb2-style hash over all characters for good distribution
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0; // bitwise OR keeps it 32-bit signed
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Returns the appropriate text color (white or black) for readability
 * on top of the given avatar background color.
 *
 * @param {string} hexColor - background color hex string
 * @returns {'#ffffff'|'#1a1a1a'} contrasting text color
 */
export function getAvatarTextColor(hexColor) {
  // Parse hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff';
}
