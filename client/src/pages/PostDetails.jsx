import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '../lib/api';

const PostDetails = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/posts/${postId}`);
        if (res.status === 200 && res.data) {
          setPost(res.data);
          // Increment view count
          await api.post(`/posts/${postId}/view`);
        } else {
          setError(res.data?.error || 'Failed to fetch post details');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch post details');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading post...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center text-gray-500">Post not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="max-w-2xl w-full px-4 py-8">
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900 mb-2">{post.title}</CardTitle>
            <div className="flex gap-2 items-center mb-2">
              <Badge className="bg-blue-100 text-blue-800">{post.category}</Badge>
              <span className="text-gray-600 text-sm">by {post.author}</span>
              <span className="text-gray-400 text-xs ml-2">{new Date(post.created_at).toLocaleString()}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-gray-800 mb-4 whitespace-pre-line">{post.description}</div>
            <div className="flex gap-6 text-xs text-gray-500 mb-2">
              <span>Views: {post.views}</span>
              <span>Likes: {post.likes || 0}</span>
              <span>Comments: {post.comments_count || 0}</span>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded shadow" onClick={() => navigate(-1)}>Back</button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostDetails;
