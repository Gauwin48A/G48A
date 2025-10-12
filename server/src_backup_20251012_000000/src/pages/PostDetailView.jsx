import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const PostDetailView = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${baseUrl}/api/posts/${postId}`);
        if (!res.ok) throw new Error('Failed to fetch post details');
        const data = await res.json();
        setPost(data.post || data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch post details');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  if (!post) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-xl font-semibold text-gray-800 mb-4">Post not found</div>
      <Button className="bg-blue-600 text-white" onClick={() => navigate('/allposts')}>Back to All Posts</Button>
    </div>
  );

  return (
    <div className="bg-white min-h-screen flex flex-col items-center py-8">
      <div className="w-full max-w-3xl mx-auto">
        <Button className="mb-4" onClick={() => navigate(-1)}>Back</Button>
        <Card className="rounded-2xl shadow-lg p-6 flex flex-col gap-4">
          {/* Images */}
          <div className="w-full flex gap-4 overflow-x-auto mb-4">
            {post.images && post.images.length > 0 ? post.images.map((img, idx) => (
              <img key={idx} src={img} alt={post.title} className="h-56 w-56 object-cover rounded-xl border" />
            )) : (
              <div className="h-56 w-56 bg-gray-100 flex items-center justify-center rounded-xl text-gray-400">No Image</div>
            )}
          </div>
          {/* Title, Category, Price */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold text-blue-900 mb-1">{post.title}</h1>
              <div className="text-gray-600 text-base mb-1">Category: <span className="font-semibold">{post.category}</span></div>
              <div className="text-gray-600 text-base mb-1">Status: <span className="font-semibold">{post.status}</span></div>
            </div>
            <div className="text-2xl font-black text-green-600">₹{post.price}</div>
          </div>
          {/* Description */}
          <div className="text-lg text-gray-800 mb-2">
            <span className="font-semibold">Description:</span> {post.description || <span className="italic text-gray-400">No description</span>}
          </div>
          {/* Seller Info */}
          <div className="flex items-center gap-4 bg-blue-50 rounded-xl p-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback>{post.user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-blue-900">{post.user?.name || post.sellerName || 'Unknown Seller'}</div>
              <div className="text-gray-600 text-sm">Phone: {post.user?.phone || post.sellerPhone || 'N/A'}</div>
              <div className="text-gray-600 text-sm">Location: {post.location}</div>
            </div>
          </div>
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-2 text-gray-500 text-sm">
            <div>Posted: {post.posted_date ? new Date(post.posted_date).toLocaleString() : 'N/A'}</div>
            <div>Views: {post.views || 0}</div>
            <div>Likes: {post.likes || 0}</div>
            <div>Inquiries: {post.inquiries || 0}</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PostDetailView;
