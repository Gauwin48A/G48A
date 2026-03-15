import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "../lib/api";

import { useTranslation } from "react-i18next";
import { navigateBack } from "@/utils/navigation";

const PostDetails = () => {
  const { t } = useTranslation();
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
          setError(res.data?.error || "Failed to fetch post details");
        }
      } catch (err) {
        setError(err.message || "Failed to fetch post details");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-2xl w-full px-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={() => navigateBack(navigate)}>{t("back", "Back")}</Button>
        </div>
      </div>
    );
  if (!post)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">{t("post_not_found", "Post not found.")}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center">
      <div className="max-w-2xl w-full px-4 py-8">
        <Card className="shadow-lg border-0 dark:border-gray-700 rounded-2xl overflow-hidden mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-2">
              {post.title}
            </CardTitle>
            <div className="flex gap-2 items-center mb-2">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {post.category}
              </Badge>
              <span className="text-gray-600 dark:text-gray-400 text-sm">{t("by", "by")} {post.author}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-line">
              {post.description}
            </div>
            <div className="flex gap-6 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <span>{t("views", "Views")}: {post.views}</span>
              <span>{t("likes", "Likes")}: {post.likes || 0}</span>
              <span>{t("comments", "Comments")}: {post.comments_count || 0}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => navigateBack(navigate)}
            >
              {t("back", "Back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostDetails;
