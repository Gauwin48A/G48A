import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Share2, Eye, ArrowLeft, Clock, MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { getUserId } from "@/utils/authStorage";
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/page-state/PageStateBlocks";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import SponsoredListings from "@/components/SponsoredListings";
import PremiumRecommendations from "@/components/PremiumRecommendations";

export default function FeedPostDetail() {
  const { t } = useTranslation();
  const tr = useCallback(
    (key, fallback) => {
      const v = t(key, { defaultValue: fallback });
      return typeof v === "string" && v.trim() && v !== key ? v : fallback;
    },
    [t],
  );

  const { id: postId } = useParams();
  const navigate = useNavigate();
  const locationPost = useLocation().state?.post || null;

  const [post, setPost] = useState(locationPost);
  const [isLoading, setIsLoading] = useState(!locationPost);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(Number(locationPost?.likes || 0));
  const [toastMessage, setToastMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const fetchPost = useCallback(
    async (signal) => {
      if (!postId) {
        setPost(null);
        setErrorMessage(tr("post_not_found", "Post not found."));
        setIsLoading(false);
        return;
      }
      if (!locationPost || retryCount > 0) setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await api.get(`/posts/${postId}`, { signal });
        const d = response?.data ?? response;
        const parsed = d?.post || d;
        if (!parsed || typeof parsed !== "object") throw new Error("invalid_payload");
        setPost(parsed);
        setLikesCount(Number(parsed.likes || 0));
      } catch (err) {
        if (signal?.aborted) return;
        // Show a real error state instead of silently falling back to fake demo data
        setPost(null);
        setErrorMessage(
          err?.response?.data?.message ||
            err?.message ||
            tr("feed_post_load_failed", "Unable to load this post. Check your connection and try again."),
        );
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [postId, locationPost, retryCount, tr],
  );

  useEffect(() => {
    if (locationPost && retryCount === 0) {
      setPost(locationPost);
      setLikesCount(Number(locationPost.likes || 0));
      setIsLoading(false);
      setErrorMessage("");
    }
    const ctrl = new AbortController();
    fetchPost(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchPost, locationPost, retryCount]);

  usePageRefresh(useCallback(() => setRetryCount((c) => c + 1), []));

  // Track view
  useEffect(() => {
    if (!postId) return;
    api.post(`/posts/${postId}/view`).catch(() => {});
    const uid = getUserId();
    if (uid) {
      api.post("/recently-viewed/track", { postId, userId: uid, source: "feed" }).catch(() => {});
    }
  }, [postId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleLike = async () => {
    if (!postId) return;
    setIsLiked((prev) => {
      const toggled = !prev;
      setLikesCount((c) => (toggled ? c + 1 : c - 1));
      return toggled;
    });
    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      /* best-effort */
    }
  };

  const handleShare = async () => {
    if (!postId) return;
    const url = `${window.location.origin}/feed/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title || "Post", url });
      } else {
        await navigator.clipboard.writeText(url);
        setToastMessage(tr("link_copied", "Link copied."));
      }
    } catch {
      setToastMessage(tr("unable_to_copy_link", "Unable to copy link."));
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const images = post?.images || post?.image_urls || [];

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen]);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <PageLoadingState
          title={t("loading") || "Loading..."}
          description={tr("feed_post_loading_desc", "Loading the selected feed post.")}
          className="w-full max-w-md page-shell page-pad"
          marker="loading"
        />
      </div>
    );
  }

  /* ---- Error ---- */
  if (errorMessage || !post) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <PageErrorState
          title={tr("post_unavailable_title", "Post unavailable")}
          description={errorMessage || tr("post_removed_hint", "This post may have been removed.")}
          onRetry={() => setRetryCount((c) => c + 1)}
          retryLabel={tr("retry", "Retry")}
          marker="error"
          className="w-full max-w-md page-shell page-pad"
          secondaryAction={
            <Button
              onClick={() => navigate("/feed")}
              variant="outline"
              className="border-indigo-300 text-indigo-700 dark:border-indigo-600/40 dark:text-indigo-300"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              {t("back_to_feed") || "Back to Feed"}
            </Button>
          }
        />
      </div>
    );
  }

  /* ---- Content ---- */
  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gradient-to-b from-emerald-50/30 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Sticky header bar */}
      <div
        className="sticky z-50 mhub-premium-bar shadow-sm"
        style={{ top: "var(--top-nav-height, 60px)" }}
      >
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-4 page-shell page-pad">
          <button
            onClick={() => navigate("/feed")}
            className="flex items-center gap-2 min-w-[2.25rem] min-h-[2.75rem] px-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">{t("back") || "Back"}</span>
          </button>
          <div className="flex-1 text-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {tr("post", "Post")}
            </span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Main card */}
      <div className="max-w-[640px] mx-auto px-4 py-8 page-shell page-pad">
        <Card className="mhub-premium-surface rounded-2xl overflow-hidden">
          {/* Author row */}
          <div className="flex items-center gap-4 p-6 border-b dark:border-gray-800">
            <Avatar className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500">
              <AvatarFallback className="text-white text-xl font-bold">
                {(post.user?.name || post.username || "U")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {post.user?.name || post.username || tr("anonymous", "Anonymous")}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400 text-sm mt-1">
                {post.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {post.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Image gallery — if post has images */}
          {images.length > 0 && (
            <div className="relative w-full bg-gray-100 dark:bg-gray-800">
              <div className="aspect-[16/9] sm:aspect-[4/3] relative overflow-hidden">
                <img
                  src={images[activeImageIdx]}
                  alt={post.title || "Post image"}
                  className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
                  onClick={() => setLightboxOpen(true)}
                  onError={(e) => {
                    e.target.src = `https://placehold.co/600x400/e2e8f0/64748b?text=Image+Not+Available`;
                  }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 rounded-full p-1.5 shadow-md transition-all hover:scale-110"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 rounded-full p-1.5 shadow-md transition-all hover:scale-110"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === activeImageIdx
                          ? "border-indigo-500 ring-2 ring-indigo-500/30"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Post body */}
          <div className="p-6 md:p-8">
            {post.title && (
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                {post.title}
              </h1>
            )}
            <article className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                {post.description || tr("no_content_available", "No content available.")}
              </p>
            </article>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 mhub-premium-bar border-t dark:border-gray-800">
            <div className="flex gap-6">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition font-medium min-h-[44px]"
              >
                <Heart
                  className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
                />
                <span>
                  {likesCount} {tr("likes", "Likes")}
                </span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition font-medium min-h-[44px]"
              >
                <Share2 className="w-4 h-4" />
                <span>{tr("share", "Share")}</span>
              </button>
              <span className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                <Eye className="w-4 h-4" />
                <span>
                  {post.views_count || post.views || 0} {tr("views", "Views")}
                </span>
              </span>
            </div>
          </div>
        </Card>

        {/* ── Suggested posts: Sponsored Listings ── */}
        <div className="mt-10 px-1">
          <SponsoredListings
            currentPostId={postId}
            title={tr("sponsored_listings_title", "Sponsored Listings")}
          />
        </div>

        {/* ── Suggested posts: Premium Recommendations ── */}
        <div className="mt-8 px-1">
          <PremiumRecommendations
            currentPostId={postId}
            title={tr("premium_recommendations_title", "Premium Recommendations")}
          />
        </div>

        <div className="text-center mt-8">
          <Button
            onClick={() => navigate("/feed")}
            variant="outline"
            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-600/40 dark:text-indigo-300 dark:hover:bg-indigo-950/20 px-8"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            {tr("back_to_feed", "Back to Feed")}
          </Button>
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition p-2"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[activeImageIdx]}
              alt={post.title || "Enlarged image"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === activeImageIdx
                        ? "bg-white scale-125"
                        : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
