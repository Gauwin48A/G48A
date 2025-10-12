import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

const FeedPage = () => {
  const [feeds, setFeeds] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();

  const fetchFeeds = async () => {
    setLoading(true);
    const res = await axios.get('/api/feeds');
    setFeeds(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) return;
    await axios.post('/api/feeds', { description });
    setDescription('');
    fetchFeeds();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('feed')}</h1>
      <LanguageSelector />
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          className="w-full border rounded p-2"
          placeholder="Share something (text only)..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        <button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">{t('post')}</button>
      </form>
      {loading ? <p>Loading...</p> : (
        <ul>
          {feeds.map(feed => (
            <li key={feed.feed_id} className="border-b py-2">
              <span className="font-semibold">{feed.username}:</span> {feed.description}
              <span className="text-xs text-gray-500 ml-2">{new Date(feed.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FeedPage;
