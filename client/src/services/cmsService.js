import api from "@/services/api";

const cmsCache = new Map();
const inflight = new Map();

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export async function fetchCmsPage(slug, options = {}) {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    throw new Error("CMS slug is required");
  }

  const { force = false, signal } = options;
  if (!force && cmsCache.has(normalized)) {
    return cmsCache.get(normalized);
  }

  if (inflight.has(normalized)) {
    return inflight.get(normalized);
  }

  const request = api
    .get(`/cms/pages/${encodeURIComponent(normalized)}`, signal ? { signal } : undefined)
    .then((response) => response?.data ?? response ?? {})
    .then((payload) => payload?.content ?? payload)
    .then((content) => {
      cmsCache.set(normalized, content || null);
      inflight.delete(normalized);
      return content || null;
    })
    .catch((error) => {
      inflight.delete(normalized);
      throw error;
    });

  inflight.set(normalized, request);
  return request;
}

export function clearCmsCache(slug) {
  if (!slug) {
    cmsCache.clear();
    inflight.clear();
    return;
  }
  const normalized = normalizeSlug(slug);
  if (!normalized) return;
  cmsCache.delete(normalized);
  inflight.delete(normalized);
}

export default {
  fetchCmsPage,
  clearCmsCache,
};
