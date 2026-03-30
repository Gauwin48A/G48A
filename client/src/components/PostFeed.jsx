import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

const PostFeed = ({ posts, onView }) => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col items-center mb-10">
      <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4">{t('all_posts')}</h2>
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
        {posts.length === 0 ? (
          <div className="col-span-full text-center text-blue-400">{t('no_posts_available')}</div>
        ) : (
          posts.map(post => (
            <Card key={post.id} className="rounded-2xl shadow bg-white dark:bg-slate-800 border-0 flex flex-col p-4">
              <div className="flex items-center gap-4 mb-2">
                <Avatar>
                  <AvatarFallback>{post.user?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-bold text-blue-700 text-lg truncate">{post.user?.name || "Unknown"}</div>
                  <div className="flex flex-wrap items-center gap-2 text-blue-600 text-sm">
                    <span>{post.category}</span>
                    {post.subcategory_name || post.subcategory || post.subcategoryName ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {post.subcategory_name || post.subcategory || post.subcategoryName}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">{post.status || "STANDARD"}</Badge>
              </div>
              <div className="w-full h-48 bg-gray-100 dark:bg-slate-700 rounded mb-3 flex items-center justify-center">
                {/* Placeholder for post image/content */}
                <span className="text-gray-400 dark:text-gray-500">{t("image_placeholder")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="bg-blue-600 text-white rounded px-4 py-1 text-sm font-medium" onClick={() => onView(post.id)}>{t('view')}</button>
                {/* Like, Comment buttons can be added here */}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PostFeed;
