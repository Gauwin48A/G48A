#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://localhost:5001";
const baseUrl =
  process.env.AUTH_VERIFY_BASE_URL ||
  process.env.BASE_URL ||
  DEFAULT_BASE_URL;
const bearerToken = String(process.env.AUTH_VERIFY_TOKEN || "").trim();
const cookieHeader = String(process.env.AUTH_VERIFY_COOKIE || "").trim();

const buildUrl = (path) => `${String(baseUrl).replace(/\/+$/, "")}${path}`;

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return {
    ok: response.ok,
    status: response.status,
    payload,
    headers: response.headers,
  };
};

const requireKeys = (payload, keys) =>
  keys.every((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));

const failures = [];
const log = (message) => process.stdout.write(`${message}\n`);

const run = async () => {
  log(`[auth-verify] Base URL: ${baseUrl}`);

  const anonymous = await fetchJson(buildUrl("/api/auth/session"), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!anonymous.ok) {
    failures.push(`Anonymous /api/auth/session failed (${anonymous.status}).`);
  } else if (
    !requireKeys(anonymous.payload, [
      "authenticated",
      "authState",
      "hasRefreshCookie",
      "hasAccessCookie",
      "canRefresh",
      "requiresReauth",
      "user",
    ])
  ) {
    failures.push("Anonymous /api/auth/session missing required fields.");
  } else {
    log("[auth-verify] Anonymous /api/auth/session OK.");
  }

  const csrf = await fetchJson(buildUrl("/api/auth/csrf-token"), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!csrf.ok || !csrf.payload?.csrfToken) {
    failures.push(
      `CSRF token endpoint failed (${csrf.status}). Expected csrfToken.`,
    );
  } else {
    log("[auth-verify] /api/auth/csrf-token OK.");
  }

  if (bearerToken || cookieHeader) {
    const authHeaders = {
      Accept: "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };

    const authedSession = await fetchJson(buildUrl("/api/auth/session"), {
      method: "GET",
      headers: authHeaders,
    });

    if (!authedSession.ok) {
      failures.push(
        `Authenticated /api/auth/session failed (${authedSession.status}).`,
      );
    } else if (!authedSession.payload?.authenticated) {
      failures.push(
        "Authenticated /api/auth/session did not return authenticated=true.",
      );
    } else {
      log("[auth-verify] Authenticated /api/auth/session OK.");
    }

    const sessionList = await fetchJson(buildUrl("/api/auth/sessions"), {
      method: "GET",
      headers: authHeaders,
    });

    if (!sessionList.ok) {
      failures.push(
        `Authenticated /api/auth/sessions failed (${sessionList.status}).`,
      );
    } else {
      log("[auth-verify] Authenticated /api/auth/sessions OK.");
    }
  } else {
    log(
      "[auth-verify] No AUTH_VERIFY_TOKEN/AUTH_VERIFY_COOKIE provided; skipping authenticated checks.",
    );
  }

  if (failures.length) {
    log("\n[auth-verify] FAILURES:");
    failures.forEach((entry) => log(`- ${entry}`));
    process.exitCode = 1;
    return;
  }

  log("\n[auth-verify] All checks passed.");
};

run().catch((error) => {
  console.error("[auth-verify] Unexpected error:", error);
  process.exitCode = 1;
});
