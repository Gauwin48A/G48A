/**
 * Shared utility functions used by AllPosts, ForYou, and other post list pages.
 * Extracted from AllPosts.jsx to reduce bundle size and enable reuse.
 */

export const PLACEHOLDER_IMAGE = "/placeholder.svg";

export const normalizeName = (v) => String(v || "").trim().toLowerCase();

export const normalizeSearchText = (v) => String(v ?? "").trim().toLowerCase();

export const getNestedValue = (obj, path) => {
  if (!obj || typeof obj !== "object" || !path) return null;
  const parts = String(path).split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i += 1) {
    if (current == null) return null;
    current = current[parts[i]];
  }
  return current;
};

export const pushSearchValue = (arr, value) => {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => pushSearchValue(arr, item));
    return;
  }
  if (typeof value === "object") {
    if (typeof value.name === "string") arr.push(value.name);
    if (typeof value.label === "string") arr.push(value.label);
    if (typeof value.title === "string") arr.push(value.title);
    return;
  }
  const str = String(value).trim();
  str && arr.push(str);
};

export const ALL_POSTS_TRANSLATE_PATHS = [
  "title", "description", "category", "category_name", "location",
  "city", "area", "state", "summary", "subtitle", "brand", "model",
  "user.name", "user.location",
];

export const ALL_POSTS_SEARCH_PATHS = Array.from(
  new Set([
    ...ALL_POSTS_TRANSLATE_PATHS,
    "brand_name", "brandName", "model_name", "modelName",
    "categoryName", "subcategory", "subcategory_name", "subcategoryName",
    "user_name", "username", "user.username", "user.display_name",
    "user.full_name", "user.fullName", "seller_name", "sellerName",
    "tags", "keywords",
  ]),
);

export const buildSearchText = (post, extraFields = []) => {
  if (!post || typeof post !== "object") return "";
  const values = [];
  ALL_POSTS_SEARCH_PATHS.forEach((path) => {
    pushSearchValue(values, getNestedValue(post, path));
  });
  extraFields.forEach((field) => pushSearchValue(values, field));
  return normalizeSearchText(values.join(" "));
};

export const matchesSearchQuery = (post, query, extraFields = []) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const searchText = buildSearchText(post, extraFields);
  if (!searchText) return false;
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => searchText.includes(term));
};

export const getPostId = (post) => {
  if (post == null) return "";
  if (Array.isArray(post)) return "";
  if (typeof post === "object") {
    const candidate = post.post_id ?? post.postId ?? post.id;
    if (candidate == null) return "";
    if (typeof candidate === "object") return "";
    return String(candidate).trim();
  }
  const str = String(post).trim();
  return str.length ? str : "";
};

export const parsePrice = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

