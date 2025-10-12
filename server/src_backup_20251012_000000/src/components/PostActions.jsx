
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, Share2, BookmarkPlus, Flag, CheckCircle, AlertCircle } from "lucide-react";

interface PostActionsProps {
  postId: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

const PostActions = ({ postId, isLiked = false, isSaved = false }: PostActionsProps) => {
  const { toast } = useToast();

  const handleLike = () => {
    toast({
      title: isLiked ? "Removed from favorites" : "Added to favorites",
      description: isLiked ? "Post removed from your favorites" : "Post added to your favorites",
      action: (
        <div className="flex items-center">
          <Heart className={`h-4 w-4 ${isLiked ? 'text-gray-500' : 'text-red-500'}`} />
        </div>
      ),
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Post link has been copied to clipboard",
      action: (
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      ),
    });
  };

  const handleSave = () => {
    toast({
      title: isSaved ? "Removed from saved" : "Post saved",
      description: isSaved ? "Post removed from saved items" : "Post saved for later viewing",
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
      title: "Post reported",
      description: "Thank you for reporting. We'll review this post.",
      action: (
        <div className="flex items-center">
          <Flag className="h-4 w-4" />
        </div>
      ),
    });
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handleLike}>
        <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        {isLiked ? 'Unlike' : 'Like'}
      </Button>
      
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      
      <Button variant="outline" size="sm" onClick={handleSave}>
        <BookmarkPlus className={`h-4 w-4 mr-2 ${isSaved ? 'fill-blue-500 text-blue-500' : ''}`} />
        {isSaved ? 'Unsave' : 'Save'}
      </Button>
      
      <Button variant="outline" size="sm" onClick={handleReport}>
        <Flag className="h-4 w-4 mr-2" />
        Report
      </Button>
    </div>
  );
};

export default PostActions;
