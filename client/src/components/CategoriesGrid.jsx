import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Shirt, Monitor, Sofa, LayoutGrid, Car, Book, Home, Dumbbell, Palette, Baby } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { fetchCategoriesCached } from '@/services/categoriesService';

const CategoriesGrid = ({ onCategorySelect, activeCategory }) => {
  const { filters, updateFilter } = useFilter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(filters.category || 'All');
  const navigate = useNavigate();

  // Icon mapping
  const iconMap = {
    'All': LayoutGrid,
    'Electronics': Smartphone,
    'Mobiles': Smartphone,
    'Fashion': Shirt,
    'Home': Home,
    'Furniture': Sofa,
    'Vehicles': Car,
    'Books': Book,
    'Sports': Dumbbell,
    'Beauty': Palette,
    'Kids': Baby,
    'Home Appliances': Monitor
  };

  useEffect(() => {
    if (activeCategory !== undefined) {
      setSelectedCategory(activeCategory || 'All');
    } else {
      setSelectedCategory(filters.category || 'All');
    }
  }, [filters.category, activeCategory]);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const categoriesData = await fetchCategoriesCached();
        if (cancelled) return;
        const allCategory = { id: 'all', name: 'All', icon: 'All' };
        const safeCategories = Array.isArray(categoriesData) ? categoriesData : [];
        const uniqueCats = [allCategory, ...safeCategories.filter((category) => category.name !== 'All')];
        setCategories(uniqueCats);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.error('Failed to fetch categories:', err);
        }
        setError('Failed to load categories');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategoryClick = (categoryName) => {
    if (onCategorySelect) {
      onCategorySelect(categoryName === 'All' ? '' : categoryName);
      setSelectedCategory(categoryName);
      return;
    }

    // Default behavior
    setSelectedCategory(categoryName);
    updateFilter('category', categoryName === 'All' ? '' : categoryName);
    navigate('/');
  };

  const effectiveSelectedCategory = useMemo(() => {
    if (activeCategory !== undefined) return activeCategory || 'All';
    if (filters?.search) {
      const match = categories.find((category) => category.name.toLowerCase() === filters.search.trim().toLowerCase());
      if (match) return match.name;
    }
    return selectedCategory || 'All';
  }, [activeCategory, categories, filters?.search, selectedCategory]);

  if (loading) return <div className="h-20 animate-pulse bg-gray-100 rounded-xl mb-6"></div>;
  if (error) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide -mx-2">
        {categories.map((cat) => {
          const IconComponent = iconMap[cat.name] || iconMap[cat.icon] || LayoutGrid;
          const isSelected = effectiveSelectedCategory === cat.name;

          return (
            <button
              key={cat.id || cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className="flex flex-col items-center min-w-[72px] gap-2 outline-none group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 border-2
                  ${isSelected
                    ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200'
                    : 'bg-white dark:bg-gray-800 border-transparent text-gray-500 hover:border-blue-200 hover:text-blue-500 dark:text-gray-400'
                  }`}
              >
                <IconComponent className={`w-6 h-6 ${isSelected ? 'animate-bounce-short' : ''}`} />
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap transition-colors
                  ${isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900'}
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
