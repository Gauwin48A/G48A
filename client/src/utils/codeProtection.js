/**
 * Code Protection Module
 * ──────────────────────
 * Anti-debugging and code inspection deterrents for production builds.
 * All protections are DISABLED in development mode (import.meta.env.DEV).
 *
 * This is a deterrent layer, not a security boundary.
 * Real security lives on the server.
 */

let _initialized = false;
let _devToolsOpen = false;

export function isDevToolsOpen() {
  return _devToolsOpen;
}

export function initCodeProtection() {
  if (_initialized) return;
  _initialized = true;

  // Only active in production
  if (import.meta.env.DEV) return;

  try { disableReactDevTools(); } catch {}
  try { setupDevToolsDetection(); } catch {}
  try { setupShortcutBlocking(); } catch {}
  try { setupContextMenuBlock(); } catch {}
  try { setupConsoleProtection(); } catch {}
  try { setupSelectionProtection(); } catch {}
  try { setupDragProtection(); } catch {}
  try { setupSourceProtection(); } catch {}
}

// ── Block React DevTools from inspecting component tree ──────

function disableReactDevTools() {
  // Must run before React mounts — disable the global hook that React DevTools injects
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    const noop = () => {};
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    // Neutralize all hook methods
    for (const key of Object.keys(hook)) {
      if (typeof hook[key] === "function") {
        hook[key] = noop;
      }
    }
    // Prevent renderers from registering
    hook.inject = noop;
    hook.onCommitFiberRoot = noop;
    hook.onCommitFiberUnmount = noop;
    hook.renderers = new Map();
    hook.supportsFiber = false;
    // Freeze the hook to prevent re-patching
    try { Object.freeze(hook); } catch {}
  }
  // Prevent future injection by defining a frozen dummy
  try {
    if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
        value: Object.freeze({
          inject: () => {},
          onCommitFiberRoot: () => {},
          onCommitFiberUnmount: () => {},
          supportsFiber: false,
          renderers: new Map(),
          isDisabled: true,
        }),
        writable: false,
        configurable: false,
      });
    }
  } catch {}
}

// ── DevTools Detection (multiple methods, fast polling) ──────

let _overlay = null;

function showOverlay() {
  // Prevent duplicate overlays — remove existing first
  try {
    const existing = document.getElementById("mhub-security-overlay");
    if (existing) existing.remove();
  } catch {}
  if (_overlay) return;
  try {
    _overlay = document.createElement("div");
    _overlay.id = "mhub-security-overlay";
    _overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:rgba(17,24,39,0.97);" +
      "display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;" +
      "pointer-events:all;user-select:none;";
    _overlay.innerHTML =
      '<div style="text-align:center;color:white;max-width:400px;padding:32px">' +
      '<div style="width:64px;height:64px;margin:0 auto 20px;background:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-2.5L13.73 4.5c-.77-.83-2.69-.83-3.46 0L3.34 16.5c-.77.83.19 2.5 1.73 2.5z"/></svg>' +
      '</div>' +
      '<h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Developer Tools Detected</h2>' +
      '<p style="font-size:14px;color:#9ca3af;line-height:1.5">Please close developer tools to continue using MHub.</p>' +
      '</div>';
    document.body.appendChild(_overlay);
  } catch {}
}

function hideOverlay() {
  if (_overlay) {
    try { _overlay.remove(); } catch {}
    _overlay = null;
  }
  // Also clean up any orphaned overlays
  try {
    const orphan = document.getElementById("mhub-security-overlay");
    if (orphan) orphan.remove();
  } catch {}
}

function setupDevToolsDetection() {
  // Method 1: Window size threshold (detect docked DevTools)
  const checkSize = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    // 160px threshold handles browser chrome; DevTools adds 200+
    return widthDiff > 160 || heightDiff > 160;
  };

  // Method 2: console.log element trick
  const checkConsoleElement = () => {
    let detected = false;
    const el = document.createElement("div");
    Object.defineProperty(el, "id", {
      get: () => { detected = true; return ""; },
    });
    console.debug(el);
    return detected;
  };

  // Method 3: Performance timing (debugger pauses add >100ms)
  const checkTiming = () => {
    const start = performance.now();
    // This line is intentionally left as a timing probe
    void (function () { return 1; })();
    const elapsed = performance.now() - start;
    return elapsed > 100;
  };

  // Method 4: Image element toString trick (works on Chromium)
  const checkImageTrick = () => {
    let detected = false;
    try {
      const img = new Image();
      Object.defineProperty(img, "id", {
        get: () => { detected = true; return ""; },
      });
      console.debug("%c", img);
    } catch {}
    return detected;
  };

  // Method 5: Date toString override detection
  const checkDateTrick = () => {
    let detected = false;
    try {
      const d = new Date();
      d.toString = () => { detected = true; return ""; };
      console.debug(d);
    } catch {}
    return detected;
  };

  // Combined check — runs every 500ms for faster detection
  const runCheck = () => {
    try {
      const sizeDetected = checkSize();
      const consoleDetected = checkConsoleElement();
      const timingDetected = checkTiming();
      const imageTrickDetected = checkImageTrick();
      const dateTrickDetected = checkDateTrick();

      const wasOpen = _devToolsOpen;
      _devToolsOpen = sizeDetected || consoleDetected || timingDetected || imageTrickDetected || dateTrickDetected;

      if (_devToolsOpen && !wasOpen) showOverlay();
      if (!_devToolsOpen && wasOpen) hideOverlay();
    } catch {}
  };

  setInterval(runCheck, 3000);
  // Also check on resize (DevTools dock/undock triggers resize)
  window.addEventListener("resize", runCheck, { passive: true });
}

