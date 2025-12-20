import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const SoldPosts = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSoldPosts = async () => {
            setLoading(true);
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                const userId = localStorage.getItem('userId');
                const token = localStorage.getItem('authToken');

                const res = await fetch(`${baseUrl}/api/posts/sold?userId=${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setPosts(Array.isArray(data.posts) ? data.posts : []);
                setError(null);
            } catch (err) {
                setError(t('error') || 'Failed to load posts');
            } finally {
                setLoading(false);
            }
        };
        fetchSoldPosts();
    }, []);

    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center transition-colors duration-300">
            <div className="w-full max-w-2xl mx-auto py-4 px-4">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t('sold_posts') || 'Sold Posts'}</h2>

                {loading ? (
                    <div className="text-center dark:text-gray-300">{t('loading')}</div>
                ) : error ? (
                    <div className="text-center text-red-500">{error}</div>
                ) : posts.length === 0 ? (
                    <div className="text-center dark:text-gray-300">{t('no_posts') || 'No sold posts found.'}</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {posts.map((post, idx) => (
                            <div key={post.post_id || post.id || idx} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{post.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{post.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-green-600 dark:text-green-400 font-bold">₹{post.price?.toLocaleString()}</span>
                                    <Badge className="bg-green-100 text-green-700">{post.status || 'Sold'}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoldPosts;
