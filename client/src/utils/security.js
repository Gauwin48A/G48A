import i18n from "@/i18n";
import { requestSoftReload } from "@/utils/softReload";

const DEFENSE_MODE_FLAG = "__mhub_defense_mode_active__";
const DEFENSE_MODE_INTERVAL_KEY = "__mhub_defense_mode_interval__";
const ENABLE_DEBUGGER_TRAP =
  import.meta.env.VITE_ENABLE_DEFENSE_DEBUGGER_TRAP === "true";
const SOFT_RELOAD_COOLDOWN_MS = 30 * 1000;
let lastSoftReloadAt = 0;
const ALLOWED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "10.0.2.2",
  "mhub-mini.vercel.app",
  "mhub-app.vercel.app",
];

export const isAuthorizedHostname = (
  hostname,
  allowedDomains = ALLOWED_DOMAINS,
) => {
  if (!hostname || typeof hostname !== "string") return false;
  const normalizedHostname = hostname.trim().toLowerCase();
  if (!normalizedHostname) return false;
  return allowedDomains.some((domain) => {
    const normalizedDomain = String(domain).trim().toLowerCase();
    if (!normalizedDomain) return false;
    return (
      normalizedHostname === normalizedDomain ||
      normalizedHostname.endsWith(`.${normalizedDomain}`)
    );
  });
};

export const activateDefenseMode = () => {
  if (import.meta.env.DEV) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[DEFENSE_MODE_FLAG]) return;
  window[DEFENSE_MODE_FLAG] = true;
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "F12") {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && ["I", "J", "C", "K"].includes(e.key.toUpperCase())) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "u") {
      e.preventDefault();
      return false;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      return false;
    }
  });
  if (ENABLE_DEBUGGER_TRAP && !window[DEFENSE_MODE_INTERVAL_KEY]) {
    window[DEFENSE_MODE_INTERVAL_KEY] = setInterval(() => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        const now = Date.now();
        if (now - lastSoftReloadAt > SOFT_RELOAD_COOLDOWN_MS) {
          lastSoftReloadAt = now;
          requestSoftReload({
            title: "Security check triggered",
            description: "Refresh to continue securely.",
          });
        }
      }
    }, 2000);
  }
  console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold;");
  console.log("This is a protected area. Access is monitored.");
};

export const checkDomainLock = () => {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  if (!isAuthorizedHostname(window.location.hostname)) {
    console.error("[Security] Unauthorized domain detected.");
    return false;
  }
  return true;
};

export const detectDevTools = () => {
  if (typeof window === "undefined") return false;
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  return widthThreshold || heightThreshold;
};

const getSecurityAlertCopy = () => {
  const translate = (key, fallback) => {
    const value = i18n?.t ? i18n.t(key) : "";
    if (typeof value !== "string" || !value.trim() || value === key) {
      return fallback;
    }
    return value;
  };

  return {
    title: translate("security_alert_title", "Security Alert"),
    message: translate(
      "security_alert_message",
      "This application is not authorized to run on this domain.\nPlease access MHub through the official website.",
    ),
  };
};

export const initializeSecurity = () => {
  if (import.meta.env.DEV) {
    console.log("[Security] Development mode - security measures disabled");
    return;
  }
  if (!checkDomainLock()) {
    const { title, message } = getSecurityAlertCopy();
    const container = document.createElement("div");
    container.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#1a1a1a;color:#ff4444;font-family:system-ui,sans-serif;text-align:center;padding:20px;";
    const h1 = document.createElement("h1");
    h1.style.cssText = "font-size:2rem;margin-bottom:1rem;";
    h1.textContent = title;
    const p = document.createElement("p");
    p.style.cssText = "color:#888;max-width:400px;white-space:pre-line;";
    p.textContent = message;
    container.appendChild(h1);
    container.appendChild(p);
    document.body.innerHTML = "";
    document.body.appendChild(container);
    throw new Error("Security Violation: Domain Mismatch");
  }
  activateDefenseMode();
};

export default initializeSecurity;
