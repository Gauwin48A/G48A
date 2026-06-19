import React, { useEffect, useRef, useState } from "react";
import FAB from "@/components/FAB";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import BackToTop from "@/components/BackToTop";
import SmartEmptyState from "@/components/SmartEmptyState";
import PageSkeleton from "@/components/PageSkeleton";
import PageTopBar from "@/components/PageTopBar";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { Button } from "@/components/ui/button";

/**
 * PageEnhancer — HOC wrapper that injects missing UX layers into any page component.
 * Works even with minified children by observing DOM attributes.
 *
 * @param {{ children, config: PageConfig }} props
 *
 * PageConfig shape:
 * {
 *   name: string,            // page identifier
 *   fab?: { icon, label?, to?, onClick? },
 *   cta?: { label, icon?, to?, onClick?, variant? } | React.ReactNode,
 *   skeleton?: "list" | "dashboard" | "form" | "detail",
 *   emptyType?: string,      // SmartEmptyState type
 *   backToTop?: boolean,     // show BackToTop pill
 *   onRefresh?: () => void,  // override pull-to-refresh handler
 * }
 */
export default function PageEnhancer({ children, config = {} }) {
  const containerRef = useRef(null);
  const [childState, setChildState] = useState("content"); // "loading" | "empty" | "error" | "content"

  // Pull-to-refresh — default triggers page reload, config.onRefresh overrides
  usePageRefresh(config.onRefresh || null);

  // Observe child DOM for data-ux-state changes (emitted by PageStateBlocks)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const detectState = () => {
      const el = container.querySelector("[data-ux-state]");
      if (el) {
        const state = el.getAttribute("data-ux-state");
        if (state === "loading" || state === "empty" || state === "error") {
          setChildState(state);
          return;
        }
      }
      setChildState("content");
    };

    detectState();

    const observer = new MutationObserver(detectState);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-ux-state"],
    });

    return () => observer.disconnect();
  }, []);

  // Determine what overlays to show
  const showSkeleton = childState === "loading" && config.skeleton;
  const showEmpty = childState === "empty" && config.emptyType;

  return (
    <div ref={containerRef} className="page-enhanced" data-page={config.name}>
      {/* Sticky top bar (injected for pages missing app_shell) */}
      {config.topBar && <PageTopBar {...config.topBar} />}

      {/* Page content */}
      <div className={showSkeleton ? "opacity-0 absolute pointer-events-none" : undefined}>
        {children}
      </div>

      {/* Skeleton overlay */}
      {showSkeleton && (
        <div className="content-enter">
          <PageSkeleton variant={config.skeleton} />
        </div>
      )}

      {/* Smart empty state override */}
      {showEmpty && (
        <div className="content-enter">
          <SmartEmptyState type={config.emptyType} />
        </div>
      )}

      {/* FAB */}
      {config.fab && <FAB {...config.fab} />}

      {/* Sticky CTA */}
      {config.cta && typeof config.cta === "object" && !React.isValidElement(config.cta) && (
        <StickyBottomCTA>
          <Button
            className="flex-1 min-h-[48px] rounded-xl gap-2 font-semibold"
            onClick={config.cta.onClick}
          >
            {config.cta.icon && <config.cta.icon className="w-4 h-4" />}
            {config.cta.label}
          </Button>
        </StickyBottomCTA>
      )}
      {config.cta && React.isValidElement(config.cta) && config.cta}

      {/* Back to top */}
      {config.backToTop && <BackToTop />}
    </div>
  );
}

// ─── Per-page configuration map ────────────────────────────────────────────────
// These are referenced by route path in App.jsx

import { Plus, PenLine, Search, Download, Trash2, ArrowLeft, CheckCheck, Sparkles, Hash, Store, Package, ShoppingBag, Activity, Globe, Grid3X3, Layers, ArrowLeftRight, Star, MessageSquare, ThumbsUp, Bookmark, FileText, Gift, Eye, Undo2, Receipt } from "lucide-react";

