/**
 * Device Fingerprinting Utility
 * Captures browser, OS, screen, and device info for analytics
 * Similar to e-commerce/banking apps
 */

/**
 * Get comprehensive device information
 */
export function getDeviceInfo() {
    const ua = navigator.userAgent;

    // Parse browser
    const browser = parseBrowser(ua);

    // Parse OS
    const os = parseOS(ua);

    // Screen info
    const screen = {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: window.screen.orientation?.type || 'unknown',
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };

    // Device type
    const deviceType = getDeviceType(screen.width);

    // Touch support
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Language and timezone
    const language = navigator.language || navigator.userLanguage || 'en-US';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffset = new Date().getTimezoneOffset();

    // Connection info (if available)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const networkInfo = connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
    } : null;

    // Memory info (if available - Chrome only)
    const memoryInfo = navigator.deviceMemory ? {
        deviceMemory: navigator.deviceMemory + 'GB'
    } : null;

    // Cookies and storage
    const cookiesEnabled = navigator.cookieEnabled;
    const localStorageAvailable = isLocalStorageAvailable();

    // Hardware concurrency (CPU cores)
    const cpuCores = navigator.hardwareConcurrency || null;

    // Generate fingerprint hash
    const fingerprint = generateFingerprint({
        ua, screen, language, timezone, cpuCores, touchSupport
    });

    return {
        // Identifiers
        fingerprint,
        userAgent: ua,

        // Device
        deviceType,
        touchSupport,
        cpuCores,

        // Browser
        browser: browser.name,
        browserVersion: browser.version,

        // OS
        os: os.name,
        osVersion: os.version,

        // Screen
        screenWidth: screen.width,
        screenHeight: screen.height,
        pixelRatio: screen.pixelRatio,
        viewportWidth: screen.viewportWidth,
        viewportHeight: screen.viewportHeight,

        // Locale
        language,
        timezone,
        timezoneOffset,

        // Network
        networkInfo,

        // Capabilities
        cookiesEnabled,
        localStorageAvailable,
        memoryInfo,

        // Timestamp
        capturedAt: new Date().toISOString()
    };
}

/**
 * Wrapper to add timeout support to fetch
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Parse browser from user agent
 */
function parseBrowser(ua) {
    const browsers = [
        { name: 'Chrome', regex: /Chrome\/(\d+)/ },
        { name: 'Firefox', regex: /Firefox\/(\d+)/ },
        { name: 'Safari', regex: /Safari\/(\d+)/ },
        { name: 'Edge', regex: /Edg\/(\d+)/ },
        { name: 'Opera', regex: /OPR\/(\d+)/ },
        { name: 'Samsung Browser', regex: /SamsungBrowser\/(\d+)/ },
        { name: 'UCBrowser', regex: /UCBrowser\/(\d+)/ }
    ];

    for (const browser of browsers) {
        const match = ua.match(browser.regex);
        if (match) {
            return { name: browser.name, version: match[1] };
        }
    }

    return { name: 'Unknown', version: '0' };
}

/**
 * Parse OS from user agent
 */
function parseOS(ua) {
    const systems = [
        { name: 'Android', regex: /Android\s*([\d.]+)/ },
        { name: 'iOS', regex: /iPhone OS\s*([\d_]+)/ },
        { name: 'Windows', regex: /Windows NT\s*([\d.]+)/ },
        { name: 'Mac OS', regex: /Mac OS X\s*([\d_]+)/ },
        { name: 'Linux', regex: /Linux/ },
        { name: 'Chrome OS', regex: /CrOS/ }
    ];

    for (const os of systems) {
        const match = ua.match(os.regex);
        if (match) {
            return { name: os.name, version: match[1]?.replace(/_/g, '.') || '' };
        }
    }

    return { name: 'Unknown', version: '' };
}

/**
 * Determine device type from screen width
 */
function getDeviceType(width) {
    if (width < 480) return 'mobile';
    if (width < 768) return 'phablet';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'laptop';
    return 'desktop';
}

/**
 * Check localStorage availability
 */
function isLocalStorageAvailable() {
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Generate a simple fingerprint hash
 * Not meant to be cryptographically secure, just unique enough for analytics
 */
function generateFingerprint(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'fp_' + Math.abs(hash).toString(36);
}

/**
 * Get IP-based location (fallback)
 * Uses free ipapi.co service
 */
export async function getIPBasedLocation() {
    try {
        const response = await fetchWithTimeout('https://ipapi.co/json/');

        if (!response.ok) {
            throw new Error('IP lookup failed');
        }

        const data = await response.json();
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('IP lookup returned invalid coordinates');
        }

        return {
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country_name,
            countryCode: data.country_code,
            latitude,
            longitude,
            timezone: data.timezone,
            isp: data.org,
            provider: 'ip_lookup'
        };
    } catch (error) {
        console.error('[DeviceInfo] IP lookup failed:', error);
        return null;
    }
}

export default getDeviceInfo;
