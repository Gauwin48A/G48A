import React, { useEffect, useState } from 'react';
import { fetchMyFeed } from '../lib/api';
import FeedPostCard from '../components/FeedPostCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MyFeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchData = () => {
    setLoading(true);
    fetchMyFeed({ category, sortBy, sortOrder, page, search })
      .then(res => setPosts(res.data))
      .catch(() => setError('Failed to load my feed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [category, sortBy, sortOrder, page, search]);

  return (
    <div className="bg-white min-h-screen">
      {/* Banner section for consistency */}
      <div className="w-full flex justify-center">
        <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 mt-0 md:mt-6">
          <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
            <span className="text-xl md:text-3xl font-bold text-blue-900 mb-1">Your Feed</span>
            <span className="text-sm md:text-base text-blue-800 font-medium mb-2">Text-only posts by you</span>
          </div>
          <div className="mt-4 md:mt-0 md:ml-8 z-10">
            <div className="w-24 h-16 md:w-32 md:h-24 bg-blue-200 rounded-lg flex items-center justify-center">
              <svg width="64" height="48" fill="none" viewBox="0 0 64 48"><rect width="64" height="48" rx="8" fill="#2563eb" /></svg>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 rounded-bl-2xl" />
        </div>
      </div>
      {/* Filters/Search/Sort */}
      <div className="flex gap-2 mb-4 max-w-5xl mx-auto px-2 md:px-0">
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="border rounded px-2" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded px-2">
          <option value="">All Categories</option>
          {/* TODO: Dynamically load categories if needed */}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded px-2">
          <option value="created_at">Date</option>
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="border rounded px-2">
          <option value="desc">Latest</option>
          <option value="asc">Oldest</option>
        </select>
      </div>
      {/* Feed posts */}
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0">
        {loading ? (
          <div className="text-center text-blue-400">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-400">{error}</div>
        ) : posts.length === 0 ? (
          <div className="col-span-full text-center text-blue-400">No text posts found.</div>
        ) : (
          posts.map(post => <FeedPostCard key={post.post_id} post={post} />)
        )}
      </div>
      {/* Pagination */}
      <div className="flex gap-2 mt-4 justify-center">
        <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
        <span>Page {page}</span>
        <Button onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
};

export default MyFeedPage;
