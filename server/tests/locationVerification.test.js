const crypto = require("crypto");
const {
  verifySignature,
  CONFIG,
} = require("../src/services/locationVerificationService");

describe("Location verification service", () => {
  const TEST_SECRET = "test-hmac-secret-key-for-unit-tests";

  const stableStringify = (value) => {
    if (value === null || value === undefined) return "null";
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    const entries = keys
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  };

  const computeTestSignature = (payload, secret) => {
    const { signature, ...rest } = payload;
    const canonical = stableStringify(rest);
    return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
  };

  describe("verifySignature", () => {
    it("returns true when no secret is configured", () => {
      expect(verifySignature({}, "any-sig", "")).toBe(true);
      expect(verifySignature({}, null, "")).toBe(true);
    });

    it("returns false when secret is set but no signature provided", () => {
      expect(verifySignature({}, null, TEST_SECRET)).toBe(false);
      expect(verifySignature({}, "", TEST_SECRET)).toBe(false);
    });

    it("verifies a valid signature with nonce and timestamp", () => {
      const payload = {
        latitude: 17.385044,
        longitude: 78.486671,
        accuracy: 10,
        _nonce: crypto.randomBytes(16).toString("hex"),
        _signed_at: Date.now(),
      };
      const sig = computeTestSignature(payload, TEST_SECRET);
      expect(verifySignature(payload, sig, TEST_SECRET)).toBe(true);
    });

    it("rejects a tampered payload", () => {
      const payload = {
        latitude: 17.385044,
        longitude: 78.486671,
        accuracy: 10,
        _nonce: crypto.randomBytes(16).toString("hex"),
        _signed_at: Date.now(),
      };
      const sig = computeTestSignature(payload, TEST_SECRET);
      payload.latitude = 18.0;
      expect(verifySignature(payload, sig, TEST_SECRET)).toBe(false);
    });

    it("rejects expired signatures (timestamp too old)", () => {
      const payload = {
        latitude: 17.385044,
        longitude: 78.486671,
        accuracy: 10,
        _nonce: crypto.randomBytes(16).toString("hex"),
        _signed_at: Date.now() - 120000,
      };
      const sig = computeTestSignature(payload, TEST_SECRET);
      expect(verifySignature(payload, sig, TEST_SECRET)).toBe(false);
    });

    it("rejects replayed nonces", () => {
      const nonce = crypto.randomBytes(16).toString("hex");
      const payload1 = {
        latitude: 17.385044,
        longitude: 78.486671,
        accuracy: 10,
        _nonce: nonce,
        _signed_at: Date.now(),
      };
      const sig = computeTestSignature(payload1, TEST_SECRET);
      // First use should succeed
      expect(verifySignature(payload1, sig, TEST_SECRET)).toBe(true);
      // Replay should fail
      const payload2 = { ...payload1 };
      const sig2 = computeTestSignature(payload2, TEST_SECRET);
      expect(verifySignature(payload2, sig2, TEST_SECRET)).toBe(false);
    });
  });

  describe("CONFIG defaults", () => {
    it("has sensible accuracy and radius defaults", () => {
      expect(CONFIG.maxAccuracyMetres).toBeLessThanOrEqual(150);
      expect(CONFIG.targetRadiusMetres).toBeLessThanOrEqual(50);
      expect(CONFIG.allowThreshold).toBeGreaterThan(50);
    });

    it("has fraud thresholds in descending order", () => {
      expect(CONFIG.allowThreshold).toBeGreaterThan(CONFIG.reviewThreshold);
      expect(CONFIG.reviewThreshold).toBeGreaterThan(CONFIG.blockThreshold);
    });
  });
});
