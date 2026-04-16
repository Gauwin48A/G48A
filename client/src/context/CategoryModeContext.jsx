import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { fetchCategoriesCached } from "@/services/categoriesService";
import { fetchSubcategories } from "@/services/subcategoriesService";

const CategoryModeContext = createContext(null);
const STORAGE_KEY = "mhub:category-mode";
const SUB_STORAGE_KEY = "mhub:subcategory-mode";
const APP_STORAGE_KEY = "mhub:active-app";

const VALID_APPS = new Set(["electronics", "fashion", "vehicles", "others"]);

const APP_THEMES = {
  electronics: {
    label: "Electronics",
    tagline: "Phones, laptops & gadgets",
    gradient: "from-blue-500 via-indigo-600 to-violet-700",
    gradientLight: "from-blue-50 to-indigo-50",
    accent: "bg-blue-600",
    accentLight: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
    ring: "ring-blue-500",
    emoji: "📱",
  },
  fashion: {
    label: "Fashion",
    tagline: "Clothing, shoes & accessories",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    gradientLight: "from-pink-50 to-rose-50",
    accent: "bg-pink-600",
    accentLight: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-300",
    ring: "ring-pink-500",
    emoji: "👗",
  },
  vehicles: {
    label: "Vehicles",
    tagline: "Cars, bikes & spare parts",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    gradientLight: "from-emerald-50 to-teal-50",
    accent: "bg-emerald-600",
    accentLight: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
    ring: "ring-emerald-500",
    emoji: "🚗",
  },
  others: {
    label: "Others",
    tagline: "Home, services, jobs & more",
    gradient: "from-purple-500 via-violet-600 to-indigo-700",
    gradientLight: "from-purple-50 to-violet-50",
    accent: "bg-purple-600",
    accentLight: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-300",
    ring: "ring-purple-500",
    emoji: "✨",
  },
};

const CATEGORY_THEMES = {
  electronics: {
    label: "Electronics",
    accent: "from-blue-600 via-indigo-600 to-sky-600",
    soft: "bg-blue-50 text-blue-900",
  },
  vehicles: {
    label: "Vehicles",
    accent: "from-emerald-600 via-teal-600 to-cyan-600",
    soft: "bg-emerald-50 text-emerald-900",
  },
  "real estate": {
    label: "Real Estate",
    accent: "from-amber-500 via-orange-500 to-rose-500",
    soft: "bg-amber-50 text-amber-900",
  },
  jobs: {
    label: "Jobs",
    accent: "from-violet-600 via-purple-600 to-fuchsia-600",
    soft: "bg-violet-50 text-violet-900",
  },
  services: {
    label: "Services",
    accent: "from-slate-700 via-slate-800 to-gray-900",
    soft: "bg-slate-100 text-slate-900",
  },
  fashion: {
    label: "Fashion",
    accent: "from-pink-500 via-rose-500 to-red-500",
    soft: "bg-pink-50 text-pink-900",
  },
  home: {
    label: "Home",
    accent: "from-yellow-500 via-amber-500 to-orange-500",
    soft: "bg-yellow-50 text-yellow-900",
  },
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAppKey(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return "";
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) {
    return "electronics";
  }
  if (normalized.startsWith("fashion")) return "fashion";
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) {
    return "vehicles";
  }
  if (normalized === "other") return "others";
  return VALID_APPS.has(normalized) ? normalized : "";
}

function getThemeForCategory(name) {
  if (!name) {
    return {
      label: "All Categories",
      accent: "from-slate-600 via-slate-700 to-slate-800",
      soft: "bg-slate-100 text-slate-900",
    };
  }
  const key = normalizeKey(name);
  return CATEGORY_THEMES[key] || {
    label: name,
    accent: "from-blue-600 via-indigo-600 to-sky-600",
    soft: "bg-blue-50 text-blue-900",
  };
}

function readStoredApp() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;
    const val = String(raw).trim().toLowerCase();
    return VALID_APPS.has(val) ? val : null;
  } catch {
    return null;
  }
}

