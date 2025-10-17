import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const FeedPostCard = ({ post }) => {
  const navigate = useNavigate();
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow mb-4">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-semibold">{post.title || 'Untitled'}</CardTitle>
        <Badge variant="outline" className="text-xs">Text Post</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-gray-700 mb-2 whitespace-pre-line">{post.description}</div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Posted by User {post.user_id}</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
        <button
          className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          onClick={() => navigate(`/post/${post.id || post.post_id}`)}
        >
          View Details
        </button>
      </CardContent>
    </Card>
  );
};

export default FeedPostCard;