export const resolvePostPriceValue = (post) => {
  if (!post || typeof post !== "object") return parsePrice(post);
  const candidates = [
    post.price, post.price_value, post.priceValue, post.price_inr, post.priceInr,
    post.listing_price, post.listingPrice, post.selling_price, post.sellingPrice,
    post.sale_price, post.salePrice, post.expected_price, post.expectedPrice,
    post.asking_price, post.askingPrice, post.amount, post.budget,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const value = parsePrice(candidates[i]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
};

export const normalizeConditionValue = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");

export const matchesConditionFilter = (postCondition, filterCondition) => {
  const normalizedFilter = normalizeConditionValue(filterCondition);
  if (!normalizedFilter) return true;
  const normalizedPost = normalizeConditionValue(postCondition);
  if (!normalizedPost) return false;
  const newSet = new Set(["new", "brand new", "unused", "sealed"]);
  if (normalizedFilter === "new") return newSet.has(normalizedPost) || normalizedPost.startsWith("new");
  if (normalizedFilter === "used") return !newSet.has(normalizedPost);
  return normalizedPost.includes(normalizedFilter);
};

export const resolvePostDateValue = (post) => {
  if (!post || typeof post !== "object") {
    const d = new Date(post);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const candidates = [
    post.created_at, post.createdAt, post.posted_at, post.postedAt,
    post.updated_at, post.updatedAt, post.date, post.posted_date,
    post.postedDate, post.listing_date, post.listingDate, post.timestamp,
    post.time, post.created, post.created_on, post.createdOn,
    post.published_at, post.publishedAt,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const val = candidates[i];
    if (!val) continue;
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return null;
};

export const parseFilterDateValue = (value, inclusiveEnd = false) => {
  if (!value) return null;
  const str = String(value || "").trim();
  if (!str) return null;
  const dateStr = inclusiveEnd ? toInclusiveEndDateValue(str) : str;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
};

export const isDateOnlyValue = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

export const toInclusiveEndDateValue = (value) =>
  isDateOnlyValue(value) ? `${value}T23:59:59.999` : value;

export const normalizeLatestWindow = (value) => {
  const num = Number.parseInt(String(value || ""), 10);
  return num === 5 || num === 10 || num === 50 ? num : null;
};

const relativeTimeFormatters = new Map();

export const getRelativeTimeFormatter = (locale) => {
  const lang = String(locale || "en").trim().toLowerCase() || "en";
  if (relativeTimeFormatters.has(lang)) return relativeTimeFormatters.get(lang);
  if (typeof Intl === "undefined" || typeof Intl.RelativeTimeFormat === "undefined") {
    relativeTimeFormatters.set(lang, null);
    return null;
  }
  try {
    const formatter = new Intl.RelativeTimeFormat(lang, { numeric: "always" });
    relativeTimeFormatters.set(lang, formatter);
    return formatter;
  } catch {
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });
    relativeTimeFormatters.set(lang, formatter);
    return formatter;
  }
};

export const formatRelativeTime = (dateStr, locale = "en") => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  const formatter = getRelativeTimeFormatter(locale);
  if (formatter) {
    if (mins < 60) return formatter.format(-mins, "minute");
    const hours = Math.floor(mins / 60);
    return hours < 24
      ? formatter.format(-hours, "hour")
      : formatter.format(-Math.floor(hours / 24), "day");
  }
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};

export const setNestedValue = (obj, path, value) => {
  if (!obj || typeof obj !== "object" || !path) return;
  const parts = String(path).split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
};

export const restoreTranslatedPost = (post) => {
  if (!post || typeof post !== "object") return post;
  const originals = post._originalTranslations;
  if (!originals || typeof originals !== "object") return post;
  const restored = { ...post };
  Object.entries(originals).forEach(([path, value]) => {
    setNestedValue(restored, path, value);
  });
  if (typeof post._originalTitle === "string") restored.title = post._originalTitle;
  if (typeof post._originalDescription === "string") restored.description = post._originalDescription;
  return restored;
};

export const mergePostArrays = (existing, incoming) => {
  const map = new Map();
  existing.forEach((post) => {
    const id = getPostId(post);
    if (id) map.set(String(id), post);
  });
  incoming.forEach((post) => {
    const id = getPostId(post);
    if (id) map.set(String(id), post);
  });
  return Array.from(map.values());
};

export const collectPostImageUrls = (post, placeholder = PLACEHOLDER_IMAGE) => {
  if (!post) return [placeholder];
  const urls = [];
  const pushList = (value) => {
    if (!value) return;
    const normalized = Array.isArray(value) ? value : [value];
    normalized.forEach((item) => {
      if (item && typeof item === "string" && item.trim()) urls.push(item.trim());
    });
  };
  const pushFrom = (obj) => {
    if (!obj) return;
    pushList(obj.images);
    pushList(obj.image_urls);
    pushList(obj.imageUrls);
    pushList(obj.image_url);
    pushList(obj.imageUrl);
    pushList(obj.image);
    pushList(obj.photo);
    pushList(obj.photos);
    pushList(obj.gallery);
    pushList(obj.media);
    pushList(obj.media_urls);
    pushList(obj.mediaUrls);
    pushList(obj.cover_image);
    pushList(obj.coverImage);
    pushList(obj.primary_image);
    pushList(obj.primaryImage);
    pushList(obj.thumbnail);
  };
  pushFrom(post);
  pushFrom(post.post);
  pushFrom(post.listing);
  pushFrom(post.item);
  const unique = Array.from(new Set(urls.filter((u) => u && u !== placeholder)));
  return unique.length ? unique : [placeholder];
};

export const getPrimaryImage = (post, placeholder = PLACEHOLDER_IMAGE) => {
  const list = collectPostImageUrls(post, placeholder);
  return list[0] || placeholder;
};

export const DEFAULT_FILTERS = {
  search: "", category: "All", subcategory: "All", categoryGroup: "",
  sortBy: "", latestWindow: "", location: "", minPrice: "", maxPrice: "",
  priceRange: "", startDate: "", endDate: "", condition: "", verifiedOnly: false,
};
