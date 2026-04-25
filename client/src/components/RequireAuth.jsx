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
  },
  "/profile": {
    title: "Sign in to view your Profile",
    description: "Manage your listings, settings, and account details after signing in.",
    highlights: ["Edit listings", "Update preferences", "Build buyer trust"],
  },
  "/dashboard": {
    title: "Sign in to access your Dashboard",
    description: "Track your activity, manage posts, and view analytics after signing in.",
    highlights: ["Activity insights", "Post performance", "Revenue overview"],
  },
  "/notifications": {
    title: "Sign in to view Notifications",
    description: "Stay updated on replies and activity in your account.",
    highlights: ["Offer updates", "Message alerts", "Security notices"],
  },
  "/cart": {
    title: "Sign in to view your Cart",
    description: "Your saved items are waiting — sign in to continue.",
    highlights: ["Saved items", "Faster checkout", "Price drop alerts"],
  },
  "/wishlist": {
    title: "Sign in to view your Wishlist",
    description: "Save favorites and get notified when prices change.",
    highlights: ["Save favorites", "Deal alerts", "One-tap checkout"],
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
    const { title, description, highlights, badge, primaryLabel, secondaryLabel } =
      getGateContent(location.pathname);
    return (
      <div className="min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="page-shell page-pad py-16">
          <PageAuthGateState
            title={title}
            description={description}
            badge={badge}
            highlights={highlights}
            primaryAction={
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate(loginTarget)}
              >
                {primaryLabel}
              </Button>
            }
            secondaryAction={
              <Button variant="outline" onClick={() => navigate("/all-posts")}>
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
