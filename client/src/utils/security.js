/**
 * Security Utils
 * Code Fortress Protocol - Phase 2
 * 
 * Anti-tamper measures for production
 */

/**
 * Activate Defense Mode
 * - Disables right-click
 * - Blocks F12, Ctrl+Shift+I
 * - Only active in production
 */
export const activateDefenseMode = () => {
    // Don't interfere with development
    if (import.meta.env.DEV) return;

    // 1. Disable Right Click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // 2. Disable Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I (Inspect) or Ctrl+Shift+J (Console) or Ctrl+Shift+C (Element picker)
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            return false;
        }
        // Ctrl+S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            return false;
        }
    });

    // 3. Debugger Trap - Freezes/reloads if DevTools is opened
    setInterval(() => {
        const start = performance.now();
        debugger; // Pauses if DevTools is open
        const end = performance.now();
        if (end - start > 100) {
            // Detected DevTools open -> Reload
            window.location.reload();
        }
    }, 2000);

    // Console warning for curious developers
    console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold;");
    console.log("This is a protected area. Access is monitored.");
};

/**
 * Domain Lock Check
 * Prevents code from running on unauthorized domains
 */
export const checkDomainLock = () => {
    // Don't check in development
    if (import.meta.env.DEV) return true;

    const ALLOWED_DOMAINS = [
        'localhost',
        '127.0.0.1',
        'mhub-mini.vercel.app',
        'mhub-app.vercel.app',
        // Add your production domains here
    ];

    const currentDomain = window.location.hostname;

    if (!ALLOWED_DOMAINS.some(domain => currentDomain.includes(domain))) {
        console.error('🔒 Security Violation: Unauthorized Domain');
        return false;
    }

    return true;
};

/**
 * Detect DevTools
 * Returns true if DevTools appears to be open
 * Note: This is not 100% reliable
 */
export const detectDevTools = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    return widthThreshold || heightThreshold;
};

/**
 * Initialize all security measures
 */
export const initializeSecurity = () => {
    if (import.meta.env.DEV) {
        console.log('🔓 Development mode - security measures disabled');
        return;
    }

    // Check domain lock
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
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">🔒 Security Alert</h1>
        <p style="color: #888; max-width: 400px;">
          This application is not authorized to run on this domain.
          Please access MHub through the official website.
        </p>
      </div>
    `;
        throw new Error('Security Violation: Domain Mismatch');
    }

    // Activate defense mode
    activateDefenseMode();
};

export default initializeSecurity;
