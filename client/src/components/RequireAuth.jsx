import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { PageAuthGateState } from "@/components/page-state/PageStateBlocks";

const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const buildReturnTo = (location) => {
  if (!location) return "/all-posts";
  const path = `${location.pathname || ""}${location.search || ""}${location.hash || ""}`.trim();
  return path && path !== "/login" ? path : "/all-posts";
};

const hasAllowedRole = (user, requiredRoles = []) => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const role = normalizeRole(user?.role || user?.userRole || user?.user_role);
  if (!role) return false;
  const allowed = new Set(requiredRoles.map(normalizeRole));
  return allowed.has(role);
};

const AUTH_GATE_CONTENT = {
  "/rewards": {
    title: "Sign in to view Rewards",
    description: "Earn points and redeem exclusive rewards by signing in to your account.",
    highlights: ["Earn coins faster", "Redeem member perks", "Track your streaks"],
    tone: "rewards",
    backgroundClass:
      "from-fuchsia-50 via-violet-50 to-rose-100 dark:from-slate-950 dark:via-fuchsia-950/25 dark:to-slate-950",
    primaryClassName: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
    secondaryClassName:
      "border-fuchsia-200 text-fuchsia-800 hover:bg-fuchsia-50 dark:border-fuchsia-500/40 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900/30",
  },
  "/profile": {
    title: "Sign in to view your Profile",
    description: "Manage your listings, settings, and account details after signing in.",
    highlights: ["Edit listings", "Update preferences", "Build buyer trust"],
    tone: "profile",
    backgroundClass:
      "from-cyan-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-cyan-950/25 dark:to-slate-950",
    primaryClassName: "bg-cyan-600 hover:bg-cyan-700 text-white",
    secondaryClassName:
      "border-cyan-200 text-cyan-800 hover:bg-cyan-50 dark:border-cyan-500/40 dark:text-cyan-200 dark:hover:bg-cyan-900/30",
  },
  "/dashboard": {
    title: "Sign in to access your Dashboard",
    description: "Track your activity, manage posts, and view analytics after signing in.",
    highlights: ["Activity insights", "Post performance", "Revenue overview"],
    tone: "profile",
    backgroundClass:
      "from-sky-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950/25 dark:to-slate-950",
    primaryClassName: "bg-blue-600 hover:bg-blue-700 text-white",
    secondaryClassName:
      "border-blue-200 text-blue-800 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-900/30",
  },
  "/notifications": {
    title: "Sign in to view Notifications",
    description: "Stay updated on replies and activity in your account.",
    highlights: ["Offer updates", "Message alerts", "Security notices"],
    tone: "notifications",
    backgroundClass:
      "from-sky-50 via-cyan-50 to-emerald-100 dark:from-slate-950 dark:via-sky-950/25 dark:to-slate-950",
    primaryClassName: "bg-sky-600 hover:bg-sky-700 text-white",
    secondaryClassName:
      "border-sky-200 text-sky-800 hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-sky-900/30",
  },
  "/cart": {
    title: "Sign in to view your Cart",
    description: "Your saved items are waiting - sign in to continue.",
    highlights: ["Saved items", "Faster checkout", "Price drop alerts"],
    tone: "wishlist",
    backgroundClass:
      "from-rose-50 via-pink-50 to-orange-100 dark:from-slate-950 dark:via-rose-950/25 dark:to-slate-950",
    primaryClassName: "bg-rose-600 hover:bg-rose-700 text-white",
    secondaryClassName:
      "border-rose-200 text-rose-800 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30",
  },
  "/wishlist": {
    title: "Sign in to view your Wishlist",
    description: "Save favorites and get notified when prices change.",
    highlights: ["Save favorites", "Deal alerts", "One-tap checkout"],
    tone: "wishlist",
    backgroundClass:
      "from-rose-50 via-pink-50 to-fuchsia-100 dark:from-slate-950 dark:via-rose-950/25 dark:to-slate-950",
    primaryClassName: "bg-rose-600 hover:bg-rose-700 text-white",
    secondaryClassName:
      "border-rose-200 text-rose-800 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30",
  },
  "/tier-selection": {
    title: "Sign in to manage your Plan",
    description: "Choose the right plan and unlock premium visibility.",
    highlights: ["Compare plans", "Unlock boosts", "Manage billing"],
  },
  "/feedback": {
    title: "Sign in to share Feedback",
    description: "Help us improve the experience with your feedback.",
    highlights: ["Report issues", "Suggest features", "Track responses"],
  },
  "/complaints": {
    title: "Sign in to file Complaints",
    description: "Report issues and track the resolution status.",
    highlights: ["File complaints", "Track status", "Secure support"],
  },
  "/verification": {
    title: "Sign in to verify your Account",
    description: "Verify your identity to unlock trusted selling.",
    highlights: ["Verify identity", "Unlock trust badge", "Access full features"],
  },
  "/nearby": {
    title: "Sign in to view Nearby",
    description: "Discover listings around your location after signing in.",
    highlights: ["Local listings", "Distance filters", "Instant chats"],
  },
  "/security": {
    title: "Authentication Required",
    description: "Please sign in to manage security settings and active sessions.",
    highlights: ["Protect your account", "Manage sessions", "Enable 2FA"],
    badge: "Authentication Required",
    primaryLabel: "Go to Login",
    secondaryLabel: "Browse Marketplace",
  },
};

