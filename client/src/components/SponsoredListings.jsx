import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const PROMO_BADGE_COLORS = {
  Spotlight:       "bg-orange-500 text-white",
  Featured:        "bg-purple-500 text-white",
  Boosted:         "bg-emerald-500 text-white",
  "Premium Seller":"bg-yellow-500 text-black",
  Promoted:        "bg-blue-500 text-white",
  Listing:         "bg-gray-400 text-white",
};

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return "₹ N/A";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SponsoredListings({ excludePostId, category }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ limit: "6" });
    if (excludePostId) params.set("excludePostId", String(excludePostId));
    if (category) params.set("category", String(category));

    api.get(`/api/posts/sponsored?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.posts) ? res.posts : Array.isArray(res) ? res : [];
        setPosts(list);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [excludePostId, category]);

  if (!loading && posts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sponsored Listings</h3>
        <span className="text-[10px] bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Ad</span>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {[1, 2, 3].map((k) => (
            <div key={k} className="flex-shrink-0 w-36 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {posts.map((post) => {
            const imgSrc = resolveMediaUrl(
              Array.isArray(post.images) ? post.images[0] : post.images,
              "/placeholder.svg",
            );
            const badge = post.promo_label || "Promoted";
            const badgeClass = PROMO_BADGE_COLORS[badge] || PROMO_BADGE_COLORS.Promoted;
            return (
              <Link
                key={post.post_id}
                to={`/post/${post.post_id}`}
                className="flex-shrink-0 w-36 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 hover:shadow-md transition-shadow group"
              >
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                  <img
                    src={imgSrc}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(ev) => { ev.target.src = "/placeholder.svg"; }}
                  />
                  <span className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                    {badge}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 dark:text-white line-clamp-2 leading-tight">
                    {post.title}
                  </p>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">
                    {formatPrice(post.price)}
                  </p>
                  {post.location && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{post.location}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
