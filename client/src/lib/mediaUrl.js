import { getApiOriginBase } from "@/lib/networkConfig";

export const DEFAULT_MEDIA_PLACEHOLDER = "/placeholder.svg";

/**
 * CDN URL prefix for user-uploaded media.
 * Set VITE_CDN_BASE_URL env variable (e.g. "https://cdn.mhub.app") to enable CDN.
 */
const CDN_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_CDN_BASE_URL || "").replace(/\/+$/, "");

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const DATA_URL_PATTERN = /^data:/i;
const FILE_URL_PREFIX_PATTERN = /^file:\/+/i;
const UPLOAD_SEGMENT_PATTERN = /(?:^|\/)uploads\/(.+)$/i;
const LOCALHOST_HOSTNAME_PATTERN = /^(localhost|127\.0\.0\.1|::1)$/i;

/**
 * Allowed external media domains. Absolute URLs from the API are only
 * passed through if their hostname matches one of these patterns.
 * This prevents attacker-controlled image URLs from harvesting user IPs.
 */
const ALLOWED_MEDIA_HOSTS = [
  /^(.*\.)?cloudinary\.com$/i,
  /^(.*\.)?mhub\.app$/i,
  /^(.*\.)?mhub\.in$/i,
  /^(.*\.)?imgur\.com$/i,
  /^(.*\.)?googleusercontent\.com$/i,
  /^(.*\.)?unsplash\.com$/i,
  /^(.*\.)?placehold\.co$/i,
  /^(.*\.)?picsum\.photos$/i,
  /^via\.placeholder\.com$/i,
  /^dummyimage\.com$/i,
  LOCALHOST_HOSTNAME_PATTERN,
];

function isAllowedMediaHost(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_MEDIA_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

const normalizeSlashes = (value) => String(value || "").replace(/\\/g, "/");
const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

function toUploadsWebPath(rawValue) {
  const value = normalizeSlashes(String(rawValue || "").trim());
  if (!value) return "";

  const withoutFilePrefix = value.replace(FILE_URL_PREFIX_PATTERN, "/");

  if (withoutFilePrefix.startsWith("/uploads/")) return withoutFilePrefix;
  if (withoutFilePrefix.startsWith("uploads/")) return `/${withoutFilePrefix}`;

  const uploadsMatch = withoutFilePrefix.match(UPLOAD_SEGMENT_PATTERN);
  if (uploadsMatch?.[1]) {
    return `/uploads/${uploadsMatch[1].replace(/^\/+/, "")}`;
  }

  if (
    !withoutFilePrefix.includes("/") &&
    /^[^/]+\.[a-z0-9]{2,8}$/i.test(withoutFilePrefix)
  ) {
    return `/uploads/${withoutFilePrefix}`;
  }

  return "";
}

function withApiOrigin(pathname) {
  if (!pathname) return DEFAULT_MEDIA_PLACEHOLDER;

  // If CDN is configured, use CDN for /uploads/ paths (#86)
  if (CDN_BASE_URL && pathname.startsWith("/uploads/")) {
    return `${CDN_BASE_URL}${pathname}`;
  }

  // In local dev, prefer Vite proxy (/uploads) to avoid cross-origin media blocks.
  if (
    typeof window !== "undefined" &&
    pathname.startsWith("/uploads/") &&
    LOCALHOST_HOSTNAME_PATTERN.test(String(window.location?.hostname || ""))
  ) {
    return pathname;
  }

  const base = trimTrailingSlash(getApiOriginBase());
  if (!base) return pathname;

  return `${base}${pathname}`;
}

export function resolveMediaUrl(rawValue, fallback = DEFAULT_MEDIA_PLACEHOLDER) {
  const value = String(rawValue || "").trim();
  if (!value) return fallback;

  if (DATA_URL_PATTERN.test(value)) {
    return value;
  }
  if (ABSOLUTE_URL_PATTERN.test(value)) {
    return isAllowedMediaHost(value) ? value : fallback;
  }

  const uploadsPath = toUploadsWebPath(value);
  if (uploadsPath) {
    return withApiOrigin(uploadsPath);
  }

  if (value.startsWith("/")) {
    return value;
  }

  return fallback;
}

export function normalizeMediaList(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((entry) => resolveMediaUrl(entry)).filter(Boolean);
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => resolveMediaUrl(entry)).filter(Boolean);
      }
    } catch {
      return [resolveMediaUrl(rawValue)].filter(Boolean);
    }

    return [resolveMediaUrl(rawValue)].filter(Boolean);
  }

  return [];
}
