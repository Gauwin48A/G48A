/**
 * Rate Limiter
 * ──────────────
 * Client-side rate limit management for API calls.
 * Tracks per-endpoint cooldowns and provides automatic retry with backoff.
 */

import { getApiRootUrl } from "@/lib/networkConfig";

// ── Constants ─────────────────────────────────────────────────────────────
export const RATE_LIMIT_RETRY_DEFAULT_MS = 1500;
export const RATE_LIMIT_RETRY_MAX_MS = 5000;
export const RATE_LIMIT_COOLDOWN_MAX_MS = 5 * 60 * 1000;
export const RATE_LIMIT_JITTER_MS = 300;

// ── Module state ──────────────────────────────────────────────────────────
const rateLimitCooldowns = new Map();
const rateLimitCooldownWaiters = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse a Retry-After header value (seconds or HTTP-date) and return
 * milliseconds to wait.
 */
export function resolveRetryAfterMs(headerValue, fallbackMs = RATE_LIMIT_RETRY_DEFAULT_MS) {
  if (!headerValue) return fallbackMs;
  const trimmed = String(headerValue).trim();
  if (!trimmed) return fallbackMs;
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds)) {
    return Math.max(1000, seconds * 1000);
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : fallbackMs;
  }
  return fallbackMs;
}

/**
 * Build a unique key for a request config to track per-endpoint rate limits.
 */
export function buildRateLimitKey(config) {
  const method = String(config?.method || "get").toLowerCase();
  const base = String(config?.baseURL || getApiRootUrl()).trim();
  const url = String(config?.url || "").trim();
  return `${method}:${base}:${url}`;
}

/**
 * Check if a rate-limit cooldown is active for this request.
 * If so, wait for it to expire (with jitter) before proceeding.
 * Called from the request interceptor for GET requests.
 */
export async function waitForRateLimitCooldown(config) {
  const rateLimitKey = buildRateLimitKey(config);
  const now = Date.now();
  const cooldownUntil = rateLimitCooldowns.get(rateLimitKey) || 0;
  if (cooldownUntil > now) {
    const waitMs = cooldownUntil - now;
    const existingWaiter = rateLimitCooldownWaiters.get(rateLimitKey);
    if (existingWaiter && existingWaiter.until === cooldownUntil) {
      await existingWaiter.promise;
    } else {
      const jitter = Math.floor(Math.random() * RATE_LIMIT_JITTER_MS);
      const promise = sleep(waitMs + jitter);
      rateLimitCooldownWaiters.set(rateLimitKey, { until: cooldownUntil, promise });
      await promise;
      rateLimitCooldownWaiters.delete(rateLimitKey);
    }
  }
}

/**
 * Record a rate-limit cooldown for this request (from a 429 response).
 * Returns a cooldown duration in ms for the calling response interceptor.
 */
export function recordRateLimitCooldown(originalRequest, retryAfterMs) {
  const cooldownMs = Math.min(retryAfterMs, RATE_LIMIT_COOLDOWN_MAX_MS);
  const method = String(originalRequest.method || "get").toLowerCase();
  if (method === "get") {
    const key = buildRateLimitKey(originalRequest);
    rateLimitCooldowns.set(key, Date.now() + cooldownMs);
  }
  return cooldownMs;
}
