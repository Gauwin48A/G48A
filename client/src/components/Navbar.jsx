import React, { useContext, useState } from "react";
import { FiSearch, FiUser, FiShoppingCart, FiBell, FiMenu } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useFilter } from "@/context/FilterContext";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, setFilters } = useFilter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Categories with translation keys
  const categories = [
    { value: "All", labelKey: "all" },
    { value: "Electronics", labelKey: "electronics" },
    { value: "Fashion", labelKey: "fashion" },
    { value: "Home", labelKey: "home" },
    { value: "Mobiles", labelKey: "mobiles" }
  ];

  // Sort options with translation keys
  const sortOptions = [
    { value: "recent", labelKey: "most_recent" },
    { value: "leastViews", labelKey: "least_views" },
    { value: "priceLowHigh", labelKey: "price_low_high" },
    { value: "priceHighLow", labelKey: "price_high_low" },
  ];

  const handleSearch = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleCategory = (val) => {
    setFilters((prev) => ({ ...prev, category: val }));
  };

  const handleSort = (val) => {
    setFilters((prev) => ({ ...prev, sortBy: val }));
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-lg">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="text-2xl font-bold text-primary">MobileHub</Link>
        </div>
        {/* Search Bar */}
        <form className="flex-1 mx-4 max-w-lg hidden md:flex" role="search" aria-label={t('search')}>
          <div className="relative w-full">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full px-4 py-2 rounded-xl border border-light bg-light text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={t('search')}
              value={filters.search}
              onChange={handleSearch}
            />
            <FiSearch className="absolute right-3 top-2.5 text-primary" />
          </div>
        </form>
        {/* Category and Sort Filters */}
        <div className="hidden md:flex items-center gap-2">
          <Select value={filters.category} onValueChange={handleCategory} className="w-32">
            <SelectTrigger>
              <SelectValue placeholder={t('category')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{t(cat.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.sortBy} onValueChange={handleSort} className="w-32">
            <SelectTrigger>
              <SelectValue placeholder={t('sort_by')} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Nav Links */}
        <ul className="hidden lg:flex items-center gap-4 ml-4">
          <li><Link to="/" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/' ? 'bg-blue-100' : ''} `}>{t('home')}</Link></li>
          <li><Link to="/feed" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/feed' ? 'bg-blue-100' : ''} `}>{t('feed')}</Link></li>
          <li><Link to="/my-feed" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/my-feed' ? 'bg-blue-100' : ''} `}>{t('my_feed')}</Link></li>
          <li><Link to="/channels" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname.startsWith('/channels') ? 'bg-blue-100' : ''} `}>{t('channels')}</Link></li>
          <li><Link to="/my-recommendations" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/my-recommendations' ? 'bg-blue-100' : ''} `}>{t('my_recommendations')}</Link></li>
          <li><Link to="/my-home" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/my-home' ? 'bg-blue-100' : ''} `}>{t('my_home')}</Link></li>
          <li><Link to="/categories" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/categories' ? 'bg-blue-100' : ''} `}>{t('categories')}</Link></li>
          <li><Link to="/rewards" className={`px - 3 py - 2 rounded - xl font - medium transition text - dark hover: bg - light ${location.pathname === '/rewards' ? 'bg-blue-100' : ''} `}>{t('rewards')}</Link></li>
        </ul>
        {/* Icons */}
        <div className="flex items-center gap-4 ml-4">
          <Link to="/add-post" aria-label={t('sell')} className="p-2 rounded-full hover:bg-blue-100 focus:outline-none bg-blue-600 text-white"><span className="text-xl font-bold">+</span></Link>
          <button aria-label={t('profile')} className="p-2 rounded-full hover:bg-light focus:outline-none"><FiUser className="text-primary" /></button>
          <button aria-label={t('cart')} className="p-2 rounded-full hover:bg-light focus:outline-none"><FiShoppingCart className="text-primary" /></button>
          <button aria-label={t('notifications')} className="p-2 rounded-full hover:bg-light focus:outline-none"><FiBell className="text-primary" /></button>
          <button className="lg:hidden p-2" aria-label={t('menu')} onClick={() => setMenuOpen(!menuOpen)}>
            <FiMenu className="text-primary" />
          </button>
        </div>
      </nav>
      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-light px-4 py-2">
          <ul className="flex flex-col gap-2">
            <li><Link to="/" onClick={() => setMenuOpen(false)}>{t('home')}</Link></li>
            <li><Link to="/feed" onClick={() => setMenuOpen(false)}>{t('feed')}</Link></li>
            <li><Link to="/my-feed" onClick={() => setMenuOpen(false)}>{t('my_feed')}</Link></li>
            <li><Link to="/channels" onClick={() => setMenuOpen(false)}>{t('channels')}</Link></li>
            <li><Link to="/my-recommendations" onClick={() => setMenuOpen(false)}>{t('my_recommendations')}</Link></li>
            <li><Link to="/my-home" onClick={() => setMenuOpen(false)}>{t('my_home')}</Link></li>
            <li><Link to="/categories" onClick={() => setMenuOpen(false)}>{t('categories')}</Link></li>
            <li><Link to="/rewards" onClick={() => setMenuOpen(false)}>{t('rewards')}</Link></li>
            <li><Link to="/add-post" onClick={() => setMenuOpen(false)} className="text-blue-600 font-bold">+ {t('sell')}</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;
