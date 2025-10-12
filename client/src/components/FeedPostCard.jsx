import React from 'react';

const FeedPostCard = ({ post }) => (
  <div className="border rounded-lg p-4 bg-white shadow">
    <div className="font-semibold text-lg mb-1">{post.title}</div>
    <div className="text-gray-700 mb-2">{post.description}</div>
    <div className="text-xs text-gray-400">Posted by User {post.user_id} on {new Date(post.created_at).toLocaleString()}</div>
  </div>
);

export default FeedPostCard;
