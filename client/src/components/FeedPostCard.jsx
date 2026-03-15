import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

const FeedPostCard = memo(function FeedPostCard({ post }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleViewDetails = useCallback(() => {
    navigate(`/post/${post.id || post.post_id}`, { state: { post } });
  }, [navigate, post]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow mb-4 rounded-2xl border border-blue-100 flex flex-col p-0">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-semibold text-blue-900">
          {post.title || t("post_untitled")}
        </CardTitle>
        <Badge variant="outline" className="text-xs">{t("text_post")}</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-gray-700 mb-2 whitespace-pre-line text-base md:text-lg">
          {post.description || <span className="italic text-gray-400">{t("no_description")}</span>}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>{t("posted_by_user", { userId: post.user_id })}</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
        <div className="flex items-center justify-end">
          <button
            className="h-7 px-3 bg-blue-600 text-white rounded text-[10px] sm:h-8 sm:text-xs md:text-sm font-medium hover:bg-blue-700"
            onClick={handleViewDetails}
          >
            {t("view_details")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
});

export default FeedPostCard;
