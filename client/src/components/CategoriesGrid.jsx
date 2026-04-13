import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useFilter } from "../context/FilterContext";
import { fetchCategoriesCached } from "@/services/categoriesService";
import { getCategoryIcon } from "@/constants/categoryIcons";

/**
 * Horizontal scrollable grid of category filter buttons.
 * Fetches categories on mount and highlights the active selection.
 * @param {object} props
 * @param {Function} [props.onCategorySelect] - Optional callback when a category is selected.
 * @param {string} [props.activeCategory] - Externally controlled active category name.
 */
const CategoriesGrid = ({ onCategorySelect, activeCategory }) => {
  const { filters, updateFilter } = useFilter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(filters.category || "All");
  const navigate = useNavigate();

  // Use shared icon mapping from constants

  // Sync selected state with external activeCategory or filter context
  useEffect(() => {
    setSelected(
      activeCategory !== undefined
        ? activeCategory || "All"
        : filters.category || "All"
    );
  }, [filters.category, activeCategory]);

  // Fetch categories on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchCategoriesCached();
        if (cancelled) return;

        const allItem = { id: "all", name: "All", icon: "All" };
        const list = Array.isArray(data) ? data : [];
        const merged = [allItem, ...list.filter((item) => item.name !== "All")];
        setCategories(merged);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.error("Failed to fetch categories:", err);
        }
        setError("Failed to load categories");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Handle category button clicks.
   * @param {string} name - The category name.
   */
  const handleSelect = (name) => {
    if (onCategorySelect) {
      onCategorySelect(name === "All" ? "" : name);
      setSelected(name);
      return;
    }
    setSelected(name);
    updateFilter("category", name === "All" ? "" : name);
    navigate("/");
  };

  const resolvedActive = useMemo(() => {
    if (activeCategory !== undefined) return activeCategory || "All";

    if (filters?.search) {
      const match = categories.find(
        (cat) => cat.name.toLowerCase() === filters.search.trim().toLowerCase()
      );
      if (match) return match.name;
    }

    return selected || "All";
  }, [activeCategory, categories, filters?.search, selected]);

  if (loading) {
    return (
      <div className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl mb-6" />
    );
  }

  if (error) {
    return (
      <div className="w-full mb-6 text-center py-3">
        <p className="text-sm text-muted-foreground">Failed to load categories</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mb-6">
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide -mx-2">
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.name, LayoutGrid);
          const isActive = resolvedActive === cat.name;

          return (
            <button
              key={cat.id || cat.name}
              onClick={() => handleSelect(cat.name)}
              className="flex flex-col items-center min-w-[72px] gap-2 outline-none group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 border-2
                  ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200"
                      : "bg-[var(--chip-bg)] border-[var(--chip-border)] text-[var(--text-muted)] hover:border-blue-300 hover:text-blue-500"
                  }`}
              >
                <Icon
                  className={`w-6 h-6 ${isActive ? "animate-bounce-short" : ""}`}
                />
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap transition-colors
                  ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900"
                  }
                `}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesGrid;
