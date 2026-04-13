import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Eye,
  ShoppingCart,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Crown,
  ShieldCheck,
  Lock,
  Download,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getApiOriginBase } from "@/lib/networkConfig";

const API_BASE = (() => {
  const base = String(getApiOriginBase()).replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
})();

async function fetchJSON(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const PLAN_BADGES = {
  premium: { label: "Premium", icon: Crown, color: "bg-amber-500 text-white" },
  silver: { label: "Silver", icon: ShieldCheck, color: "bg-gray-400 text-white" },
};

function StatCard({ title, value, icon: Icon, trend, color = "text-blue-600", bg = "bg-blue-50" }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {trend >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div className={`${bg} p-3 rounded-lg`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionFunnel({ funnel }) {
  if (!funnel) return null;
  const steps = [
    { label: "Views", value: funnel.views, rate: null },
    { label: "Inquiries", value: funnel.inquiries, rate: funnel.viewToInquiryRate },
    { label: "Offers", value: funnel.offers, rate: funnel.inquiryToOfferRate },
    { label: "Sales", value: funnel.sales, rate: funnel.offerToSaleRate },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          {steps.map((step) => (
            <div key={step.label} className="flex-1 text-center">
              <div
                className="bg-blue-500/20 rounded-t mx-auto transition-all"
                style={{
                  height: `${Math.max(20, (step.value / Math.max(steps[0].value, 1)) * 120)}px`,
                  width: "60%",
                }}
              />
              <p className="text-xs font-medium mt-1">{step.label}</p>
              <p className="text-sm font-bold">{step.value.toLocaleString()}</p>
              {step.rate !== null && (
                <p className="text-[10px] text-muted-foreground">{step.rate}%</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <Badge variant="secondary" className="text-xs">
            Overall: {funnel.overallConversionRate}% conversion
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function TopListings({ listings }) {
  if (!listings?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Performing Listings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {listings.slice(0, 5).map((listing) => (
          <div
            key={listing.post_id}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {listing.title || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {listing.category_name || "General"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {listing.views || 0}
              </span>
              <span>
                {listing.boost_level > 0 && (
                  <Badge variant="outline" className="text-[10px]">Boosted</Badge>
                )}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const plan = useMemo(
    () => user?.current_plan || user?.tier || "basic",
    [user],
  );
  const isEligible = plan === "silver" || plan === "premium";

  const loadData = useCallback(async () => {
    if (!isEligible) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [statsRes, listingsRes] = await Promise.all([
        fetchJSON("/seller-analytics/stats"),
        fetchJSON("/seller-analytics/listings-performance?period=30d"),
      ]);
      setStats(statsRes.stats);
      setListings(listingsRes.listings || []);

      if (plan === "premium") {
        const funnelRes = await fetchJSON("/seller-analytics/conversion").catch(() => null);
        if (funnelRes?.funnel) setFunnel(funnelRes.funnel);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isEligible, plan]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportCSV = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/seller-analytics/export?period=30d`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "listings-30d.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  if (!isEligible) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">Seller Dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Silver or Premium to unlock analytics, conversion
            tracking, and performance insights for your listings.
          </p>
          <Button variant="outline" className="mt-3" size="sm" asChild>
            <a href="/tier-selection">View Plans</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading seller analytics...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={loadData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planBadge = PLAN_BADGES[plan];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Seller Analytics
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-1 text-xs"
          >
            {exporting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Export CSV
          </Button>
          {planBadge && (
            <Badge className={planBadge.color}>
              <planBadge.icon className="h-3 w-3 mr-1" />
              {planBadge.label}
            </Badge>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Active Listings"
            value={stats.activeListings}
            icon={TrendingUp}
            bg="bg-blue-50"
            color="text-blue-600"
          />
          <StatCard
            title="Total Views"
            value={stats.totalViews?.toLocaleString()}
            icon={Eye}
            bg="bg-purple-50"
            color="text-purple-600"
          />
          <StatCard
            title="Sales"
            value={stats.completedSales}
            icon={ShoppingCart}
            bg="bg-green-50"
            color="text-green-600"
          />
          <StatCard
            title="Revenue"
            value={`₹${stats.totalRevenue?.toLocaleString()}`}
            icon={DollarSign}
            bg="bg-amber-50"
            color="text-amber-600"
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <TopListings listings={listings} />
        {funnel && <ConversionFunnel funnel={funnel} />}
      </div>

      {stats && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Inquiries</p>
                <p className="text-lg font-bold">{stats.totalInquiries}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Likes</p>
                <p className="text-lg font-bold">{stats.totalLikes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-lg font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
