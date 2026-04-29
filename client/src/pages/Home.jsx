import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { getApiOriginBase } from "@/lib/networkConfig";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import FeaturedCentrePages from "@/components/FeaturedCentrePages";
import CentreUpdatesFeed from "@/components/CentreUpdatesFeed";
import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/utils/authStorage";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  useDocumentTitle(t("home_title", { defaultValue: "MHub — Home" }));
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef(null);

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

  const loadPosts = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/posts", {
        params: { page: 1, limit: 8 },
        signal,
      });
      const payload = response?.data ?? response;
      const list = Array.isArray(payload?.posts)
        ? payload.posts
        : Array.isArray(payload)
          ? payload
          : [];
      setPosts(list);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setError(
        err?.message || "Unable to load posts right now.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPosts(controller.signal);
    return () => controller.abort();
  }, [loadPosts]);

  // Back-to-top scroll listener
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Derive categories from posts
  const categories = useMemo(() => {
    const cats = new Map();
    for (const p of posts) {
      const name = p.category_name || p.category || "General";
      cats.set(name, (cats.get(name) || 0) + 1);
    }
    return Array.from(cats.entries()).map(([name, count]) => ({ name, count }));
  }, [posts]);

  // Filter posts by category and search
  const filteredPosts = useMemo(() => {
    let list = posts;
    if (activeCategory !== "all") {
      list = list.filter(
        (p) => (p.category_name || p.category || "General") === activeCategory,
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.category_name || p.category || "").toLowerCase().includes(q) ||
          (p.location || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [posts, activeCategory, searchQuery]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (loading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-[640px] mx-auto px-4 py-10 page-shell page-pad">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-48 bg-emerald-100 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="h-4 w-72 bg-emerald-100 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 keep-cols">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-56 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700 animate-pulse"
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
        <div className="max-w-lg w-full mhub-premium-surface rounded-3xl p-6 text-center">
          <h2 className="text-lg sm:text-2xl font-bold text-rose-700 dark:text-rose-300 mb-2">
            {t("something_went_wrong", { defaultValue: "Something went wrong" })}
          </h2>
          <p className="text-sm text-rose-600 dark:text-rose-300 mb-6">
            {error}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => loadPosts()}>
              {t("reload_page", { defaultValue: "Reload Page" })}
            </Button>
            <Button variant="outline" onClick={() => navigate("/all-posts")}>
              {t("open_all_posts", { defaultValue: "Open All Posts" })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-[640px] mx-auto px-4 py-12 page-shell page-pad">
          <EmptyState
            type="posts"
            title={t("no_posts_yet", { defaultValue: "No Posts Yet" })}
            message={t("be_first_to_list", { defaultValue: "Be the first to create a listing and kickstart the marketplace." })}
            actionLabel={t("open_all_posts", { defaultValue: "Open All Posts" })}
            onAction={() => navigate("/all-posts")}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={contentRef} className="min-h-screen overflow-x-hidden mhub-premium-page nav-clearance bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* ── Heroic Banner ── */}
      <div className="home-hero" data-density="extra">
        <div className="max-w-[640px] mx-auto px-4">
          <p className="home-hero-kicker">
            {t("trust_first_marketplace", { defaultValue: "Trust-First Marketplace" })}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="home-hero-title">
              {t("discover_near_you", { defaultValue: "Discover what is moving near you" })}
            </h1>
            <span className="home-hero-live-badge">⚡ Live</span>
          </div>
          <p className="home-hero-sub">
            {t("home_subtitle", { defaultValue: "Fresh listings, verified sellers, and quick actions." })}
          </p>
        </div>
      </div>

      {/* ── Quick Actions Grid + Stats ── */}
      <div className="max-w-[640px] mx-auto px-3 -mt-5 relative z-10">
        <div className="home-quick-actions">
          <button type="button" className="home-action-card" onClick={() => navigate("/all-posts")}>
            <span className="home-action-icon">🛒</span>
            <span className="home-action-label">Browse All</span>
          </button>
          <button type="button" className="home-action-card" onClick={() => navigate("/for-you")}>
            <span className="home-action-icon">⭐</span>
            <span className="home-action-label">For You</span>
          </button>
          <button type="button" className="home-action-card" onClick={() => navigate("/feed")}>
            <span className="home-action-icon">📰</span>
            <span className="home-action-label">Feed</span>
          </button>
          <button type="button" className="home-action-card" onClick={() => navigate("/rewards")}>
            <span className="home-action-icon">🏆</span>
            <span className="home-action-label">Rewards</span>
          </button>
          <div className="home-hero-stats col-span-4">
            <span className="home-stat">📦 {posts.length} listings</span>
            <span className="home-stat">🏷️ {categories.length} {categories.length === 1 ? 'category' : 'categories'}</span>
            <span className="home-stat">✅ Verified sellers</span>
          </div>
        </div>
      </div>

      {/* ── Sticky Search + Category Bar ── */}
      <div className="home-sticky-bar mhub-premium-bar">
        <div className="max-w-[640px] mx-auto px-3">
          <div className="home-search-row">
            <input
              type="text"
              className="home-search-input"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="home-refresh-btn"
              onClick={() => loadPosts()}
              title="Refresh"
            >
              ↻
            </button>
          </div>
          <div className="home-category-scroll scrollbar-hide">
            <button
              type="button"
              className={`home-category-chip ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              All ({posts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className={`home-category-chip ${activeCategory === cat.name ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-3 pt-2 pb-8 page-shell page-pad">

        {/* ── Section Header ── */}
        <div className="home-section-header">
          <div className="flex items-center gap-2">
            <span className="text-base">🔥</span>
            <h2 className="home-section-title">
              {activeCategory === "all" ? "Trending Near You" : activeCategory}
            </h2>
          </div>
          <span className="home-results-count">
            {filteredPosts.length} {filteredPosts.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* ── Posts Grid ── */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchQuery ? `No results for "${searchQuery}"` : "No listings in this category"}
            </p>
            <button
              type="button"
              className="mt-3 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
              onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
            >
              ← Show all listings
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 keep-cols">
            {filteredPosts.slice(0, 8).map((post) => {
              const image = resolveImage(
                post.image_url || post.images?.[0] || "",
              );
              return (
                <button
                  key={post.post_id || post.id}
                  type="button"
                  onClick={() => navigate(`/post/${post.post_id || post.id}`)}
                  className="group text-left mhub-premium-surface rounded-xl hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={image}
                      alt={post.title || t("listing", { defaultValue: "Listing" })}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/placeholder.svg";
                      }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2">
                      <p className="text-white text-sm font-bold">
                        ₹{Number(post.price || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    {post.category_name && (
                      <span className="absolute top-1.5 right-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full text-gray-700 dark:text-gray-200">
                        {post.category_name}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs line-clamp-1">
                      {post.title ||
                        t("untitled_listing", { defaultValue: "Untitled Listing" })}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      📍 {post.location || "Location N/A"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── View All CTA ── */}
        {filteredPosts.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => navigate("/all-posts")}
              className="home-view-all-btn"
            >
              View All Listings →
            </Button>
          </div>
        )}

        {/* ── Centre Updates (below product grid) ── */}
        {isLoggedIn && <CentreUpdatesFeed className="mt-6 mb-4" />}
        {isLoggedIn && <FeaturedCentrePages className="mb-4" />}
      </div>

      {/* ── Back to Top FAB ── */}
      {showBackToTop && (
        <button
          type="button"
          className="home-back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
