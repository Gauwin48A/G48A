import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const FeedPostCard = ({ post }) => {
  const navigate = useNavigate();
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow mb-4 rounded-2xl border border-blue-100 flex flex-col p-0">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-blue-900">{post.title || 'Untitled'}</CardTitle>
        <Badge variant="outline" className="text-xs">Text Post</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-gray-700 mb-2 whitespace-pre-line text-base md:text-lg">
          {post.description || <span className="italic text-gray-400">No description</span>}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Posted by User {post.user_id}</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
        <div className="flex items-center justify-end">
          <button
            className="px-4 py-1 bg-blue-600 text-white rounded text-xs md:text-sm font-medium hover:bg-blue-700"
            onClick={() => navigate(`/post/${post.id || post.post_id}`, { state: { post } })}
          >
            View Details
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedPostCard;
