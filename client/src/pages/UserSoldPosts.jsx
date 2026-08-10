import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Star, Shield, AlertTriangle, ShoppingBag, MessageSquare, RefreshCw } from "lucide-react";
import { navigateBack } from "@/utils/navigation";
import api from "@/services/api";

const StarRating = ({ rating = 0, maxStars = 5, size = "sm" }) => {
  const starSize = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          className={`${starSize} ${
            i < Math.round(rating)
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </span>
  );
};

const UserSoldPosts = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const tr = useCallback(
    (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options }),
    [t],
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [allCategories, setAllCategories] = useState([]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const categoryParam = selectedCategory !== "all" ? `?category=${encodeURIComponent(selectedCategory)}` : "";
      const response = await api.get(`/sales/user/${userId}/sold-posts${categoryParam}`);
      if (response.data?.success) {
        setData(response.data);
        // Persist the full category list when fetching unfiltered data,
        // so the filter buttons remain visible even when a filter returns 0 results
        if (selectedCategory === "all" && response.data?.sold_posts?.length) {
          const cats = new Set();
          response.data.sold_posts.forEach((item) => {
            if (item.category) cats.add(item.category);
          });
          setAllCategories(Array.from(cats).sort());
        }
      } else {
        setError(response.data?.error || "Failed to load seller info");
      }
    } catch (err) {
      console.error("[UserSoldPosts] Error:", err);
      setError(err?.response?.data?.error || err?.message || "Failed to load seller data");
    } finally {
      setLoading(false);
    }
  }, [userId, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Categories are persisted from the unfiltered ("all") API response,
  // so filter buttons remain visible even when a category filter returns 0 results.

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "—";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getTrustBadgeColor = (badge) => {
    if (!badge) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    if (badge.includes("GOLD") || badge.includes("🛡️"))
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    if (badge.includes("VERIFIED") || badge.includes("✅"))
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
    if (badge.includes("RISK") || badge.includes("⚠️"))
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md text-center p-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-bold mb-2">{tr("invalid_user", "Invalid User")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {tr("user_id_required", "A valid user ID is required to view this page.")}
          </p>
          <Button onClick={() => navigate("/all-posts")}>
            {tr("browse_posts", "Browse Posts")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigateBack(navigate, "/all-posts")}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={tr("back", "Back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {data?.seller_name
                ? tr("seller_sold_posts", "{{name}}'s Sold Posts", { name: data.seller_name })
                : tr("user_posts", "User's Sold Posts")}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tr("loading_seller_info", "Loading seller information...")}
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card className="text-center p-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-bold mb-2">{tr("load_error", "Could not load data")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {tr("retry", "Retry")}
            </Button>
          </Card>
        )}

        {/* Seller Trust Passport Header */}
        {!loading && data && (
          <>
            <Card className="overflow-hidden border-0 shadow-md">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-white/50 shadow-lg">
                    {data.avatar_url ? (
                      <img src={data.avatar_url} alt={data.seller_name} className="w-full h-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-emerald-700 text-white text-xl font-bold">
                        {(data.seller_name || "S").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold truncate">{data.seller_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {data.is_kyc_verified && (
                        <Badge className="bg-emerald-200/30 text-emerald-100 border-emerald-300/30 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          {tr("kyc_verified", "KYC Verified")}
                        </Badge>
                      )}
                      <Badge className="bg-white/20 text-white border-white/20 text-xs">
                        {data.total_sold || 0} {tr("sales", "Sales")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                {/* Trust Score */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {tr("trust_score", "Trust Score")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                            data.trust_score >= 75
                              ? "bg-emerald-500"
                              : data.trust_score >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${data.trust_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{data.trust_score || 0}/100</span>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs px-3 py-1.5 rounded-full border ${getTrustBadgeColor(data.trust_badge)}`}
                  >
                    {data.trust_badge || tr("normal_trust", "Normal Trust")}
                  </Badge>
                </div>

                {/* Average Rating */}
                {data.average_rating > 0 && (
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-1">
                      <StarRating rating={data.average_rating} size="lg" />
                      <span className="text-lg font-bold ml-1">{Number(data.average_rating).toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {data.star_string || ""}
                    </span>
                  </div>
                )}

                {/* Category Filter */}
                {allCategories.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      {tr("filter_by_category", "Filter by Category")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          selectedCategory === "all"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {tr("all", "All")}
                      </button>
                      {allCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            selectedCategory === cat
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sold Posts List */}
                <div className="space-y-3 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {tr("sold_items", "Sold Items")}
                    <span className="text-gray-400 font-normal ml-1">
                      ({data.sold_posts?.length || 0})
                    </span>
                  </h3>

                  {(!data.sold_posts || data.sold_posts.length === 0) ? (
                    <div className="text-center py-8">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      {data.message && (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                          {data.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {selectedCategory !== "all"
                          ? tr("no_sold_in_category", "No sold items in this category")
                          : tr("no_sold_items", "No sold items yet")}
                      </p>
                    </div>
                  ) : (
                    data.sold_posts.map((item, idx) => (
                      <Card key={item.sale_id || item.post_id || idx} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Post Image */}
                            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              {item.post_images?.[0] ? (
                                <img
                                  src={item.post_images[0]}
                                  alt={item.post_title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            {/* Post Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {item.post_title || tr("untitled", "Untitled")}
                              </h4>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {formatCurrency(item.post_price)}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {item.category && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    {item.category}
                                  </Badge>
                                )}
                                {item.sale_date && (
                                  <span>{formatDate(item.sale_date)}</span>
                                )}
                              </div>

                              {/* Buyer Rating & Review */}
                              <div className="mt-2 space-y-1">
                                {item.buyer_rating ? (
                                  <div className="flex items-center gap-1">
                                    <StarRating rating={item.buyer_rating} />
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 ml-1">
                                      {item.rating_stars || `${item.buyer_rating}/5`}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                    {tr("not_rated", "Not yet rated")}
                                  </span>
                                )}
                                {item.buyer_comment && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                                    &ldquo;{item.buyer_comment}&rdquo;
                                  </p>
                                )}
                                {item.buyer_name && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    — {item.buyer_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* View Post Button */}
                          {item.post_id && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/post/${item.post_id}`)}
                                className="text-xs h-8 rounded-lg"
                              >
                                {tr("view_post", "View Post")}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Seller Stats Summary */}
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {data.total_sold || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tr("total_sales", "Total Sales")}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {data.average_rating ? Number(data.average_rating).toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tr("avg_rating", "Avg Rating")}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {data.trust_score || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {tr("trust_score_short", "Trust Score")}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default UserSoldPosts;
