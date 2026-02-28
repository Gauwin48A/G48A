import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getAccessToken, getUserId } from '@/utils/authStorage';

const BoughtPosts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = getAccessToken();
  const userId = getUserId(authUser);
  const isLoggedIn = useMemo(() => Boolean(authUser || (token && userId)), [authUser, token, userId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isLoggedIn || !userId) {
      setLoading(false);
      setPosts([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchBoughtPosts = async () => {
      setLoading(true);
      try {
        const response = await api.get('/posts/mine', {
          params: {
            userId,
            limit: 100,
            page: 1,
            sortBy: 'created_at',
            sortOrder: 'desc'
          }
        });

        if (cancelled) {
          return;
        }

        const payload = response?.data ?? response;
        const sourcePosts = Array.isArray(payload?.posts) ? payload.posts : [];
        const boughtOnly = sourcePosts.filter((post) => String(post?.ownership || '').toLowerCase() === 'bought');
        setPosts(boughtOnly);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('error') || 'Failed to load posts');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBoughtPosts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn, t, userId]);

  if (authLoading) {
    return <div className="text-center py-10">{t('loading') || 'Loading...'}</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('bought_posts') || 'Bought Posts'}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{t('please_login_view') || 'Please log in to view your bought posts.'}</p>
          <div className="flex flex-col gap-3">
            <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold">{t('login') || 'Login'}</Link>
            <Link to="/signup" className="border border-blue-300 text-blue-600 py-3 rounded-xl font-semibold">{t('signup') || 'Create Account'}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto py-4 px-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('bought_posts') || 'Bought Posts'}</h2>

        {loading ? (
          <div className="text-center dark:text-gray-300">{t('loading') || 'Loading...'}</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : posts.length === 0 ? (
          <div className="text-center dark:text-gray-300">{t('no_posts') || 'No bought posts found.'}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post, idx) => (
              <div key={post.post_id || post.id || idx} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{post.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{post.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">Rs {Number(post.price || 0).toLocaleString()}</span>
                  <Badge className="bg-blue-100 text-blue-700">{post.status || 'Bought'}</Badge>
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm text-blue-600 hover:underline"
                  onClick={() => navigate(`/post/${post.post_id || post.id}`)}
                >
                  {t('view_details') || 'View details'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoughtPosts;