function persistApp(appKey) {
  if (typeof window === "undefined") return;
  if (!appKey) {
    window.localStorage.removeItem(APP_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(APP_STORAGE_KEY, appKey);
}

function readStoredCategory() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const name = String(parsed.name || "").trim();
    if (!name) return null;
    return { id: parsed.id || null, name };
  } catch {
    return null;
  }
}

function readStoredSubcategory() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SUB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const name = String(parsed.name || "").trim();
    if (!name) return null;
    return { id: parsed.id || null, name, category_id: parsed.category_id || null };
  } catch {
    return null;
  }
}

function persistCategory(category) {
  if (typeof window === "undefined") return;
  if (!category) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(category));
}

function persistSubcategory(subcategory) {
  if (typeof window === "undefined") return;
  if (!subcategory) {
    window.localStorage.removeItem(SUB_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(subcategory));
}

export function CategoryModeProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(() => readStoredCategory());
  const [activeSubcategory, setActiveSubcategory] = useState(() => readStoredSubcategory());
  const [activeApp, setActiveAppState] = useState(() => readStoredApp());

  // Fetch categories on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchCategoriesCached({ includeSubcategories: true });
        if (!active) return;
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        if (!active) return;
        setCategories([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Fetch subcategories whenever activeCategory changes
  useEffect(() => {
    if (!activeCategory?.id && !activeCategory?.name) {
      setSubcategories([]);
      return;
    }
    let active = true;
    setSubcategoriesLoading(true);
    (async () => {
      try {
        const categoryEntry =
          categories.find(
            (c) =>
              String(c?.category_id || c?.id || "") ===
                String(activeCategory.id || "") ||
              normalizeKey(c?.name) === normalizeKey(activeCategory.name)
          ) || null;
        const catId = activeCategory.id || categoryEntry?.category_id || null;
        if (!catId) {
          setSubcategories([]);
          return;
        }
        if (Array.isArray(categoryEntry?.subcategories)) {
          setSubcategories(categoryEntry.subcategories);
          return;
        }
        const list = await fetchSubcategories(catId);
        if (!active) return;
        setSubcategories(Array.isArray(list) ? list : []);
      } catch {
        if (!active) return;
        setSubcategories([]);
      } finally {
        if (active) setSubcategoriesLoading(false);
      }
    })();
    return () => { active = false; };
  }, [activeCategory?.id, activeCategory?.name, categories]);

  // Clear subcategory if it doesn't belong to active category
  useEffect(() => {
    if (!activeSubcategory) return;
    if (!activeCategory) {
      setActiveSubcategory(null);
      persistSubcategory(null);
      return;
    }
    if (
      activeSubcategory.category_id &&
      activeCategory.id &&
      String(activeSubcategory.category_id) !== String(activeCategory.id)
    ) {
      setActiveSubcategory(null);
      persistSubcategory(null);
      return;
    }
    if (subcategoriesLoading) return;
    if (Array.isArray(subcategories) && subcategories.length > 0) {
      const normalizedActive = normalizeKey(activeSubcategory.name);
      const hasMatch = subcategories.some((sub) => {
        const subId = sub?.subcategory_id || sub?.id || null;
        if (activeSubcategory.id && subId) {
          return String(subId) === String(activeSubcategory.id);
        }
        return normalizeKey(sub?.name) === normalizedActive;
      });
      if (!hasMatch) {
        setActiveSubcategory(null);
        persistSubcategory(null);
      }
    }
  }, [activeCategory, activeSubcategory, subcategories, subcategoriesLoading]);

  const selectCategory = useCallback((category) => {
    if (!category) {
      setActiveCategory(null);
      persistCategory(null);
      setActiveSubcategory(null);
      persistSubcategory(null);
      return;
    }

    const name =
      typeof category === "string"
        ? category
        : category?.name || category?.title || category?.label || "";
    const id =
      typeof category === "object"
        ? category?.category_id || category?.id || null
        : null;
    const normalizedName = String(name || "").trim();
    if (!normalizedName) return;
    const next = { id, name: normalizedName };
    setActiveCategory(next);
    persistCategory(next);
    const matchedCategory = (Array.isArray(categories) ? categories : []).find((entry) => {
      const entryId = entry?.category_id || entry?.id || null;
      if (id && entryId) {
        return String(entryId) === String(id);
      }
      return normalizeKey(entry?.name) === normalizeKey(normalizedName);
    });
    const resolvedGroup = normalizeAppKey(
      category?.category_group ||
        category?.categoryGroup ||
        matchedCategory?.category_group ||
        matchedCategory?.categoryGroup,
    );
    if (resolvedGroup) {
      setActiveAppState(resolvedGroup);
      persistApp(resolvedGroup);
    }
    // Clear subcategory when switching categories
    setActiveSubcategory(null);
    persistSubcategory(null);
  }, [categories]);

  const selectSubcategory = useCallback((subcategory) => {
    if (!subcategory) {
      setActiveSubcategory(null);
      persistSubcategory(null);
      return;
    }
    const name =
      typeof subcategory === "string"
        ? subcategory
        : subcategory?.name || "";
    const id =
      typeof subcategory === "object"
        ? subcategory?.subcategory_id || subcategory?.id || null
        : null;
    const category_id =
      typeof subcategory === "object"
        ? subcategory?.category_id || activeCategory?.id || null
        : activeCategory?.id || null;
    const normalizedName = String(name || "").trim();
    if (!normalizedName) return;
    const next = { id, name: normalizedName, category_id };
    setActiveSubcategory(next);
    persistSubcategory(next);
  }, [activeCategory?.id]);

  const clearCategory = useCallback(() => {
    setActiveCategory(null);
    persistCategory(null);
    setActiveSubcategory(null);
    persistSubcategory(null);
    setSubcategories([]);
  }, []);

  const clearSubcategory = useCallback(() => {
    setActiveSubcategory(null);
    persistSubcategory(null);
  }, []);

  const setActiveApp = useCallback((appKey) => {
    const normalized = appKey ? String(appKey).trim().toLowerCase() : null;
    const valid = normalized && VALID_APPS.has(normalized) ? normalized : null;
    setActiveAppState(valid);
    persistApp(valid);
  }, []);

  const clearActiveApp = useCallback(() => {
    setActiveAppState(null);
    persistApp(null);
  }, []);

  const activeAppTheme = useMemo(
    () => (activeApp ? APP_THEMES[activeApp] : null),
    [activeApp]
  );

  // API params to inject into category-filtered requests
  const appCategoryParams = useMemo(
    () => (activeApp ? { category_group: activeApp } : {}),
    [activeApp]
  );

  const theme = useMemo(
    () => getThemeForCategory(activeCategory?.name),
    [activeCategory?.name],
  );

  const value = useMemo(
    () => ({
      categories,
      subcategories,
      subcategoriesLoading,
      loading,
      activeCategory,
      activeSubcategory,
      hasSelection: Boolean(activeCategory?.name || activeApp),
      hasSubcategorySelection: Boolean(activeSubcategory?.name),
      selectCategory,
      selectSubcategory,
      clearCategory,
      clearSubcategory,
      theme,
      // App-level (category-group) state
      activeApp,
      activeAppTheme,
      appCategoryParams,
      setActiveApp,
      clearActiveApp,
      APP_THEMES,
      VALID_APPS,
    }),
    [
      categories, subcategories, subcategoriesLoading, loading,
      activeCategory, activeSubcategory,
      selectCategory, selectSubcategory,
      clearCategory, clearSubcategory, theme,
      activeApp, activeAppTheme, appCategoryParams,
      setActiveApp, clearActiveApp,
    ],
  );

  return (
    <CategoryModeContext.Provider value={value}>
      {children}
    </CategoryModeContext.Provider>
  );
}

export function useCategoryMode() {
  const context = useContext(CategoryModeContext);
  if (!context) {
    throw new Error("useCategoryMode must be used within CategoryModeProvider");
  }
  return context;
}

export default {
  CategoryModeProvider,
  useCategoryMode,
};
