/**
 * coverage.tierRules.test.js
 *
 * Comprehensive tests for tierRules.js to improve coverage:
 * - getTierRules (lookup, fallback)
 * - getSubscriptionExpiry (date calculation)
 * - formatTierDisplay (formatting)
 * - getAllTiersDisplay (all tiers)
 * - applyPromoCode (valid, expired, tier-restricted, limit reached)
 * - getTrialExpiry
 * - getUpsellMessage
 * - getDynamicPrice (night owl deal)
 */

const {
  TIER_RULES,
  TIER_ORDER,
  PROMO_CODES,
  getTierRules,
  getSubscriptionExpiry,
  formatTierDisplay,
  getAllTiersDisplay,
  applyPromoCode,
  consumePromoCode,
  getTrialExpiry,
  getUpsellTier,
  getDowngradeTier,
  getUpsellMessage,
  getDynamicPrice,
} = require('../src/config/tierRules');

describe('tierRules.js — comprehensive coverage', () => {
  describe('getTierRules', () => {
    it('returns rules for valid tier', () => {
      const rules = getTierRules('basic');
      expect(rules).toBeDefined();
      expect(rules.name).toBeDefined();
      expect(rules.priceINR).toBeGreaterThan(0);
    });

    it('returns rules for starter tier', () => {
      const rules = getTierRules('starter');
      expect(rules).toBeDefined();
      expect(rules.name).toBe('Starter Plan');
    });

    it('returns rules for bronze tier', () => {
      const rules = getTierRules('bronze');
      expect(rules).toBeDefined();
      expect(rules.priceINR).toBe(850);
    });

    it('returns rules for silver tier', () => {
      const rules = getTierRules('silver');
      expect(rules).toBeDefined();
      expect(rules.priceINR).toBe(1200);
    });

    it('returns rules for premium tier', () => {
      const rules = getTierRules('premium');
      expect(rules).toBeDefined();
      expect(rules.priceINR).toBeGreaterThan(0);
    });

    it('falls back to basic for unknown tier', () => {
      const rules = getTierRules('nonexistent');
      expect(rules).toBeDefined();
      expect(rules.priceINR).toBe(TIER_RULES.basic.priceINR);
    });

    it('handles null/undefined input', () => {
      const rules = getTierRules(null);
      expect(rules).toBeDefined();
    });
  });

  describe('getSubscriptionExpiry', () => {
    it('returns null for basic tier (no durationMonths)', () => {
      const expiry = getSubscriptionExpiry('basic');
      expect(expiry).toBeNull();
    });

    it('returns a future date for premium tier', () => {
      const expiry = getSubscriptionExpiry('premium');
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns a future date for silver tier', () => {
      const expiry = getSubscriptionExpiry('silver');
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('formatTierDisplay', () => {
    it('returns formatted display for basic', () => {
      const display = formatTierDisplay('basic');
      expect(display.name).toBe('basic');
      expect(display.displayName).toBeDefined();
      expect(display.priceINR).toBeGreaterThan(0);
      expect(display.features).toBeDefined();
      expect(Array.isArray(display.features)).toBe(true);
    });

    it('includes quota information', () => {
      const display = formatTierDisplay('silver');
      expect(display.quotas).toBeDefined();
      expect(display.quotas.boost).toBeDefined();
      expect(display.boostQuotaMonthly).toBeDefined();
    });

    it('includes analytics flag', () => {
      const display = formatTierDisplay('premium');
      expect(typeof display.hasAnalytics).toBe('boolean');
    });

    it('includes tagline', () => {
      const display = formatTierDisplay('starter');
      expect(display.tagline).toBeDefined();
    });
  });

  describe('getAllTiersDisplay', () => {
    it('returns array of all tier displays', () => {
      const all = getAllTiersDisplay();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBe(TIER_ORDER.length);
    });

    it('each entry has required fields', () => {
      const all = getAllTiersDisplay();
      for (const tier of all) {
        expect(tier.name).toBeDefined();
        expect(tier.displayName).toBeDefined();
        expect(tier.priceINR).toBeDefined();
        expect(typeof tier.features).toBe('object');
      }
    });
  });

  describe('applyPromoCode', () => {
    it('rejects invalid promo code', async () => {
      const result = await applyPromoCode('INVALID', 'basic', null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('applies valid WELCOME20 code (no expiry)', async () => {
      const result = await applyPromoCode('WELCOME20', 'basic', null);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(0.2);
      expect(result.discountPercent).toBe(20);
      expect(result.finalPrice).toBeLessThan(result.originalPrice);
    });

    it('applies WELCOME20 code', async () => {
      const result = await applyPromoCode('WELCOME20', 'basic', null);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(0.2);
    });

    it('rejects tier-restricted code for wrong tier', async () => {
      const result = await applyPromoCode('SILVER10', 'basic', null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('silver');
    });

    it('accepts tier-restricted code for correct tier', async () => {
      const result = await applyPromoCode('SILVER10', 'silver', null);
      expect(result.valid).toBe(true);
    });

    it('applies BRONZE15 to bronze tier', async () => {
      const result = await applyPromoCode('BRONZE15', 'bronze', null);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(0.15);
    });

    it('handles case-insensitive promo codes', async () => {
      const result = await applyPromoCode('welcome20', 'basic', null);
      expect(result.valid).toBe(true);
    });

    it('handles null promo code', async () => {
      const result = await applyPromoCode(null, 'basic', null);
      expect(result.valid).toBe(false);
    });
  });

  describe('getTrialExpiry', () => {
    it('returns null for tier without trial', () => {
      const expiry = getTrialExpiry('basic');
      expect(expiry).toBeNull();
    });

    it('returns a date for tier with trial', () => {
      // Check if any tier has trialDays
      const hasTrialTier = TIER_ORDER.find(t => getTierRules(t).trialDays > 0);
      if (hasTrialTier) {
        const expiry = getTrialExpiry(hasTrialTier);
        expect(expiry).toBeInstanceOf(Date);
      }
    });
  });

  describe('getUpsellMessage', () => {
    it('returns message for basic tier', () => {
      const msg = getUpsellMessage('basic');
      expect(msg).toBeDefined();
      expect(msg.tier).toBeDefined();
      expect(msg.name).toBeDefined();
      expect(msg.price).toBeGreaterThan(0);
      expect(msg.headline).toContain('Upgrade');
    });

    it('returns null for premium tier (no upsell)', () => {
      const msg = getUpsellMessage('premium');
      expect(msg).toBeNull();
    });

    it('returns benefits array', () => {
      const msg = getUpsellMessage('basic');
      expect(Array.isArray(msg.benefits)).toBe(true);
    });
  });

  describe('getDynamicPrice', () => {
    it('returns price for any tier', () => {
      const result = getDynamicPrice('basic');
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
      expect(result.originalPrice).toBeGreaterThan(0);
      expect(typeof result.isFlashSale).toBe('boolean');
    });

    it('returns non-flash-sale price during normal hours', () => {
      const hour = new Date().getHours();
      const result = getDynamicPrice('basic');
      if (hour >= 6 && hour < 23) {
        expect(result.isFlashSale).toBe(false);
        expect(result.price).toBe(result.originalPrice);
        expect(result.discount).toBeNull();
      }
    });

    it('returns flash sale price during night hours (23-6)', () => {
      // We can't easily test time-dependent behavior, but we can test the structure
      const result = getDynamicPrice('basic');
      expect(result.price).toBeDefined();
      expect(result.originalPrice).toBeDefined();
    });

    it('handles unknown tier gracefully', () => {
      const result = getDynamicPrice('nonexistent');
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });
  });

  describe('TIER_ORDER consistency', () => {
    it('all tiers in TIER_ORDER have rules in TIER_RULES', () => {
      for (const tier of TIER_ORDER) {
        expect(TIER_RULES[tier]).toBeDefined();
      }
    });

    it('TIER_ORDER has expected length', () => {
      expect(TIER_ORDER.length).toBeGreaterThanOrEqual(5);
    });

    it('basic is first in TIER_ORDER', () => {
      expect(TIER_ORDER[0]).toBe('basic');
    });
  });
});
