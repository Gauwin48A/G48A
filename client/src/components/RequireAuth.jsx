import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

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
    return (
      <Navigate
        to={`${redirectTo}${queryJoiner}returnTo=${encodeURIComponent(returnTo)}`}
        replace
        state={{ returnTo }}
      />
    );
  }

  if (!hasAllowedRole(user, requiredRoles)) {
    return <Navigate to="/all-posts" replace />;
  }

  return children;
}
