/**
 * Coin-to-Rupee conversion utility.
 * Canonical rate: 100 coins = ₹1.
 * Used in wallet, cart checkout, rewards page, and anywhere coin values are displayed.
 */

const DEFAULT_COINS_PER_RUPEE = 100;

let _configCoinsPerRupee = null;

/**
 * Set the rate from backend config (called once after /coins/rewards-config loads).
 */
export function setCoinsPerRupee(rate) {
  if (typeof rate === "number" && rate > 0) {
    _configCoinsPerRupee = rate;
  }
}

/**
 * Get current conversion rate.
 */
export function getCoinsPerRupee() {
  return _configCoinsPerRupee || DEFAULT_COINS_PER_RUPEE;
}

/**
 * Convert coins to rupees.
 * @param {number} coins
 * @returns {number} rupees (2 decimal places)
 */
export function coinsToRupees(coins) {
  const c = Number(coins) || 0;
  return Math.round((c / getCoinsPerRupee()) * 100) / 100;
}

/**
 * Convert rupees to coins.
 * @param {number} rupees
 * @returns {number} coins (whole number)
 */
export function rupeesToCoins(rupees) {
  const r = Number(rupees) || 0;
  return Math.round(r * getCoinsPerRupee());
}

/**
 * Format coins as a "₹X.XX value" display string.
 * @param {number} coins
 * @returns {string} e.g. "₹5.00"
 */
export function formatCoinValue(coins) {
  const rupees = coinsToRupees(coins);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format a short coin + rupee display.
 * @param {number} coins
 * @returns {string} e.g. "500 coins (₹5)"
 */
export function formatCoinWithRupee(coins) {
  return `${Number(coins).toLocaleString()} coins (${formatCoinValue(coins)})`;
}
