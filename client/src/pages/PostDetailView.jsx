import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { useTranslation } from 'react-i18next';
import { getApiOriginBase } from '@/lib/networkConfig';

const PostDetailView = () => {
  const { t } = useTranslation();
  const tr = (key, fallback) => {
    const value = t(key);
    if (typeof value !== "string" || !value.trim() || value === key) {
      return fallback;
    }
    return value;
  };
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const baseUrl = getApiOriginBase();
        const res = await fetch(`${baseUrl}/api/posts/${postId}`);
        if (!res.ok) throw new Error(tr("post_load_failed", "Failed to fetch post details"));
        const data = await res.json();
        setPost(data.post || data);
        setError(null);
      } catch (err) {
        setError(tr("post_load_failed", "Failed to fetch post details"));
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">{tr("loading", "Loading...")}</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  if (!post) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-xl font-semibold text-gray-800 mb-4">{tr("post_not_found", "Post not found")}</div>
      <Button className="bg-blue-600 text-white" onClick={() => navigate('/allposts')}>
        {tr("back_to_all_posts", "Back to All Posts")}
      </Button>
    </div>
  );

  return (
    <div className="bg-white min-h-screen flex flex-col items-center py-8">
      <div className="w-full max-w-3xl mx-auto">
        <Button className="mb-4" onClick={() => navigate(-1)}>{tr("back", "Back")}</Button>
        <Card className="rounded-2xl shadow-lg p-6 flex flex-col gap-4">
          {/* Images */}
          <div className="w-full flex gap-4 overflow-x-auto mb-4 scrollbar-hide">
            {post.images && post.images.length > 0 ? post.images.map((img, idx) => (
              <img key={idx} src={img} alt={post.title} className="h-56 w-56 object-cover rounded-xl border" />
            )) : (
              <div className="h-56 w-56 bg-gray-100 flex items-center justify-center rounded-xl text-gray-400">{tr("no_image", "No Image")}</div>
            )}
          </div>
          {/* Title, Category, Price */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 mb-1">{post.title}</h1>
              <div className="text-gray-600 text-base mb-1">{tr("category", "Category")}: <span className="font-semibold">{post.category}</span></div>
              <div className="text-gray-600 text-base mb-1">{tr("status", "Status")}: <span className="font-semibold">{post.status}</span></div>
            </div>
            <div className="text-2xl font-black text-green-600">₹{post.price}</div>
          </div>
          {/* Description */}
          <div className="text-lg text-gray-800 mb-2">
            <span className="font-semibold">{tr("description", "Description")}:</span> {post.description || <span className="italic text-gray-400">{tr("no_description", "No description")}</span>}
          </div>
          {/* Seller Info */}
          <div className="flex items-center gap-4 bg-blue-50 rounded-xl p-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback>{post.user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-blue-900">{post.user?.name || post.sellerName || tr("unknown_seller", "Unknown Seller")}</div>
              <div className="text-gray-600 text-sm">{tr("phone", "Phone")}: {post.user?.phone || post.sellerPhone || tr("not_available", "N/A")}</div>
              <div className="text-gray-600 text-sm">{tr("location", "Location")}: {post.location}</div>
            </div>
          </div>
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-2 text-gray-500 text-sm">
            <div>{tr("posted", "Posted")}: {post.posted_date ? new Date(post.posted_date).toLocaleString() : tr("not_available", "N/A")}</div>
            <div>{tr("views", "Views")}: {post.views || 0}</div>
            <div>{tr("likes", "Likes")}: {post.likes || 0}</div>
            <div>{tr("inquiries", "Inquiries")}: {post.inquiries || 0}</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PostDetailView;