// ── Keyboard shortcut blocking ──────────────────────────────

function setupShortcutBlocking() {
  document.addEventListener("keydown", (e) => {
    try {
      const key = (e.key || "").toUpperCase();
      const code = e.code || "";
      const isMac = navigator.platform?.includes("Mac") || navigator.userAgent?.includes("Mac");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;

      // F12
      if (key === "F12" || code === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + Shift + I/J/C (DevTools)
      if (ctrl && shift && (key === "I" || key === "J" || key === "C")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + U (View Source)
      if (ctrl && !shift && key === "U") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + S (Save page)
      if (ctrl && !shift && key === "S") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Mac: Cmd + Option + I/J/C
      if (isMac && e.metaKey && e.altKey && (key === "I" || key === "J" || key === "C")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    } catch {}
  }, true); // Capture phase
}

// ── Context menu blocking ───────────────────────────────────

function setupContextMenuBlock() {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  }, true);
}

// ── Console protection ──────────────────────────────────────

function setupConsoleProtection() {
  // Preserve original console methods on a private global so internal diagnostic
  // helpers (e.g. the API interceptor) can still emit logs that bridge to native
  // logcat via the Capacitor Console plugin. This is set BEFORE the public
  // console object is frozen, and is non-enumerable to keep it out of casual view.
  try {
    const orig = {
      log: window.console.log.bind(window.console),
      info: window.console.info.bind(window.console),
      warn: window.console.warn.bind(window.console),
      error: window.console.error.bind(window.console),
      debug: (window.console.debug || window.console.log).bind(window.console),
    };
    Object.defineProperty(window, "__mhubConsole", {
      value: orig,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  } catch {}
  // Replace console methods with no-ops (keep console.error for crash reporting)
  const noop = () => {};
  try {
    window.console.log = noop;
    window.console.info = noop;
    window.console.debug = noop;
    window.console.warn = noop;
    window.console.table = noop;
    window.console.dir = noop;
    window.console.dirxml = noop;
    window.console.trace = noop;
    window.console.group = noop;
    window.console.groupCollapsed = noop;
    window.console.groupEnd = noop;
    window.console.count = noop;
    window.console.countReset = noop;
    window.console.time = noop;
    window.console.timeEnd = noop;
    window.console.timeLog = noop;
    window.console.profile = noop;
    window.console.profileEnd = noop;
    // Freeze to prevent reassignment
    Object.freeze(window.console);
  } catch {}
}

// ── Drag & Print protection ─────────────────────────────────

function setupDragProtection() {
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
    return false;
  }, true);
  // Block Ctrl+P (print) which can reveal source
  document.addEventListener("keydown", (e) => {
    try {
      const key = (e.key || "").toUpperCase();
      const isMac = navigator.platform?.includes("Mac") || navigator.userAgent?.includes("Mac");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (ctrl && key === "P") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    } catch {}
  }, true);
}

// ── Text selection protection on sensitive elements ─────────

function setupSelectionProtection() {
  try {
    const style = document.createElement("style");
    style.textContent = `.no-select{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}`;
    document.head.appendChild(style);
  } catch {}
}

// ── Source view protection — blocks view-source and about:devtools ──

function setupSourceProtection() {
  // Console clearing disabled — it destroys runtime error evidence needed for
  // debugging and security monitoring. Use server-side obfuscation instead.

  // Detect if page was opened via view-source: protocol
  try {
    if (window.location.protocol === "view-source:") {
      document.documentElement.innerHTML = "";
    }
  } catch {}

  // Block copy events on the document to prevent copying page source
  document.addEventListener("copy", (e) => {
    const selection = window.getSelection?.()?.toString?.() || "";
    // Allow normal text copy but prevent large source extraction
    if (selection.length > 500) {
      e.preventDefault();
    }
  }, true);

  // Monitor and neuter common DevTools extensions
  try {
    // Prevent window.__VUE_DEVTOOLS_GLOBAL_HOOK__ (just in case)
    Object.defineProperty(window, "__VUE_DEVTOOLS_GLOBAL_HOOK__", {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {}
}
