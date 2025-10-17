import React, { useEffect, useState } from 'react';
import { fetchFeed } from '../lib/api';
import FeedPostCard from '../components/FeedPostCard';
import { Button } from '@/components/ui/button';

const FeedPage = () => {
  const [tab, setTab] = useState('feed'); // 'feed' or 'myFeed'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        let res;
        if (tab === 'feed') {
          res = await fetchFeed({ category, page, search });
        } else {
          const userId = localStorage.getItem('userId');
          res = await fetchFeed({ category, page, search, userId });
        }
        setPosts(res.data);
        setError(null);
      } catch {
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab, category, page, search]);

  return (
    <div className="bg-white min-h-screen">
      {/* Banner section for consistency */}
      <div className="w-full flex justify-center">
        <div className="flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 mt-0 md:mt-6">
          <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
            <span className="text-xl md:text-3xl font-bold text-blue-900 mb-1">Latest News & Updates</span>
            <span className="text-sm md:text-base text-blue-800 font-medium mb-2">Text-only posts from all users</span>
            <Button className="bg-blue-600 text-white font-semibold px-5 md:px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-sm md:text-base" onClick={() => window.location.assign('/post_add')}>+ Add New Post</Button>
          </div>
          <div className="mt-4 md:mt-0 md:ml-8 z-10">
            <div className="w-24 h-16 md:w-32 md:h-24 bg-blue-200 rounded-lg flex items-center justify-center">
              <svg width="64" height="48" fill="none" viewBox="0 0 64 48"><rect width="64" height="48" rx="8" fill="#2563eb" /></svg>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 rounded-bl-2xl" />
        </div>
      </div>
      {/* Sponsored Deals (horizontal grid, 4/5 only) */}
      {/* You can reuse sponsoredDeals logic from AllPosts if needed */}
      {/* All Posts Feed - Instagram/Facebook style modern card */}
      <div className="w-full flex flex-col items-center mb-10">
        <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-4 w-full max-w-5xl px-3 md:px-0">Feed</h2>
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0">
          {loading ? (
            <div className="text-center text-blue-400">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : posts.length === 0 ? (
            <div className="col-span-full text-center text-blue-400">No text posts found.</div>
          ) : (
            posts.map((post, idx) => (
              <FeedPostCard key={post.post_id || post.id || idx} post={post} />
            ))
          )}
        </div>
        <div className="flex gap-2 mt-4 justify-center">
          <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
          <span>Page {page}</span>
          <Button onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
      {/* My Feed Banner/Button - visually distinct, like My Recommendations in AllPosts */}
      <div className="w-full flex flex-col items-center mb-6">
        <div className="flex-1 bg-gradient-to-r from-blue-200 to-blue-400 rounded-xl shadow-lg p-4 flex items-center cursor-pointer hover:scale-105 transition w-full max-w-5xl" onClick={() => setTab('myFeed')}>
          <span className="text-2xl mr-3">🌟</span>
          <div>
            <div className="font-bold text-blue-900 text-lg">My Feed</div>
            <div className="text-blue-800 text-sm">Your personal posts and updates</div>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-center mb-6">
        <div className="flex gap-4">
          <Button className={tab === 'myFeed' ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white font-extrabold shadow-lg scale-110 border-2 border-blue-700' : 'bg-white text-blue-600 border-2 border-blue-600 font-bold'} style={{fontSize:'1.2rem',padding:'0.75rem 2rem',borderRadius:'1.5rem'}} onClick={() => setTab('myFeed')}>My Feed</Button>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
