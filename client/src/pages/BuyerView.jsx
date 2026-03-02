import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Phone, Heart, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/page-state/PageStateBlocks';

const MOCK_MOBILE_LISTINGS = [
  {
    id: 1,
    title: 'iPhone 13 Pro Max 128GB',
    brand: 'Apple',
    price: 'Rs 75,000',
    condition: 'Like New',
    location: 'Mumbai, Maharashtra',
    seller: 'John Doe',
    verified: true,
    image: '/placeholder.svg',
    postedDate: '2 days ago'
  },
  {
    id: 2,
    title: 'Samsung Galaxy S21 256GB',
    brand: 'Samsung',
    price: 'Rs 45,000',
    condition: 'Excellent',
    location: 'Delhi, NCR',
    seller: 'Sarah Khan',
    verified: true,
    image: '/placeholder.svg',
    postedDate: '1 week ago'
  },
  {
    id: 3,
    title: 'OnePlus 9 Pro 128GB',
    brand: 'OnePlus',
    price: 'Rs 35,000',
    condition: 'Good',
    location: 'Bangalore, Karnataka',
    seller: 'Mike Wilson',
    verified: false,
    image: '/placeholder.svg',
    postedDate: '3 days ago'
  }
];

const BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Oppo', 'Vivo', 'Realme'];

const parsePrice = (price) => Number(String(price || '').replace(/[^\d]/g, '')) || 0;

const matchesPriceRange = (value, range) => {
  if (!range) {
    return true;
  }
  if (range === '0-25000') {
    return value <= 25000;
  }
  if (range === '25000-50000') {
    return value > 25000 && value <= 50000;
  }
  if (range === '50000-75000') {
    return value > 50000 && value <= 75000;
  }
  if (range === '75000+') {
    return value > 75000;
  }
  return true;
};

const BuyerView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState({});
  const loadTimerRef = useRef(null);

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedBrand || priceRange);

  const loadListings = () => {
    setLoading(true);
    setError('');

    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }

    loadTimerRef.current = setTimeout(() => {
      try {
        setListings(MOCK_MOBILE_LISTINGS);
      } catch {
        setError('Unable to load buyer listings right now. Please retry.');
        setListings([]);
      } finally {
        setLoading(false);
        loadTimerRef.current = null;
      }
    }, 350);
  };

  useEffect(() => {
    loadListings();
    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, []);

  const filteredListings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return listings.filter((item) => {
      const numericPrice = parsePrice(item.price);
      const matchesQuery = !query
        || item.title.toLowerCase().includes(query)
        || item.seller.toLowerCase().includes(query)
        || item.location.toLowerCase().includes(query);
      const matchesBrand = !selectedBrand || item.brand === selectedBrand;
      return matchesQuery && matchesBrand && matchesPriceRange(numericPrice, priceRange);
    });
  }, [listings, priceRange, searchTerm, selectedBrand]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedBrand('');
    setPriceRange('');
  };

  const toggleFavorite = (listingId) => {
    setFavorites((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 main-content">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Mobile Phones</h1>
        <p className="text-gray-600">Find your perfect mobile phone from verified sellers.</p>
      </div>

      <div className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search mobiles..."
              className="input pl-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search buyer listings"
            />
          </div>
          <select
            className="input"
            value={selectedBrand}
            onChange={(event) => setSelectedBrand(event.target.value)}
            aria-label="Filter by brand"
          >
            <option value="">All Brands</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <select
            className="input"
            value={priceRange}
            onChange={(event) => setPriceRange(event.target.value)}
            aria-label="Filter by price range"
          >
            <option value="">All Prices</option>
            <option value="0-25000">Under Rs 25,000</option>
            <option value="25000-50000">Rs 25,000 - Rs 50,000</option>
            <option value="50000-75000">Rs 50,000 - Rs 75,000</option>
            <option value="75000+">Above Rs 75,000</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={hasActiveFilters ? resetFilters : undefined}
            disabled={!hasActiveFilters}
            data-ux-action="buyer_view_reset_filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            {hasActiveFilters ? 'Reset Filters' : 'Filters Applied'}
          </button>
        </div>
        {hasActiveFilters && (
          <div className="mt-4">
            <button className="btn btn-secondary" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading && (
        <PageLoadingState
          marker="loading"
          className="border-0 shadow-none bg-transparent"
          title={t('loading') || 'Loading...'}
          description="Fetching buyer listings."
        />
      )}

      {!loading && error && (
        <PageErrorState
          marker="error"
          className="border border-red-200 bg-red-50"
          title="Buyer listings unavailable"
          description={error}
          onRetry={loadListings}
          secondaryAction={(
            <button className="btn btn-secondary" onClick={() => navigate('/all-posts')}>
              Browse all posts
            </button>
          )}
        />
      )}

      {!loading && !error && filteredListings.length === 0 && (
        <PageEmptyState
          marker="empty"
          className="border-2 border-dashed"
          title="No matching listings found"
          description="Adjust your filters or reset to see all buyer offers."
          action={(
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="btn btn-primary" onClick={resetFilters}>
                Reset filters
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/all-posts')}>
                View marketplace
              </button>
            </div>
          )}
        />
      )}

      {!loading && !error && filteredListings.length > 0 && (
        <>
          <div className="mb-4 text-sm text-gray-500">
            Showing {filteredListings.length} listing{filteredListings.length > 1 ? 's' : ''}.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((mobile) => (
              <div key={mobile.id} className="card hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={mobile.image || '/placeholder.svg'}
                    onError={(event) => {
                      event.target.onerror = null;
                      event.target.src = '/placeholder.svg';
                    }}
                    alt={mobile.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <button
                    className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition ${favorites[mobile.id] ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}`}
                    onClick={() => toggleFavorite(mobile.id)}
                    aria-label={favorites[mobile.id] ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${favorites[mobile.id] ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{mobile.title}</h3>
                    <p className="text-sm text-gray-500">{mobile.condition}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-green-600">{mobile.price}</span>
                    <span className="text-sm text-gray-500">{mobile.postedDate}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{mobile.location}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Seller: {mobile.seller}</span>
                      {mobile.verified && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button className="btn btn-secondary flex-1" onClick={() => navigate('/chat')}>
                      <Phone className="w-4 h-4 mr-1" />
                      Contact
                    </button>
                    <button className="btn btn-primary flex-1" onClick={() => navigate('/all-posts')}>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BuyerView;