const getGateContent = (pathname) => {
  const match = Object.keys(AUTH_GATE_CONTENT).find((k) => pathname.startsWith(k));
  const defaults = {
    title: "Sign in to continue",
    description: "This page requires an account. Sign in or create one to proceed.",
    highlights: ["Secure sign-in", "Personalized experience", "Sync across devices"],
    badge: "Account Required",
    primaryLabel: "Sign In",
    secondaryLabel: "Browse Marketplace",
    tone: "default",
    backgroundClass:
      "from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950",
    primaryClassName: "bg-blue-600 hover:bg-blue-700 text-white",
    secondaryClassName:
      "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800",
    cardClassName:
      "mx-auto w-full max-w-[640px] border-white/70 bg-white/88 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/76",
  };
  return match
    ? { ...defaults, ...AUTH_GATE_CONTENT[match] }
    : defaults;
};

export default function RequireAuth({
  children,
  redirectTo = "/login",
  requiredRoles = [],
  fallback = null,
}) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const authed = Boolean(isAuthenticated ?? user);
  const returnTo = buildReturnTo(location);

  if (loading) {
    if (typeof fallback === "function") {
      return fallback({ returnTo, loading: true });
    }
    if (fallback) return fallback;
    // Show a minimal skeleton instead of null to prevent blank screens
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!authed) {
    if (typeof fallback === "function") {
      return fallback({ returnTo });
    }
    if (fallback) {
      return fallback;
    }
    const queryJoiner = redirectTo.includes("?") ? "&" : "?";
    const loginTarget = `${redirectTo}${queryJoiner}returnTo=${encodeURIComponent(returnTo)}`;
    const {
      title,
      description,
      highlights,
      badge,
      primaryLabel,
      secondaryLabel,
      tone,
      backgroundClass,
      primaryClassName,
      secondaryClassName,
      cardClassName,
    } = getGateContent(location.pathname);
    return (
      <div className={`min-h-screen mhub-premium-page bg-gradient-to-br ${backgroundClass}`}>
        <div className="page-shell page-pad min-h-[calc(100dvh-5rem)] flex items-start sm:items-center justify-center py-10 sm:py-12">
          <PageAuthGateState
            title={title}
            description={description}
            badge={badge}
            highlights={highlights}
            tone={tone}
            className={cardClassName}
            primaryAction={
              <Button className={primaryClassName} onClick={() => navigate(loginTarget)}>
                {primaryLabel}
              </Button>
            }
            secondaryAction={
              <Button
                variant="outline"
                className={secondaryClassName}
                onClick={() => navigate("/all-posts")}
              >
                {secondaryLabel}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!hasAllowedRole(user, requiredRoles)) {
    return <Navigate to="/all-posts" replace />;
  }

  return children;
}
