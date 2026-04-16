/**
 * India-specific price formatting utility — U-19 / IN-01
 *
 * Usage:
 *   import { formatINR, formatINRCompact } from '@/utils/formatPrice';
 *   <span>{formatINR(post.price)}</span>          // ₹1,25,000
 *   <span>{formatINRCompact(post.price)}</span>   // ₹1.25L
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Formats a number as Indian Rupee currency string.
 * Uses Indian comma grouping (2,50,000 not 250,000).
 *
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. "₹1,25,000" or "" if invalid
 */
export function formatINR(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '';
  return INR_FORMATTER.format(num);
}

/**
 * Formats a number as compact Indian-style currency.
 * < 1,000         → ₹500
 * 1,000-99,999    → ₹25K
 * 1L+             → ₹1.25L
 * 1Cr+            → ₹2.5Cr
 *
 * @param {number|string|null|undefined} amount
 * @returns {string} e.g. "₹1.25L" or "" if invalid
 */
export function formatINRCompact(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return '';

  if (num >= 1_00_00_000) {
    const cr = (num / 1_00_00_000).toFixed(1).replace(/\.0$/, '');
    return `₹${cr}Cr`;
  }
  if (num >= 1_00_000) {
    const lakh = (num / 1_00_000).toFixed(2).replace(/\.?0+$/, '');
    return `₹${lakh}L`;
  }
  if (num >= 1_000) {
    const k = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `₹${k}K`;
  }
  return `₹${num}`;
}

/**
 * Calculates and formats discounted price.
 *
 * @param {number|string} originalPrice
 * @param {number|string} discountPercent - e.g. 10 for 10%
 * @returns {{ original: string, discounted: string, saved: string }}
 */
export function formatDiscountedPrice(originalPrice, discountPercent) {
  const price    = Number(originalPrice);
  const discount = Number(discountPercent);

  if (!Number.isFinite(price) || price <= 0) {
    return { original: '', discounted: '', saved: '' };
  }

  if (!Number.isFinite(discount) || discount <= 0) {
    return { original: formatINR(price), discounted: formatINR(price), saved: '' };
  }

  const discounted = price * (1 - discount / 100);
  const saved      = price - discounted;

  return {
    original:   formatINR(price),
    discounted: formatINR(Math.round(discounted)),
    saved:      formatINR(Math.round(saved)),
  };
}
