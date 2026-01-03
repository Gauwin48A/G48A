import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FaHeart, FaRegHeart, FaShare, FaEye, FaArrowLeft, FaNewspaper, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const FeedPostDetail = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [post, setPost] = useState(location.state?.post || null);
    const [loading, setLoading] = useState(!location.state?.post);
    const [error, setError] = useState(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [shareToast, setShareToast] = useState("");

    // Fetch post if not passed via state
    useEffect(() => {
        if (!post && id) {
            const fetchPost = async () => {
                try {
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                    const res = await fetch(`${baseUrl}/api/posts/${id}`);
                    if (!res.ok) throw new Error('Post not found');
                    const data = await res.json();
                    setPost(data.post || data);
                    setLikeCount(data.post?.likes || data.likes || 0);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchPost();
        } else if (post) {
            setLikeCount(post.likes || 0);
        }
    }, [id, post]);

    // Track view and recently viewed
    useEffect(() => {
        if (id) {
            // Track view count
            fetch(`/api/posts/${id}/view`, { method: 'POST', credentials: 'include' }).catch(() => { });

            // Track recently viewed (for feed posts)
            const userId = localStorage.getItem('userId');
            if (userId) {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                fetch(`${baseUrl}/api/recently-viewed/track`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ postId: id, userId: userId, source: 'feed' })
                }).catch(() => { });
            }
        }
    }, [id]);

    const handleLike = async () => {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        try {
            await fetch(`/api/posts/${id}/like`, { method: 'POST', credentials: 'include' });
        } catch { }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/feed/${id}`;
        try {
            await navigator.clipboard.writeText(url);
            setShareToast('Link copied!');
            setTimeout(() => setShareToast(''), 2000);
        } catch {
            setShareToast('Failed to copy');
            setTimeout(() => setShareToast(''), 2000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
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
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">{t('loading') || 'Loading...'}</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-md bg-white dark:bg-gray-800 rounded-2xl">
                    <FaNewspaper className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {t('post_not_found') || 'Post Not Found'}
                    </h2>
                    <p className="text-gray-500 mb-6">
                        {error || 'This post may have been removed.'}
                    </p>
                    <Button onClick={() => navigate('/feed')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <FaArrowLeft className="mr-2" /> {t('back_to_feed') || 'Back to Feed'}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Sticky Header */}
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
                    <div className="w-16"></div>
                </div>
            </div>

            {/* Full Screen Post Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">

                    {/* Author Header */}
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

                    {/* Post Content - Full Display */}
                    <div className="p-6 md:p-8">
                        {/* Title */}
                        {post.title && (
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                                {post.title}
                            </h1>
                        )}

                        {/* Full Description */}
                        <article className="prose prose-lg dark:prose-invert max-w-none">
                            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                                {post.description || 'No content available.'}
                            </p>
                        </article>
                    </div>

                    {/* Actions Footer */}
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

                {/* Back Button */}
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

            {/* Share Toast */}
            {shareToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
                    {shareToast}
                </div>
            )}
        </div>
    );
};

export default FeedPostDetail;
