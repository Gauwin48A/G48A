import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AUTH_EVENT_NAME = "mhub:auth-required";
const SECURITY_EVENT_NAME = "mhub:security-lockout";

function buildReturnTo(location) {
  const path = `${location.pathname || ""}${location.search || ""}${location.hash || ""}`.trim();
  return path && path !== "/login" ? path : "/all-posts";
}

export default function AuthEventRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onAuthRequired = (event) => {
      const redirectTo = event?.detail?.redirectTo || "/login?expired=true";
      if (location.pathname === "/login") {
        return;
      }
      navigate(redirectTo, {
        replace: true,
        state: {
          returnTo: buildReturnTo(location),
        },
      });
    };

    const onSecurityLockout = (event) => {
      const redirectTo = event?.detail?.redirectTo || "/security";
      if (location.pathname === redirectTo) {
        return;
      }
      navigate(redirectTo, { replace: true });
    };

    window.addEventListener(AUTH_EVENT_NAME, onAuthRequired);
    window.addEventListener(SECURITY_EVENT_NAME, onSecurityLockout);

    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, onAuthRequired);
      window.removeEventListener(SECURITY_EVENT_NAME, onSecurityLockout);
    };
  }, [location, navigate]);

  return null;
}
