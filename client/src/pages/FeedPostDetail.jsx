import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  FaHeart,
  FaRegHeart,
  FaShare,
  FaEye,
  FaArrowLeft,
  FaClock,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';
import { PageErrorState, PageLoadingState } from '@/components/page-state/PageStateBlocks';

const FeedPostDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPost = location.state?.post || null;
  const baseUrl = useMemo(() => getApiOriginBase(), []);

  const [post, setPost] = useState(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Number(initialPost?.likes || 0));
  const [shareToast, setShareToast] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const fetchPost = useCallback(async (signal) => {
    if (!id) {
      setPost(null);
      setError('Post not found.');
      setLoading(false);
      return;
    }

    if (!initialPost || reloadKey > 0) {
      setLoading(true);
    }
    setError('');

    try {
      const res = await fetch(`${baseUrl}/api/posts/${id}`, {
        signal,
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('fetch_failed');
      }
      const data = await res.json();
      const nextPost = data?.post || data;
      if (!nextPost || typeof nextPost !== 'object') {
        throw new Error('invalid_payload');
      }
      setPost(nextPost);
      setLikeCount(Number(nextPost.likes || 0));
    } catch (err) {
      if (signal?.aborted) {
        return;
      }
      setPost(null);
      setError('We could not load this post right now. Please try again.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [baseUrl, id, initialPost, reloadKey]);

  useEffect(() => {
    if (initialPost && reloadKey === 0) {
      setPost(initialPost);
      setLikeCount(Number(initialPost.likes || 0));
      setLoading(false);
      setError('');
    }

    const abortController = new AbortController();
    fetchPost(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchPost, initialPost, reloadKey]);

  useEffect(() => {
    if (!shareToast) {
      return undefined;
    }

    const timer = setTimeout(() => setShareToast(''), 2000);
    return () => clearTimeout(timer);
  }, [shareToast]);

  useEffect(() => {
    if (!id) {
      return;
    }

    fetch(`${baseUrl}/api/posts/${id}/view`, {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {
      // Ignore non-critical telemetry/view errors.
    });

    const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    if (!userId) {
      return;
    }

    fetch(`${baseUrl}/api/recently-viewed/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postId: id, userId, source: 'feed' })
    }).catch(() => {
      // Ignore non-critical tracking errors.
    });
  }, [baseUrl, id]);

  const handleLike = async () => {
    if (!id) {
      return;
    }
    setLiked((prevLiked) => {
      const nextLiked = !prevLiked;
      setLikeCount((prevCount) => (nextLiked ? prevCount + 1 : prevCount - 1));
      return nextLiked;
    });
    try {
      await fetch(`${baseUrl}/api/posts/${id}/like`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Keep optimistic UX for now.
    }
  };

  const handleShare = async () => {
    if (!id) {
      return;
    }
    const url = `${window.location.origin}/feed/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast('Link copied.');
    } catch {
      setShareToast('Unable to copy link.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '';
    }
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <PageLoadingState
          title={t('loading') || 'Loading...'}
          description={t('feed_post_loading_desc') || 'Loading the selected feed post.'}
          className="w-full max-w-md"
          marker="loading"
        />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <PageErrorState
          title={t('post_not_found') || 'Post unavailable'}
          description={error || 'This post may have been removed.'}
          onRetry={() => setReloadKey((prev) => prev + 1)}
          retryLabel="Retry"
          marker="error"
          className="w-full max-w-md"
          secondaryAction={(
            <Button onClick={() => navigate('/feed')} variant="outline" className="border-indigo-300 text-indigo-700">
              <FaArrowLeft className="mr-2" /> {t('back_to_feed') || 'Back to Feed'}
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium"
          >
            <FaArrowLeft /> <span className="hidden sm:inline">{t('back') || 'Back'}</span>
          </button>
          <div className="flex-1 text-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t('post') || 'Post'}</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-4 p-6 border-b dark:border-gray-700">
            <Avatar className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500">
              <AvatarFallback className="text-white text-xl font-bold">
                {post.user?.name?.[0] || post.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {post.user?.name || post.username || 'Anonymous'}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400 text-sm mt-1">
                {post.location && (
                  <span className="flex items-center gap-1">
                    <FaMapMarkerAlt className="text-xs" /> {post.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FaClock className="text-xs" /> {formatDate(post.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {post.title && (
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                {post.title}
              </h1>
            )}

            <article className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                {post.description || 'No content available.'}
              </p>
            </article>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
            <div className="flex gap-6">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition font-medium"
              >
                {liked ? <FaHeart className="w-5 h-5 text-red-500" /> : <FaRegHeart className="w-5 h-5" />}
                <span>{likeCount} {t('likes') || 'Likes'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition font-medium"
              >
                <FaShare className="w-4 h-4" />
                <span>{t('share') || 'Share'}</span>
              </button>

              <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <FaEye className="w-4 h-4" />
                <span>{post.views_count || post.views || 0} {t('views') || 'Views'}</span>
              </span>
            </div>
          </div>
        </Card>

        <div className="text-center mt-8">
          <Button
            onClick={() => navigate('/feed')}
            variant="outline"
            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 px-8"
          >
            <FaArrowLeft className="mr-2" /> {t('back_to_feed') || 'Back to Feed'}
          </Button>
        </div>
      </div>

      {shareToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {shareToast}
        </div>
      )}
    </div>
  );
};

export default FeedPostDetail;
