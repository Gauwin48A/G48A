import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const PostFeed = ({ posts, onView }) => (
  <div className="w-full flex flex-col items-center mb-10">
    <h2 className="text-2xl font-bold text-blue-800 mb-4">All Posts</h2>
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {posts.length === 0 ? (
        <div className="col-span-full text-center text-blue-400">No posts available right now.</div>
      ) : (
        posts.map(post => (
          <Card key={post.id} className="rounded-2xl shadow bg-white border-0 flex flex-col p-4">
            <div className="flex items-center gap-4 mb-2">
              <Avatar>
                <AvatarFallback>{post.user?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-bold text-blue-700 text-lg truncate">{post.user?.name || "Unknown"}</div>
                <div className="text-blue-600 text-sm">{post.category}</div>
              </div>
              <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">{post.status || "STANDARD"}</Badge>
            </div>
            <div className="w-full h-48 bg-gray-100 rounded mb-3 flex items-center justify-center">
              {/* Placeholder for post image/content */}
              <span className="text-gray-400">Image</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-blue-600 text-white rounded px-4 py-1 text-sm font-medium" onClick={() => onView(post.id)}>View</button>
              {/* Like, Comment buttons can be added here */}
            </div>
          </Card>
        ))
      )}
    </div>
  </div>
);

export default PostFeed;
