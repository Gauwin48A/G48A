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

export function getCoinsPerRupee(planOrIsPremium = false) {
  return _configCoinsPerRupee || DEFAULT_COINS_PER_RUPEE; // 100 coins = ₹1
}

/**
 * Convert coins to rupees.
 * @param {number} coins
 * @param {boolean|string} [planOrIsPremium=false]
 * @returns {number} rupees (2 decimal places)
 */
export function coinsToRupees(coins, planOrIsPremium = false) {
  const c = Number(coins) || 0;
  const rate = getCoinsPerRupee(planOrIsPremium);
  return Math.round((c / rate) * 100) / 100;
}

/**
 * Convert rupees to coins.
 * @param {number} rupees
 * @param {boolean|string} [planOrIsPremium=false]
 * @returns {number} coins (whole number)
 */
export function rupeesToCoins(rupees, planOrIsPremium = false) {
  const r = Number(rupees) || 0;
  const rate = getCoinsPerRupee(planOrIsPremium);
  return Math.round(r * rate);
}

/**
 * Format coins as a "₹X.XX value" display string.
 * @param {number} coins
 * @param {boolean|string} [planOrIsPremium=false]
 * @returns {string} e.g. "₹5.00"
 */
export function formatCoinValue(coins, planOrIsPremium = false) {
  const rupees = coinsToRupees(coins, planOrIsPremium);
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
 * @param {boolean|string} [planOrIsPremium=false]
 * @returns {string} e.g. "500 coins (₹25)"
 */
export function formatCoinWithRupee(coins, planOrIsPremium = false) {
  return `${Number(coins).toLocaleString()} coins (${formatCoinValue(coins, planOrIsPremium)})`;
}
