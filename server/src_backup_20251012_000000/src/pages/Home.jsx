import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Filter, Bell } from 'lucide-react';

const Home = () => {
  const [deals, setDeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const dealsRes = await fetch(`${baseUrl}/api/posts?limit=4&sortBy=discount&sortOrder=desc`);
        const dealsData = await dealsRes.json();
        setDeals(Array.isArray(dealsData.posts) ? dealsData.posts : []);

        const catRes = await fetch(`${baseUrl}/api/categories`);
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Live location tracking and audit POST
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const userId = localStorage.getItem('userId');
        fetch(`${baseUrl}/api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, latitude, longitude, action: 'app_open' })
        });
      });
    }
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col items-center">
      {/* Categories Bar - scrollable, fetched from DB */}
      <div className="flex items-center px-4 pb-2 overflow-x-auto bg-white border-b border-blue-100 gap-2 scrollbar-hide w-full">
        <button className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-semibold shadow text-sm">All</button>
        {categories.map(cat => (
          <button key={cat.category_id || cat.id || cat.name} className="bg-white border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full font-medium hover:bg-blue-50 transition-all shadow text-sm">
            {cat.name}
          </button>
        ))}
      </div>

      {/* Top Deals Section - as in image */}
      <main className="w-full max-w-md mx-auto py-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 px-2">Top Deals</h2>
        <div className="flex flex-col gap-4 mb-6 px-2">
          {loading ? (
            <div className="text-center w-full">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500 w-full">{error}</div>
          ) : deals.length === 0 ? (
            <div className="text-center w-full">No deals found.</div>
          ) : (
            deals.map((deal, idx) => (
              <div key={deal.post_id || deal.id || idx} className="bg-white rounded-2xl shadow border border-gray-100 p-4 flex flex-row items-center gap-4 w-full">
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-xl border">
                  <img src={deal.image || '/placeholder.svg'} alt={deal.title} className="w-12 h-12 object-cover rounded-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-gray-900 mb-0.5 truncate">{deal.title}</h3>
                  <p className="text-gray-500 text-xs mb-1 truncate">{deal.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600 font-bold text-lg">₹{deal.price?.toLocaleString()}</span>
                    {deal.status && (
                      <Badge className={`ml-2 px-2 py-0.5 text-xs ${deal.status === 'completed' ? 'bg-gray-200 text-gray-700' : deal.status === 'returned' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 text-xs">
                    <span>2d ago</span>
                    <span>♡ {deal.likes || 0}</span>
                  </div>
                </div>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold shadow text-sm ml-2 whitespace-nowrap">View Deal</Button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
