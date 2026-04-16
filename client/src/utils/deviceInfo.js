/**
 * Collect comprehensive device and browser information for analytics.
 * @returns {object} Device info snapshot including fingerprint, browser, OS, screen, etc.
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  const browser = parseBrowser(ua);
  const os = parseOS(ua);

  const screen = {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: window.screen.orientation?.type || "unknown",
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };

  const deviceType = getDeviceType(screen.width);
  const touchSupport =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const language = navigator.language || navigator.userLanguage || "en-US";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneOffset = new Date().getTimezoneOffset();

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  const networkInfo = connection
    ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      }
    : null;

  const memoryInfo = navigator.deviceMemory
    ? { deviceMemory: navigator.deviceMemory + "GB" }
    : null;

  const cookiesEnabled = navigator.cookieEnabled;
  const localStorageAvailable = isLocalStorageAvailable();
  const cpuCores = navigator.hardwareConcurrency || null;

  const fingerprint = generateFingerprint({
    ua: ua,
    screen: screen,
    language: language,
    timezone: timezone,
    cpuCores: cpuCores,
    touchSupport: touchSupport,
  });

  return {
    fingerprint: fingerprint,
    userAgent: ua,
    deviceType: deviceType,
    touchSupport: touchSupport,
    cpuCores: cpuCores,
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: screen.pixelRatio,
    viewportWidth: screen.viewportWidth,
    viewportHeight: screen.viewportHeight,
    language: language,
    timezone: timezone,
    timezoneOffset: timezoneOffset,
    networkInfo: networkInfo,
    cookiesEnabled: cookiesEnabled,
    localStorageAvailable: localStorageAvailable,
    memoryInfo: memoryInfo,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Fetch a URL with an abort-controller timeout.
 * @param {string} url
 * @param {object} [options={}]
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5e3) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse the browser name and version from a user-agent string.
 * @param {string} ua
 * @returns {{ name: string, version: string }}
 */
function parseBrowser(ua) {
  const browsers = [
    { name: "Chrome", regex: /Chrome\/(\d+)/ },
    { name: "Firefox", regex: /Firefox\/(\d+)/ },
    { name: "Safari", regex: /Safari\/(\d+)/ },
    { name: "Edge", regex: /Edg\/(\d+)/ },
    { name: "Opera", regex: /OPR\/(\d+)/ },
    { name: "Samsung Browser", regex: /SamsungBrowser\/(\d+)/ },
    { name: "UCBrowser", regex: /UCBrowser\/(\d+)/ },
  ];

  for (const browser of browsers) {
    const match = ua.match(browser.regex);
    if (match) {
      return { name: browser.name, version: match[1] };
    }
  }

  return { name: "Unknown", version: "0" };
}

/**
 * Parse the OS name and version from a user-agent string.
 * @param {string} ua
 * @returns {{ name: string, version: string }}
 */
function parseOS(ua) {
  const systems = [
    { name: "Android", regex: /Android\s*([\d.]+)/ },
    { name: "iOS", regex: /iPhone OS\s*([\d_]+)/ },
    { name: "Windows", regex: /Windows NT\s*([\d.]+)/ },
    { name: "Mac OS", regex: /Mac OS X\s*([\d_]+)/ },
    { name: "Linux", regex: /Linux/ },
    { name: "Chrome OS", regex: /CrOS/ },
  ];

  for (const os of systems) {
    const match = ua.match(os.regex);
    if (match) {
      return { name: os.name, version: match[1]?.replace(/_/g, ".") || "" };
    }
  }

  return { name: "Unknown", version: "" };
}

/**
 * Classify the device type based on screen width.
 * @param {number} width
 * @returns {string}
 */
function getDeviceType(width) {
  if (width < 480) return "mobile";
  if (width < 768) return "phablet";
  if (width < 1024) return "tablet";
  if (width < 1440) return "laptop";
  return "desktop";
}

/**
 * Check whether localStorage is available and functional.
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    const testKey = "__test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Generate a simple hash-based fingerprint from device data.
 * @param {object} data
 * @returns {string}
 */
function generateFingerprint(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

/**
 * Fetch the user's approximate location based on their IP address.
 * @returns {Promise<object|null>} Location data or null on failure.
 */
export async function getIPBasedLocation() {
  try {
    const response = await fetchWithTimeout("https://ipapi.co/json/");
    if (!response.ok) {
      throw new Error("IP lookup failed");
    }

    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("IP lookup returned invalid coordinates");
    }

    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      countryCode: data.country_code,
      latitude: latitude,
      longitude: longitude,
      timezone: data.timezone,
      isp: data.org,
      provider: "ip_lookup",
    };
  } catch (error) {
    console.error("[DeviceInfo] IP lookup failed:", error);
    return null;
  }
}

export default getDeviceInfo;
