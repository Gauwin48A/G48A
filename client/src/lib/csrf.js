import { buildApiPath } from "@/lib/networkConfig";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const CSRF_MAX_RETRIES = 3;
let csrfBootstrapPromise = null;
let csrfBootstrapRetryCount = 0;

const getCookieValue = (name) => {
  if (typeof document === "undefined") {
    return "";
  }
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookieParts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of cookieParts) {
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }
  return "";
};

export const getCsrfToken = () => getCookieValue(CSRF_COOKIE_NAME);

export async function ensureCsrfTokenCookie() {
  if (getCsrfToken()) {
    csrfBootstrapRetryCount = 0;
    return true;
  }

  if (csrfBootstrapRetryCount >= CSRF_MAX_RETRIES) {
    return false;
  }

  if (!csrfBootstrapPromise) {
    const endpoint = buildApiPath("/auth/csrf-token");
    csrfBootstrapPromise = fetch(endpoint, {
      method: "GET",
      credentials: "include",
    })
      .then(() => {
        csrfBootstrapRetryCount = 0;
        return Boolean(getCsrfToken());
      })
      .catch(() => {
        csrfBootstrapRetryCount += 1;
        return false;
      })
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }

  return csrfBootstrapPromise;
}

export async function buildCsrfHeaders() {
  await ensureCsrfTokenCookie();
  const token = getCsrfToken();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
