/**
 * Security Utils
 * Code Fortress Protocol - Phase 2
 *
 * Anti-tamper measures for production.
 */

const DEFENSE_MODE_FLAG = '__mhub_defense_mode_active__';
const DEFENSE_MODE_INTERVAL_KEY = '__mhub_defense_mode_interval__';
const ENABLE_DEBUGGER_TRAP = import.meta.env.VITE_ENABLE_DEFENSE_DEBUGGER_TRAP === 'true';
const ALLOWED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'mhub-mini.vercel.app',
    'mhub-app.vercel.app'
];

export const isAuthorizedHostname = (hostname, allowedDomains = ALLOWED_DOMAINS) => {
    if (!hostname || typeof hostname !== 'string') return false;

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

/**
 * Activate Defense Mode
 * - Disables right-click
 * - Blocks F12, Ctrl+Shift+I
 * - Only active in production
 */
export const activateDefenseMode = () => {
    // Don't interfere with development.
    if (import.meta.env.DEV) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window[DEFENSE_MODE_FLAG]) return;
    window[DEFENSE_MODE_FLAG] = true;

    // 1. Disable right click.
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // 2. Disable keyboard shortcuts.
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker), Ctrl+Shift+K.
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            return false;
        }

        // Ctrl/Cmd+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            return false;
        }
    });

    // 3. Debugger trap - reload if devtools is opened.
    if (ENABLE_DEBUGGER_TRAP && !window[DEFENSE_MODE_INTERVAL_KEY]) {
        window[DEFENSE_MODE_INTERVAL_KEY] = setInterval(() => {
            const start = performance.now();
            debugger; // Pauses if DevTools is open.
            const end = performance.now();

            if (end - start > 100) {
                window.location.reload();
            }
        }, 2000);
    }

    console.log('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold;');
    console.log('This is a protected area. Access is monitored.');
};

/**
 * Domain Lock Check
 * Prevents code from running on unauthorized domains.
 */
export const checkDomainLock = () => {
    if (import.meta.env.DEV) return true;
    if (typeof window === 'undefined') return false;

    if (!isAuthorizedHostname(window.location.hostname)) {
        console.error('[Security] Unauthorized domain detected.');
        return false;
    }

    return true;
};

/**
 * Detect DevTools.
 * Returns true if DevTools appears to be open.
 * Note: This is not 100% reliable.
 */
export const detectDevTools = () => {
    if (typeof window === 'undefined') return false;

    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    return widthThreshold || heightThreshold;
};

/**
 * Initialize all security measures.
 */
export const initializeSecurity = () => {
    if (import.meta.env.DEV) {
        console.log('[Security] Development mode - security measures disabled');
        return;
    }

    if (!checkDomainLock()) {
        document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #1a1a1a;
        color: #ff4444;
        font-family: system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Security Alert</h1>
        <p style="color: #888; max-width: 400px;">
          This application is not authorized to run on this domain.
          Please access MHub through the official website.
        </p>
      </div>
    `;
        throw new Error('Security Violation: Domain Mismatch');
    }

    activateDefenseMode();
};

export default initializeSecurity;
