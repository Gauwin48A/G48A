import React, { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { getApiOriginBase } from "@/lib/networkConfig";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const API_BASE = (() => {
  const base = String(getApiOriginBase()).replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
})();

const BADGE_CONFIG = {
  crown: { icon: Crown, label: "Premium", color: "text-amber-500" },
  verified: { icon: ShieldCheck, label: "Silver", color: "text-gray-500" },
  seller: { icon: Sparkles, label: "Bronze", color: "text-orange-400" },
};

function formatPrice(price) {
  if (!price && price !== 0) return "";
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function getFirstImage(images) {
  if (!images) return null;
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed[0] : images;
    } catch {
      return images;
    }
  }
  if (Array.isArray(images)) return images[0];
  return null;
}

const RecommendationCard = memo(function RecommendationCard({ post }) {
  const image = resolveMediaUrl(getFirstImage(post.images), "/placeholder.svg");
  const badge = BADGE_CONFIG[post.badge_type];

  return (
    <Link
      to={`/post/${post.post_id}`}
      className="block group"
    >
      <Card className="overflow-hidden h-full transition-shadow hover:shadow-md">
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          {badge && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-[10px] gap-1 bg-white/90 backdrop-blur-sm">
                <badge.icon className={`h-3 w-3 ${badge.color}`} />
                {badge.label}
              </Badge>
            </div>
          )}
          {post.boost_level > 0 && (
            <div className="absolute top-2 left-2">
              <Badge className="text-[10px] bg-amber-500 text-white">
                Featured
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
            {post.title || "Untitled"}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-bold text-primary">
              {formatPrice(post.price)}
            </span>
            <span className="text-[11px] text-muted-foreground truncate ml-2">
              {post.seller_name}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

/**
 * Premium Recommendations section for post detail pages.
 * Shows 3-5 premium/silver/bronze listings from the same category.
 * @param {{ postId: string, limit?: number }} props
 */
export default function PremiumRecommendations({ postId, limit = 5 }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `${API_BASE}/posts/${postId}/premium-recommendations?limit=${limit}`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled && data.recommendations?.length) {
          setRecommendations(data.recommendations);
        }
      } catch {
        // Silently fail — this is an enhancement, not critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [postId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recommendations.length) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-base font-semibold">Recommended Premium Listings</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {recommendations.map((post) => (
          <RecommendationCard key={post.post_id} post={post} />
        ))}
      </div>
    </div>
  );
}
