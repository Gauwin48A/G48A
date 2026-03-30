const VALID_APP_KEYS = new Set(["electronics", "fashion", "vehicles", "others"]);

const CATEGORY_ID_PATHS = [
  "category_id",
  "categoryId",
  "category.category_id",
  "category.id",
  "post.category_id",
  "post.categoryId",
  "post.category.category_id",
  "post.category.id",
];

const CATEGORY_NAME_PATHS = [
  "category_name",
  "categoryName",
  "category_title",
  "categoryTitle",
  "category",
  "category.name",
  "category.title",
  "category.label",
  "post.category_name",
  "post.categoryName",
  "post.category_title",
  "post.categoryTitle",
  "post.category",
  "post.category.name",
  "post.category.title",
  "post.category.label",
];

const CATEGORY_GROUP_PATHS = [
  "category_group",
  "categoryGroup",
  "category.category_group",
  "category.categoryGroup",
  "post.category_group",
  "post.categoryGroup",
  "post.category.category_group",
  "post.category.categoryGroup",
];

function readPathValue(source, path) {
  if (!source || typeof source !== "object" || !path) return null;
  const segments = String(path).split(".");
  let current = source;
  for (const segment of segments) {
    if (current == null) return null;
    current = current[segment];
  }
  return current ?? null;
}

export function normalizeCategoryText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizeCategoryToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeAppGroup(value) {
  const normalized = normalizeCategoryToken(value);
  if (!normalized) return "";
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) {
    return "electronics";
  }
  if (normalized.startsWith("fashion")) return "fashion";
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) {
    return "vehicles";
  }
  if (normalized === "other") return "others";
  return VALID_APP_KEYS.has(normalized) ? normalized : "";
}

function inferAppGroupFromName(name) {
  const normalized = normalizeCategoryToken(name);
  if (!normalized) return "";
  if (normalized.includes("electronics") || normalized === "mobile" || normalized === "mobiles") {
    return "electronics";
  }
  if (normalized.includes("fashion")) return "fashion";
  if (normalized.includes("vehicle")) return "vehicles";
  return "others";
}

function extractFirstText(source, paths) {
  for (const path of paths) {
    const value = readPathValue(source, path);
    if (value == null) continue;
    if (typeof value === "object") {
      const nested =
        value?.name || value?.title || value?.label || value?.category_name || "";
      const normalizedNested = normalizeCategoryToken(nested);
      if (normalizedNested) return normalizedNested;
      continue;
    }
    const normalized = normalizeCategoryToken(value);
    if (normalized) return normalized;
  }
  return "";
}

function extractFirstId(source, paths) {
  for (const path of paths) {
    const value = readPathValue(source, path);
    if (value == null || value === "") continue;
    if (typeof value === "object") continue;
    return String(value);
  }
  return "";
}

export function buildActiveAppMatcher(activeApp, categories = []) {
  const appKey = normalizeAppGroup(activeApp);
  if (!appKey) return null;

  const categoryIds = new Set();
  const categoryNames = new Set();
  const source = Array.isArray(categories) ? categories : [];

  source.forEach((category) => {
    let group = normalizeAppGroup(
      category?.category_group || category?.categoryGroup || category?.group,
    );
    if (!group) {
      const nameSource =
        category?.name ||
        category?.title ||
        category?.label ||
        category?.category_name ||
        "";
      group = inferAppGroupFromName(nameSource);
    }
    if (group !== appKey) return;
    const categoryId = category?.category_id || category?.id;
    if (categoryId != null && categoryId !== "") {
      categoryIds.add(String(categoryId));
    }
    const categoryName = normalizeCategoryToken(
      category?.name || category?.title || category?.label || category?.category_name,
    );
    if (categoryName) {
      categoryNames.add(categoryName);
    }
  });

  return {
    activeApp: appKey,
    label: appKey.charAt(0).toUpperCase() + appKey.slice(1),
    categoryIds,
    categoryNames,
  };
}

export function matchesCategoryModeItem(
  item,
  { activeCategory = null, activeCategoryId = null, activeAppMatcher = null } = {},
) {
  const wantedCategoryId =
    activeCategoryId != null && activeCategoryId !== ""
      ? String(activeCategoryId)
      : "";
  const wantedCategoryName = normalizeCategoryToken(activeCategory?.name);
  const itemCategoryId = extractFirstId(item, CATEGORY_ID_PATHS);
  const itemCategoryName = extractFirstText(item, CATEGORY_NAME_PATHS);

  if (wantedCategoryId || wantedCategoryName) {
    if (wantedCategoryId && itemCategoryId) {
      return wantedCategoryId === itemCategoryId;
    }
    if (wantedCategoryName) {
      return itemCategoryName === wantedCategoryName;
    }
    return true;
  }

  if (activeAppMatcher?.activeApp) {
    const itemGroup = normalizeAppGroup(extractFirstText(item, CATEGORY_GROUP_PATHS));
    if (itemGroup) {
      return itemGroup === activeAppMatcher.activeApp;
    }
    const hasCategoryMap =
      (activeAppMatcher.categoryIds?.size || 0) > 0 ||
      (activeAppMatcher.categoryNames?.size || 0) > 0;
    if (!hasCategoryMap) {
      return true;
    }
    if (itemCategoryId && activeAppMatcher.categoryIds.has(itemCategoryId)) {
      return true;
    }
    if (itemCategoryName && activeAppMatcher.categoryNames.has(itemCategoryName)) {
      return true;
    }
    return false;
  }

  return true;
}