export const PAGE_CONFIGS = {
  "all-posts": { name: "all-posts", skeleton: "list", emptyType: "search", backToTop: true },
  "category-hub": { name: "category-hub", skeleton: "list", backToTop: true, topBar: { title: "Categories", icon: Grid3X3 } },
  "for-you": { name: "for-you", skeleton: "list", emptyType: "search", backToTop: true },
  "public-wall": { name: "public-wall", skeleton: "list", emptyType: "feed", backToTop: true },
  "feed": { name: "feed", skeleton: "list", emptyType: "feed", backToTop: true, fab: { icon: <Plus className="w-5 h-5" />, label: "Post", to: "/add-post" } },
  "my-feed": { name: "my-feed", skeleton: "list", emptyType: "feed", backToTop: true, fab: { icon: <Plus className="w-5 h-5" />, label: "New Post", to: "/add-post" } },
  "search": { name: "search", skeleton: "list", emptyType: "search", backToTop: true },
  "channels": { name: "channels", skeleton: "list", emptyType: "feed", fab: { icon: <Plus className="w-5 h-5" />, to: "/channels/create" } },
  "channels-detail": { name: "channels-detail", skeleton: "detail", emptyType: "feed", backToTop: true },
  "centre": { name: "centre", skeleton: "list", emptyType: "feed", fab: { icon: <Plus className="w-5 h-5" />, to: "/centre/create" } },
  "centre-detail": { name: "centre-detail", skeleton: "detail", emptyType: "feed", backToTop: true },
  "centre-listings": { name: "centre-listings", skeleton: "list", backToTop: true },
  "nearby": { name: "nearby", skeleton: "list", emptyType: "search", backToTop: true },

  // Commerce
  "wishlist": { name: "wishlist", skeleton: "list", emptyType: "wishlist", backToTop: true },
  "cart": { name: "cart", skeleton: "list", emptyType: "cart" },
  "recently-viewed": { name: "recently-viewed", skeleton: "list", emptyType: "recently-viewed", backToTop: true },
  "offers": { name: "offers", skeleton: "list", emptyType: "search" },
  "saved-searches": { name: "saved-searches", skeleton: "list", emptyType: "saved-searches", fab: { icon: <Search className="w-5 h-5" />, label: "New Search", to: "/search" } },

  // Seller
  "my-posts": { name: "my-posts", skeleton: "list", emptyType: "sold-posts", fab: { icon: <Plus className="w-5 h-5" />, label: "New Post", to: "/add-post" } },
  "sold-posts": { name: "sold-posts", skeleton: "list", emptyType: "sold-posts", backToTop: true, fab: { icon: <Plus className="w-5 h-5" />, label: "List New", to: "/add-post" } },
  "bought-posts": { name: "bought-posts", skeleton: "list", emptyType: "bought-posts", backToTop: true, fab: { icon: <Search className="w-5 h-5" />, label: "Browse", to: "/all-posts" } },
  "saledone": { name: "saledone", skeleton: "list" },
  "saleundone": { name: "saleundone", skeleton: "list" },

  // Account
  "dashboard": { name: "dashboard", skeleton: "dashboard", backToTop: true },
  "profile": { name: "profile", skeleton: "dashboard", fab: { icon: <PenLine className="w-5 h-5" />, label: "Edit", to: "/profile" } },
  "my-home": { name: "my-home", skeleton: "dashboard" },
  "wallet": { name: "wallet", skeleton: "dashboard", backToTop: true },
  "price-alerts": { name: "price-alerts", skeleton: "list", emptyType: "search", backToTop: true },
  "analytics": { name: "analytics", skeleton: "dashboard", backToTop: true },
  "activity": { name: "activity", skeleton: "list", backToTop: true },
  "notifications": { name: "notifications", skeleton: "list", emptyType: "notifications", backToTop: true, cta: { label: "Mark All Read", icon: CheckCheck } },
  "rewards": { name: "rewards", skeleton: "dashboard", backToTop: true },
  "security": { name: "security", skeleton: "list" },
  "verification": { name: "verification", skeleton: "form" },
  "kyc": { name: "kyc", skeleton: "form" },
  "complaints": { name: "complaints", skeleton: "list", emptyType: "search", fab: { icon: <PenLine className="w-5 h-5" />, label: "New Complaint" } },
  "feedback": { name: "feedback", skeleton: "list", emptyType: "search", fab: { icon: <PenLine className="w-5 h-5" />, label: "New Feedback" } },

  // Content/detail
  "post-detail": { name: "post-detail", skeleton: "detail", backToTop: true },
  "feed-detail": { name: "feed-detail", skeleton: "detail", backToTop: true },
  "reviews": { name: "reviews", skeleton: "list", emptyType: "reviews", fab: { icon: <PenLine className="w-5 h-5" />, label: "Write Review" } },
  "compare": { name: "compare", skeleton: "list", emptyType: "search", fab: { icon: <Search className="w-5 h-5" />, label: "Add Items", to: "/all-posts" } },

  // Creation
  "add-post": { name: "add-post", skeleton: "form" },
  "edit-post": { name: "edit-post", skeleton: "form" },
  "channels-create": { name: "channels-create", skeleton: "form" },
  "centre-create": { name: "centre-create", skeleton: "form" },

  // Legal
  "terms": { name: "terms", backToTop: true },
  "privacy-policy": { name: "privacy-policy", backToTop: true },
  "refund-policy": { name: "refund-policy", backToTop: true },
  "support-ticket-policy": { name: "support-ticket-policy", backToTop: true, topBar: { title: "Support Ticket Policy", icon: FileText } },

  // Auth (handled by AuthShell, minimal config)
  "login": { name: "login" },
  "signup": { name: "signup" },
  "forgot-password": { name: "forgot-password" },
  "reset-password": { name: "reset-password" },
  "invite": { name: "invite" },

  // Misc
  "buyer-view": { name: "buyer-view", skeleton: "detail", topBar: { title: "Buyer View", icon: Eye, backTo: "/" } },
  "account-delete": { name: "account-delete" },
  "aadhaar-verify": { name: "aadhaar-verify", skeleton: "form" },
  "payment": { name: "payment", skeleton: "form" },
  "tier-selection": { name: "tier-selection", skeleton: "list" },
  "chat": { name: "chat", skeleton: "list", emptyType: "chat" },
  "admin-panel": { name: "admin-panel", skeleton: "dashboard" },
  "not-found": { name: "not-found" },
  "categories": { name: "categories", skeleton: "list", backToTop: true, topBar: { title: "Categories", icon: Grid3X3 } },
  "subcategories": { name: "subcategories", skeleton: "list", backToTop: true, topBar: { title: "Subcategories", icon: Layers } },
};
