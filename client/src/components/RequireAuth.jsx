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
    return fallback || null;
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
        <div className="page-shell page-pad py-16">
          <PageAuthGateState
            title="Authentication Required"
            description="Please log in to continue."
            primaryAction={
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate(loginTarget)}
              >
                Go to Login
              </Button>
            }
            secondaryAction={
              <Button variant="outline" onClick={() => navigate("/all-posts")}>
                Browse Marketplace
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
