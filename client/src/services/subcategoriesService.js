import { fetchCategoryHierarchy } from "@/services/categoriesService";

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function sortSubcategories(list) {
  return [...(Array.isArray(list) ? list : [])].sort((left, right) => {
    const displayOrderDiff =
      Number(left?.display_order ?? 0) - Number(right?.display_order ?? 0);
    if (displayOrderDiff !== 0) return displayOrderDiff;
    const popularityDiff =
      Number(right?.popularity_score ?? right?.post_count ?? 0) -
      Number(left?.popularity_score ?? left?.post_count ?? 0);
    if (popularityDiff !== 0) return popularityDiff;
    return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
      sensitivity: "base",
    });
  });
}

function normalizeSubcategory(subcategory, category) {
  return {
    ...subcategory,
    category_id:
      subcategory?.category_id ||
      category?.category_id ||
      category?.id ||
      null,
    category_name:
      subcategory?.category_name ||
      category?.name ||
      "",
  };
}

async function fetchHierarchy(force = false) {
  const categories = await fetchCategoryHierarchy({ force });
  return Array.isArray(categories) ? categories : [];
}

/**
 * Fetch subcategories for a specific category.
 * @param {number|string} categoryId
 * @param {{ force?: boolean }} options
 */
export async function fetchSubcategories(categoryId, { force = false } = {}) {
  const categories = await fetchHierarchy(force);
  const normalizedCategoryId = String(categoryId || "").trim();
  const match = categories.find((category) => {
    const currentId = String(category?.category_id || category?.id || "").trim();
    if (normalizedCategoryId && currentId === normalizedCategoryId) {
      return true;
    }
    return normalizeValue(category?.name) === normalizeValue(categoryId);
  });

  const subcategories = Array.isArray(match?.subcategories)
    ? match.subcategories.map((subcategory) =>
        normalizeSubcategory(subcategory, match)
      )
    : [];

  return sortSubcategories(subcategories);
}

/**
 * Fetch all subcategories (no category filter).
 * @param {{ force?: boolean }} options
 */
export async function fetchAllSubcategories({ force = false } = {}) {
  const categories = await fetchHierarchy(force);
  return sortSubcategories(
    categories.flatMap((category) =>
      (Array.isArray(category?.subcategories) ? category.subcategories : []).map(
        (subcategory) => normalizeSubcategory(subcategory, category)
      )
    )
  );
}

/**
 * Fetch subcategories grouped by parent category.
 * @param {{ force?: boolean }} options
 */
export async function fetchSubcategoriesGrouped({ force = false } = {}) {
  const categories = await fetchHierarchy(force);
  return categories
    .map((category) => ({
      category_id: category?.category_id || category?.id || null,
      category_name: category?.name || "",
      subcategories: sortSubcategories(
        (Array.isArray(category?.subcategories) ? category.subcategories : []).map(
          (subcategory) => normalizeSubcategory(subcategory, category)
        )
      ),
    }))
    .filter((group) => group.subcategories.length > 0);
}

/**
 * Get cached subcategories for a given category (sync, may return empty).
 */
export function getCachedSubcategories(_categoryId) {
  return [];
}

export function clearSubcategoriesCache() {
  // Subcategory state is derived from the shared category hierarchy cache.
}

export default {
  fetchSubcategories,
  fetchAllSubcategories,
  fetchSubcategoriesGrouped,
  getCachedSubcategories,
  clearSubcategoriesCache,
};
