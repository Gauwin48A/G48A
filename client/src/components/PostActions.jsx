
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, Share2, BookmarkPlus, Flag, CheckCircle } from "lucide-react";
import { shareContent } from '@/services/nativeShareService';
import { impactLight } from '@/services/nativeHapticsService';

import { useTranslation } from 'react-i18next';

const PostActions = ({ isLiked = false, isSaved = false }) => {
  const { t } = useTranslation();
  const tr = (key, fallback) => {
    const value = t(key);
    if (typeof value !== "string" || !value.trim() || value === key) {
      return fallback;
    }
    return value;
  };
  const { toast } = useToast();

  const handleLike = () => {
    impactLight();
    toast({
      title: isLiked
        ? tr("removed_from_favorites", "Removed from favorites")
        : tr("added_to_favorites", "Added to favorites"),
      description: isLiked
        ? tr("post_removed_from_favorites", "Post removed from your favorites")
        : tr("post_added_to_favorites", "Post added to your favorites"),
      action: (
        <div className="flex items-center">
          <Heart className={`h-4 w-4 ${isLiked ? 'text-gray-500' : 'text-red-500'}`} />
        </div>
      ),
    });
  };

  const handleShare = async () => {
    impactLight();
    try {
      const result = await shareContent({ title: 'Check this out!', url: window.location.href });
      if (result) return; // Native share succeeded
    } catch {
      // Fall through to clipboard
    }
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: tr("link_copied", "Link copied!"),
      description: tr(
        "post_link_copied",
        "Post link has been copied to clipboard",
      ),
      action: (
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      ),
    });
  };

  const handleSave = () => {
    impactLight();
    toast({
      title: isSaved
        ? tr("removed_from_saved", "Removed from saved")
        : tr("post_saved", "Post saved"),
      description: isSaved
        ? tr("post_removed_from_saved", "Post removed from saved items")
        : tr("post_saved_for_later", "Post saved for later viewing"),
      action: (
        <div className="flex items-center">
          <BookmarkPlus className={`h-4 w-4 ${isSaved ? 'text-gray-500' : 'text-blue-500'}`} />
        </div>
      ),
    });
  };

  const handleReport = () => {
    toast({
      variant: "destructive",
      title: tr("post_reported", "Post reported"),
      description: tr(
        "report_thanks",
        "Thank you for reporting. We'll review this post.",
      ),
      action: (
        <div className="flex items-center">
          <Flag className="h-4 w-4" />
        </div>
      ),
    });
  };

  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide [&>*]:shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
        onClick={handleLike}
      >
        <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        {isLiked ? tr("unlike", "Unlike") : tr("like", "Like")}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {tr("share", "Share")}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
        onClick={handleSave}
      >
        <BookmarkPlus className={`h-4 w-4 mr-2 ${isSaved ? 'fill-blue-500 text-blue-500' : ''}`} />
        {isSaved ? tr("unsave", "Unsave") : tr("save", "Save")}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
        onClick={handleReport}
      >
        <Flag className="h-4 w-4 mr-2" />
        {tr("report", "Report")}
      </Button>
    </div>
  );
};

export default PostActions;
