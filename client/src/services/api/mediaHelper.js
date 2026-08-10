/**
 * Media Helper
 * ──────────────
 * Normalizes media URLs in API responses — resolves relative image paths,
 * handles media lists (normalizeMediaList), and walks deeply nested
 * response objects.
 */

import { normalizeMediaList, resolveMediaUrl } from "@/lib/mediaUrl";

// ── Constants ─────────────────────────────────────────────────────────────
export const MEDIA_URL_KEYS = new Set([
  "image",
  "image_url",
  "imageUrl",
  "thumbnail",
  "thumbnail_url",
  "thumbnailUrl",
  "avatar",
  "avatar_url",
  "avatarUrl",
  "profile_pic",
  "profilePic",
  "photo",
  "photo_url",
  "photoUrl",
  "logo_url",
  "logoUrl",
]);

export const MEDIA_LIST_KEYS = new Set(["images", "image_urls", "imageUrls"]);

/**
 * Walk a deeply nested API response payload, normalizing every media URL
 * and media list it encounters. Uses a WeakSet to avoid circular references.
 *
 * @param {*} payload - The raw API response data
 * @returns {*} The same shape with all media URLs resolved
 */
export function normalizeApiMediaPayload(payload) {
  const seen = new WeakSet();

  const walk = (value, parentKey = "") => {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
      if (MEDIA_LIST_KEYS.has(parentKey)) {
        return normalizeMediaList(value);
      }
      return value.map((entry) => walk(entry));
    }

    if (typeof value !== "object") {
      if (typeof value === "string" && MEDIA_URL_KEYS.has(parentKey)) {
        return resolveMediaUrl(value, value);
      }
      return value;
    }

    if (seen.has(value)) return value;
    seen.add(value);

    const normalized = {};
    for (const [key, entry] of Object.entries(value)) {
      if (MEDIA_LIST_KEYS.has(key)) {
        normalized[key] = normalizeMediaList(entry);
        continue;
      }
      if (typeof entry === "string" && MEDIA_URL_KEYS.has(key)) {
        normalized[key] = resolveMediaUrl(entry, entry);
        continue;
      }
      normalized[key] = walk(entry, key);
    }
    return normalized;
  };

  return walk(payload);
}
