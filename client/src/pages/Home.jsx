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
      <div className="mhub-page-home min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-[640px] mx-auto px-4 py-10 page-shell page-pad">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-48 bg-emerald-100 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="h-4 w-72 bg-emerald-100 dark:bg-slate-700 rounded-full animate-pulse" />
          </div>
          <div className="home-post-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 keep-cols">
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
      <div className="mhub-page-home min-h-screen mhub-premium-page bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
      <div className="mhub-page-home min-h-screen mhub-premium-page bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
    <div ref={contentRef} className="mp-home min-h-screen overflow-x-hidden" style={{ background: 'var(--mp-color-bg)', paddingBottom: 'calc(var(--mp-nav-height) + 24px)' }}>

      {/* ── Category Quick Access ── */}
      <div style={{ background: 'var(--mp-color-surface)', padding: '12px 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { icon: '📱', label: 'Electronics', path: '/all-posts?category=Electronics' },
            { icon: '👗', label: 'Fashion', path: '/all-posts?category=Fashion' },
            { icon: '🚗', label: 'Vehicles', path: '/all-posts?category=Vehicles' },
            { icon: '🏠', label: 'Home', path: '/all-posts?category=Others' },
            { icon: '⭐', label: 'For You', path: '/for-you' },
            { icon: '📰', label: 'Feed', path: '/feed' },
            { icon: '🏷️', label: 'Deals', path: '/all-posts' },
            { icon: '📂', label: 'All', path: '/category-hub' },
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => navigate(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              <span style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--mp-color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{item.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--mp-color-title)', lineHeight: 1.2, textAlign: 'center' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Spacer ── */}
      <div style={{ height: '8px' }} />

      {/* ── Category Filter Chips ── */}
      <div style={{ background: 'var(--mp-color-surface)', padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button type="button" onClick={() => setActiveCategory("all")} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: activeCategory === 'all' ? 'var(--mp-color-primary)' : 'var(--mp-color-bg)', color: activeCategory === 'all' ? '#fff' : 'var(--mp-color-title)' }}>
            All
          </button>
          {categories.map((cat) => (
            <button key={cat.name} type="button" onClick={() => setActiveCategory(cat.name)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: activeCategory === cat.name ? 'var(--mp-color-primary)' : 'var(--mp-color-bg)', color: activeCategory === cat.name ? '#fff' : 'var(--mp-color-title)' }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section: Trending ── */}
      <div style={{ padding: '16px 12px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mp-color-price)', margin: 0, letterSpacing: '-0.02em' }}>
            {activeCategory === "all" ? "Trending Near You" : activeCategory}
          </h2>
          <button type="button" onClick={() => navigate("/all-posts")} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mp-color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            See all →
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: 'var(--mp-color-muted)', fontSize: '14px', margin: '0 0 12px' }}>
              {searchQuery ? `No results for "${searchQuery}"` : "No listings in this category"}
            </p>
            <button type="button" onClick={() => { setActiveCategory("all"); setSearchQuery(""); }} style={{ color: 'var(--mp-color-primary)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              Show all listings
            </button>
          </div>
        ) : (
          <div className="mhub-product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {filteredPosts.slice(0, 8).map((post) => {
              const image = resolveImage(post.image_url || post.images?.[0] || "");
              return (
                <button
                  key={post.post_id || post.id}
                  type="button"
                  onClick={() => navigate(`/post/${post.post_id || post.id}`)}
                  className="mhub-grid-card"
                  style={{ textAlign: 'left', overflow: 'hidden', border: 'none', cursor: 'pointer' }}
                >
                  <div className="mhub-grid-card-media">
                    <img src={image} alt={post.title || "Listing"} className="mhub-grid-card-img" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/placeholder.svg"; }} />
                  </div>
                  <div className="mhub-grid-card-body">
                    <p className="mhub-grid-card-price">₹{Number(post.price || 0).toLocaleString("en-IN")}</p>
                    <h3 className="mhub-grid-card-title">{post.title || "Untitled"}</h3>
                    <p className="mhub-grid-card-location">{post.location || ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Stats Banner ── */}
      <div style={{ margin: '8px 12px', padding: '14px 16px', background: 'var(--mp-color-surface)', borderRadius: '12px', display: 'flex', justifyContent: 'space-around', boxShadow: 'var(--mp-shadow-card)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mp-color-price)' }}>{posts.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--mp-color-muted)' }}>Listings</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mp-color-price)' }}>{categories.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--mp-color-muted)' }}>Categories</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mp-color-primary)' }}>✓</div>
          <div style={{ fontSize: '12px', color: 'var(--mp-color-muted)' }}>Verified</div>
        </div>
      </div>

      {/* ── Centre Updates ── */}
      {isLoggedIn && <CentreUpdatesFeed className="mt-2 mx-3 mb-2" />}
      {isLoggedIn && <FeaturedCentrePages className="mx-3 mb-4" />}

      {/* ── Back to Top ── */}
      {showBackToTop && (
        <button type="button" onClick={scrollToTop} aria-label="Back to top" style={{ position: 'fixed', bottom: '80px', right: '16px', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--mp-color-primary)', color: '#fff', border: 'none', fontSize: '18px', boxShadow: 'var(--mp-shadow-float)', cursor: 'pointer', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ↑
        </button>
      )}
    </div>
  );
}

