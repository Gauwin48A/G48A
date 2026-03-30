import { getApiRootUrl } from "@/lib/networkConfig";

const PRECHECK_TIMEOUT_MS = Number.parseInt(
  import.meta.env.VITE_BACKEND_PREFLIGHT_TIMEOUT_MS || "3500",
  10,
);
const BACKUP_PROBE_STAGGER_MS = Number.parseInt(
  import.meta.env.VITE_BACKEND_PREFLIGHT_STAGGER_MS || "75",
  10,
);

// Keep default dev probing strict to the expected local backend port.
// Additional fallback origins can be supplied via VITE_BACKEND_PREFLIGHT_ORIGINS.
const DEFAULT_LOCAL_DEV_BACKEND_ORIGINS = ["http://localhost:5001"];
const LOCAL_DEV_BACKEND_ORIGINS = Array.from(
  new Set(
    [
      ...DEFAULT_LOCAL_DEV_BACKEND_ORIGINS,
      ...String(import.meta.env.VITE_BACKEND_PREFLIGHT_ORIGINS || "")
        .split(",")
        .map((origin) => String(origin || "").trim()),
    ]
      .map((origin) => normalize(origin))
      .filter(Boolean),
  ),
);

const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Preflight timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function toAbsoluteUrl(url) {
  if (!url.startsWith("/")) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return `${window.location.origin}${url}`;
}

function isLocalhostRuntime() {
  return (
    typeof window !== "undefined" && LOCALHOST_HOSTNAMES.has(window.location.hostname)
  );
}

function getCandidateHealthUrls() {
  const apiRootUrl = normalize(getApiRootUrl());
  const candidates = [`${apiRootUrl}/health`];

  if (isLocalhostRuntime()) {
    LOCAL_DEV_BACKEND_ORIGINS.forEach((origin) => {
      candidates.push(`${origin}/api/health`);
    });
  }

  const seen = new Set();
  return candidates
    .map((candidate) => normalize(candidate))
    .filter(Boolean)
    .filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return true;
    });
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksLikeMhubHealth(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.status !== "ok") return false;
  return (
    Object.prototype.hasOwnProperty.call(payload, "db") ||
    Object.prototype.hasOwnProperty.call(payload, "time")
  );
}

function getApiOriginFromHealthUrl(url) {
  try {
    const parsed = new URL(toAbsoluteUrl(url));
    return normalize(parsed.origin);
  } catch {
    return "";
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function probeHealthUrl(healthUrl) {
  try {
    const response = await withTimeout(
      fetch(healthUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),
      PRECHECK_TIMEOUT_MS,
    );

    const bodyText = await response.text();
    const payload = parseJsonSafe(bodyText);

    if (!response.ok) {
      return {
        ok: false,
        failure: {
          healthUrl,
          status: response.status,
          bodyText,
        },
      };
    }

    if (!looksLikeMhubHealth(payload)) {
      return {
        ok: false,
        failure: {
          healthUrl,
          status: response.status,
          bodyText: bodyText || "Unexpected health payload",
        },
      };
    }

    const resolvedOrigin = getApiOriginFromHealthUrl(healthUrl);
    if (typeof window !== "undefined" && resolvedOrigin) {
      window.__MHUB_API_ORIGIN_OVERRIDE__ = resolvedOrigin;
    }

    return {
      ok: true,
      healthUrl,
      resolvedOrigin,
    };
  } catch (error) {
    return {
      ok: false,
      failure: {
        healthUrl,
        status: null,
        bodyText: error?.message || String(error),
      },
    };
  }
}

function promiseAnyFallback(promises) {
  return new Promise((resolve, reject) => {
    let pending = promises.length;
    const errors = [];

    if (pending === 0) {
      reject(new Error("No promises provided"));
      return;
    }

    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(resolve)
        .catch((error) => {
          errors[index] = error;
          pending -= 1;
          if (pending === 0) {
            reject(errors);
          }
        });
    });
  });
}

async function firstSuccessfulProbe(probePromises) {
  if (typeof Promise.any === "function") {
    return Promise.any(probePromises);
  }
  return promiseAnyFallback(probePromises);
}

export async function runBackendPreflight() {
  const candidateUrls = getCandidateHealthUrls();
  const failuresByUrl = new Map();

  const probePromises = candidateUrls.map((healthUrl, index) =>
    (async () => {
      if (index > 0 && BACKUP_PROBE_STAGGER_MS > 0) {
        await wait(index * BACKUP_PROBE_STAGGER_MS);
      }
      return probeHealthUrl(healthUrl);
    })().then((result) => {
      if (result.ok) {
        return result;
      }

      failuresByUrl.set(healthUrl, result.failure);
      throw result.failure;
    }),
  );

  try {
    return await firstSuccessfulProbe(probePromises);
  } catch {
    const preferredFailure =
      candidateUrls.map((url) => failuresByUrl.get(url)).find(Boolean) || {
        healthUrl: candidateUrls[0] || "/api/health",
        status: null,
        bodyText: "Backend preflight failed",
      };

    return {
      ok: false,
      failure: preferredFailure,
    };
  }
}
