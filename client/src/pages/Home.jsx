import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { getApiOriginBase } from "@/lib/networkConfig";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import FeaturedCentrePages from "@/components/FeaturedCentrePages";
import CentreUpdatesFeed from "@/components/CentreUpdatesFeed";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isLoggedIn = useMemo(() => isAuthenticated(user), [user]);
  const apiOrigin = useMemo(() => getApiOriginBase(), []);

  const resolveImage = useCallback(
    (value) => {
      if (!value) return "/placeholder.svg";
      if (value.startsWith("http")) return value;
      if (value.startsWith("/")) return `${apiOrigin}${value}`;
      return value;
    },
    [apiOrigin],
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/posts", {
        params: { page: 1, limit: 8 },
      });
      const payload = response?.data ?? response;
      const list = Array.isArray(payload?.posts)
        ? payload.posts
        : Array.isArray(payload)
          ? payload
          : [];
      setPosts(list);
    } catch (err) {
      setError(err?.message || "Unable to load posts right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { document.title = "MHub — Home"; return () => { document.title = "MHub"; }; }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  if (loading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-10 page-shell page-pad">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-48 bg-emerald-100 dark:bg-slate-700 rounded-full animate-pulse dark:bg-emerald-950/20" />
            <div className="h-4 w-72 bg-emerald-100 dark:bg-slate-700 rounded-full animate-pulse dark:bg-emerald-950/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-56 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700 animate-pulse dark:bg-slate-900/60 dark:border dark:border-emerald-600/40"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-lg w-full mhub-premium-surface rounded-3xl p-6 text-center dark:text-center">
          <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-200 mb-2 dark:text-2xl dark:text-rose-300">
            Something went wrong
          </h2>
          <p className="text-sm text-rose-600 dark:text-rose-300 mb-6 dark:text-sm">
            {error}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={loadPosts}>Reload Page</Button>
            <Button variant="outline" onClick={() => navigate("/all-posts")}>
              Open All Posts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-12 page-shell page-pad">
          <EmptyState
            type="posts"
            title="No Posts Yet"
            message="Be the first to create a listing and kickstart the marketplace."
            actionLabel="Open All Posts"
            onAction={() => navigate("/all-posts")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10 page-shell page-pad">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="uppercase tracking-[0.3em] text-xs text-emerald-500 dark:text-emerald-300 dark:text-xs">
              Trust-First Marketplace
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white dark:text-3xl dark:md:text-4xl dark:text-gray-100">
              Discover what is moving near you
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-lg dark:text-sm dark:text-gray-200">
              Fresh listings, verified sellers, and quick actions. Browse the
              latest posts or jump into curated discovery.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/all-posts")}>Open All Posts</Button>
            <Button variant="outline" onClick={() => navigate("/for-you")}>
              For You
            </Button>
          </div>
        </div>

        {isLoggedIn && <CentreUpdatesFeed className="mb-8" />}
        {isLoggedIn && <FeaturedCentrePages className="mb-8" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {posts.slice(0, 8).map((post) => {
            const image = resolveImage(
              post.image_url || post.images?.[0] || "",
            );
            return (
              <button
                key={post.post_id || post.id}
                type="button"
                onClick={() => navigate(`/post/${post.post_id || post.id}`)}
                className="group text-left mhub-premium-surface rounded-2xl hover:shadow-lg transition-all overflow-hidden dark:text-left"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={image}
                    alt={post.title || "Listing"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/placeholder.svg";
                    }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent dark:bg-gradient-to-t" />
                  <div className="absolute bottom-3 left-3">
                    <p className="text-white text-lg font-semibold dark:text-white dark:text-lg">
                      INR {Number(post.price || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-2 dark:text-gray-100 dark:text-base">
                    {post.title || "Untitled Listing"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 dark:text-xs dark:text-gray-300">
                    {post.category_name || post.category || "General"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 dark:text-xs dark:text-gray-300">
                    {post.location || "Location not specified"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
