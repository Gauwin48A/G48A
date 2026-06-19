import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Trash2, RefreshCw, ArrowDown, ExternalLink, Image, Loader2, Tag, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { PageLoadingState, PageErrorState } from "@/components/page-state/PageStateBlocks";
import { useToast } from "@/hooks/use-toast";
import { getApiOriginBase } from "@/lib/networkConfig";

const PriceAlertsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const tr = (key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subscribePostId, setSubscribePostId] = useState("");
  const [subscribeTargetPrice, setSubscribeTargetPrice] = useState("");
  const [subscribeThreshold, setSubscribeThreshold] = useState("10");
  const [subscribing, setSubscribing] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [postSearchResults, setPostSearchResults] = useState([]);
  const [searchingPosts, setSearchingPosts] = useState(false);
  const searchTimeoutRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/price-alerts");
      setAlerts(res.data?.alerts || []);
    } catch (err) {
      setError(err?.message || "Failed to load price alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleUnsubscribe = async (postId) => {
    setActionLoading(postId);
    try {
      await api.put(`/price-alerts/unsubscribe/${postId}`);
      toast({
        title: tr("alert_unsubscribed", "Alert unsubscribed"),
        variant: "default",
      });
      setAlerts((prev) =>
        prev.map((a) =>
          a.post_id === postId ? { ...a, is_active: false } : a
        )
      );
    } catch (err) {
      toast({
        title: tr("unsubscribe_failed", "Failed to unsubscribe"),
        description: err?.response?.data?.error || err?.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubscribe = async () => {
    if (!subscribePostId.trim()) return;
    setSubscribing(true);
    try {
      await api.post("/price-alerts/subscribe", {
        postId: subscribePostId.trim(),
        targetPrice: subscribeTargetPrice ? Number(subscribeTargetPrice) : null,
        percentageThreshold: subscribeThreshold ? Number(subscribeThreshold) : 10,
      });
      toast({
        title: tr("alert_subscribed", "Alert subscribed!"),
        variant: "default",
      });
      setShowSubscribe(false);
      setSubscribePostId("");
      setSubscribeTargetPrice("");
      setSubscribeThreshold("10");
      setPostSearchResults([]);
      fetchAlerts();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "";
      if (msg.includes("not found")) {
        toast({
          title: tr("post_not_found", "Post not found"),
          description: tr("check_post_id", "Please check the post ID and try again."),
          variant: "destructive",
        });
      } else {
        toast({
          title: tr("subscribe_failed", "Failed to subscribe"),
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleSearchPost = useCallback((query) => {
    setPostSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setPostSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingPosts(true);
      try {
        const res = await api.get("/search", { params: { q: query.trim(), limit: 5 } });
        setPostSearchResults(res.data?.posts || res.data?.results || []);
      } catch {
        setPostSearchResults([]);
      } finally {
        setSearchingPosts(false);
      }
    }, 400);
  }, []);

  const handleDelete = async (postId) => {
    setActionLoading(postId);
    try {
      await api.delete(`/price-alerts/${postId}`);
      toast({
        title: tr("alert_deleted", "Alert deleted"),
        variant: "default",
      });
      setAlerts((prev) => prev.filter((a) => a.post_id !== postId));
    } catch (err) {
      toast({
        title: tr("delete_failed", "Failed to delete"),
        description: err?.response?.data?.error || err?.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getImageUrl = (post) => {
    if (!post) return "";
    const raw = post.images?.[0] || post.image_url || "";
    if (!raw) return "";
    return raw.startsWith("http") ? raw : `${getApiOriginBase()}${raw}`;
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return "—";
    const num = Number(price);
    if (isNaN(num)) return "—";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <PageLoadingState
          title={tr("loading_alerts", "Loading alerts...")}
          description={tr("fetching_price_alerts", "Fetching your price drop alerts.")}
          marker="price-alerts-loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen mhub-premium-page bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <PageErrorState
          title={tr("alerts_unavailable", "Price alerts unavailable")}
          description={error}
          marker="price-alerts-error"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen mhub-premium-page nav-clearance bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[640px] mx-auto px-4 py-6 space-y-6 page-shell page-pad">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {tr("price_alerts_title", "Price Alerts")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSubscribe(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {tr("subscribe", "Subscribe")}
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchAlerts} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {tr("refresh", "Refresh")}
            </Button>
          </div>
        </div>

        {/* Subscribe Form */}
        {showSubscribe && (
          <Card className="rounded-xl p-4 border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-blue-800 dark:text-blue-200">
                {tr("new_alert", "New Price Alert")}
              </h3>
              <button
                onClick={() => { setShowSubscribe(false); setPostSearchResults([]); }}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Post search */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {tr("find_post", "Find a post")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={tr("search_post_placeholder", "Search by title or paste post ID...")}
                  value={postSearchQuery}
                  onChange={(e) => handleSearchPost(e.target.value)}
                  className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {searchingPosts && (
                  <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
              {postSearchResults.length > 0 && (
                <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 max-h-40 overflow-y-auto">
                  {postSearchResults.map((post) => (
                    <button
                      key={post.post_id || post.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onClick={() => {
                        setSubscribePostId(post.post_id || post.id);
                        setPostSearchQuery(post.title || "");
                        setPostSearchResults([]);
                      }}
                    >
                      <span className="font-medium">{post.title}</span>
                      <span className="text-gray-400 ml-2">₹{Number(post.price || 0).toLocaleString("en-IN")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Post ID (hidden if post selected from search) */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {tr("post_id", "Post ID")}
              </label>
              <input
                type="text"
                placeholder="e.g. abc123"
                value={subscribePostId}
                onChange={(e) => setSubscribePostId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  {tr("target_price", "Target Price (₹)")}
                </label>
                <input
                  type="number"
                  placeholder={tr("optional", "Optional")}
                  value={subscribeTargetPrice}
                  onChange={(e) => setSubscribeTargetPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  {tr("drop_percent", "Drop %")}
                </label>
                <input
                  type="number"
                  placeholder="10"
                  value={subscribeThreshold}
                  onChange={(e) => setSubscribeThreshold(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={subscribing || !subscribePostId.trim()}
              className="w-full gap-2"
            >
              {subscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {tr("create_alert", "Create Alert")}
            </Button>
          </Card>
        )}

        {alerts.length === 0 ? (
          <Card className="rounded-2xl p-10 text-center border-dashed">
            <BellOff className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              {tr("no_alerts_title", "No price alerts")}
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs mx-auto">
              {tr("no_alerts_desc", "Subscribe to price drops on items you're interested in and get notified when prices fall.")}
            </p>
            <Button onClick={() => navigate("/all-posts")} className="gap-2">
              <Tag className="w-4 h-4" />
              {tr("browse_listings", "Browse listings")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const imageUrl = getImageUrl(alert);
              const isActive = alert.is_active !== false;
              const isLoadingAction = actionLoading === alert.post_id;

              return (
                <Card
                  key={alert.alert_id}
                  className={`rounded-xl overflow-hidden border ${
                    isActive
                      ? "border-gray-200 dark:border-gray-700"
                      : "border-gray-100 dark:border-gray-800 opacity-60"
                  }`}
                >
                  <div className="flex gap-3 p-4">
                    {/* Post Image */}
                    <div
                      className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/post/${alert.post_id}`)}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={alert.title || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Image className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Alert Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => navigate(`/post/${alert.post_id}`)}
                          >
                            {alert.title || tr("unknown_item", "Unknown item")}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{tr("current", "Current")}: {formatPrice(alert.current_price)}</span>
                            {alert.target_price !== null && (
                              <>
                                <ArrowDown className="w-3 h-3 text-red-400" />
                                <span className="text-red-500 dark:text-red-400">
                                  {tr("target", "Target")}: {formatPrice(alert.target_price)}
                                </span>
                              </>
                            )}
                          </div>
                          {alert.percentage_threshold && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {tr("threshold", "Threshold")}: {alert.percentage_threshold}% drop
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                          }`}
                        >
                          {isActive ? tr("active", "Active") : tr("paused", "Paused")}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {tr("created", "Created")}: {formatDate(alert.created_at)}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          onClick={() => navigate(`/post/${alert.post_id}`)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {tr("view", "View")}
                        </Button>
                        {isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-700 dark:text-orange-400"
                            onClick={() => handleUnsubscribe(alert.post_id)}
                            disabled={isLoadingAction}
                          >
                            {isLoadingAction ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <BellOff className="w-3 h-3" />
                            )}
                            {tr("unsubscribe", "Unsubscribe")}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => handleDelete(alert.post_id)}
                          disabled={isLoadingAction}
                        >
                          {isLoadingAction ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          {tr("delete", "Delete")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Price threshold bar */}
                  {alert.target_price !== null && alert.current_price !== null && (
                    <div className="px-4 pb-3">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            Number(alert.current_price) <= Number(alert.target_price)
                              ? "bg-green-500"
                              : "bg-blue-400"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (Number(alert.target_price) / Number(alert.current_price)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        <span>{tr("target_price", "Target")}</span>
                        <span>{tr("current_price", "Current")}</span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceAlertsPage;
