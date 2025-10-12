import React, { useEffect, useState } from 'react';
import { fetchFeed } from '../lib/api';
import FeedPostCard from '../components/FeedPostCard';

const FeedPage = () => {
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
    fetchFeed({ category, sortBy, sortOrder, page, search })
      .then(res => setPosts(res.data))
      .catch(() => setError('Failed to load feed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [category, sortBy, sortOrder, page, search]);

  return (
    <div className="container mx-auto py-4">
      <h2 className="text-2xl font-bold mb-4">Feed</h2>
      <div className="flex gap-2 mb-4">
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
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
        posts.length === 0 ? <div>No text posts found.</div> : (
          <div className="space-y-4">
            {posts.map(post => <FeedPostCard key={post.post_id} post={post} />)}
          </div>
        )
      )}
      <div className="flex gap-2 mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
};

export default FeedPage;
