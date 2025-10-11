import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyFeedPage = () => {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFeeds = async () => {
    setLoading(true);
    const res = await axios.get('/api/feeds/my');
    setFeeds(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Feed</h1>
      {loading ? <p>Loading...</p> : (
        <ul>
          {feeds.map(feed => (
            <li key={feed.feed_id} className="border-b py-2">
              {feed.description}
              <span className="text-xs text-gray-500 ml-2">{new Date(feed.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyFeedPage;
