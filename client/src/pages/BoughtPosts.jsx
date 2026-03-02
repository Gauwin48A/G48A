import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const token = getAccessToken();
  const userId = getUserId(authUser);
  const isLoggedIn = useMemo(() => Boolean(authUser || (token && userId)), [authUser, token, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn || !userId) {
      setLoading(false);
      setPosts([]);
      setError('');
      return;
    }

    let cancelled = false;
    const fetchBoughtPosts = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/posts/mine', {
          params: { userId, limit: 100, page: 1, sortBy: 'created_at', sortOrder: 'desc' },
        });
        if (cancelled) return;
        const payload = response?.data ?? response;
        const sourcePosts = Array.isArray(payload?.posts) ? payload.posts : [];
        const boughtOnly = sourcePosts.filter((post) => String(post?.ownership || '').toLowerCase() === 'bought');
        setPosts(boughtOnly);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('error') || 'Failed to load bought posts');
          setPosts([]);
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
  }, [authLoading, isLoggedIn, reloadTick, t, userId]);

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
    <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center transition-colors duration-300 pb-24">
      <div className="w-full max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('bought_posts') || 'Bought Posts'}</h2>
          <Button type="button" variant="outline" onClick={() => setReloadTick((value) => value + 1)}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`bought-skeleton-${index}`} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={() => setReloadTick((value) => value + 1)}>
                Retry
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/all-posts')}>
                Browse posts
              </Button>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-6 text-center">
            <p className="text-blue-900 dark:text-blue-200 font-semibold mb-2">No bought posts yet</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Once you complete purchases, they will appear here.
            </p>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate('/all-posts')}>
              Explore listings
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post, index) => (
              <div key={post.post_id || post.id || index} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{post.title || 'Untitled post'}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">
                  {post.description || 'No description available.'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">Rs {Number(post.price || 0).toLocaleString()}</span>
                  <Badge className="bg-blue-100 text-blue-700">{post.status || 'Bought'}</Badge>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 p-0 h-auto text-blue-600"
                  onClick={() => navigate(`/post/${post.post_id || post.id}`)}
                >
                  {t('view_details') || 'View details'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoughtPosts;
