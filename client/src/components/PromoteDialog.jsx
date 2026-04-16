import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PostBoostPanel from "@/components/PostBoostPanel";

export default function PromoteDialog({
  open,
  onOpenChange,
  postId,
  postTitle,
}) {
  const title = useMemo(() => {
    if (postTitle && String(postTitle).trim()) {
      return `Promote "${String(postTitle).trim()}"`;
    }
    return "Promote listing";
  }, [postTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose Boost, Featured, or Spotlight to increase visibility.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            Differences
          </div>
          <div>Boost: 7 days, higher in search + feeds.</div>
          <div>Featured: 14 days, stronger priority + Featured badge.</div>
          <div>Spotlight: 30 days, top placement + Spotlight badge.</div>
          <div className="mt-2">
            Sponsored listings = boosted posts. Premium listings = Premium-tier sellers.
          </div>
        </div>
        <PostBoostPanel postId={postId} />
      </DialogContent>
    </Dialog>
  );
}
