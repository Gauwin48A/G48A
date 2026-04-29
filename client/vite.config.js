import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const DEFAULT_DEV_PROXY_TARGET = 'http://localhost:5001';

const REALTIME_VENDOR_PACKAGES = new Set([
  'socket.io-client',
  'engine.io-client',
  'socket.io-parser'
]);
const CORE_VENDOR_PACKAGES = new Set([
  'react',
  'react-dom',
  'react-router',
  'react-router-dom',
  '@remix-run/router',
  'scheduler'
]);
const I18N_VENDOR_PACKAGES = new Set([
  'i18next',
  'react-i18next',
  'i18next-browser-languagedetector',
  'i18next-chained-backend',
  'i18next-http-backend',
  'i18next-localstorage-backend'
]);
const NATIVE_VENDOR_PACKAGES = new Set([
  '@capacitor/app',
  '@capacitor/core',
  '@capacitor/geolocation',
  '@capacitor-community/contacts'
]);
const FORM_VENDOR_PACKAGES = new Set([]);
const HTTP_VENDOR_PACKAGES = new Set([
  'axios'
]);
const DATE_VENDOR_PACKAGES = new Set([]);

function getNodeModulePackageName(id) {
  const normalized = String(id || '').replace(/\\/g, '/');
  const marker = '/node_modules/';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) return '';
  const afterNodeModules = normalized.slice(markerIndex + marker.length);
  const segments = afterNodeModules.split('/');
  if (!segments[0]) return '';
  if (segments[0].startsWith('@') && segments[1]) {
    return `${segments[0]}/${segments[1]}`;
  }
  return segments[0];
}

function resolveVendorChunk(id) {
  const normalizedId = String(id || '').replace(/\\/g, '/');

  // Keep app locales out of the main entry chunk.
  if (normalizedId.includes('/src/locales/')) {
    const localeFile = path.posix.basename(normalizedId, '.json');
    return `locale-${localeFile}`;
  }

  if (!normalizedId.includes('/node_modules/')) return undefined;

  const packageName = getNodeModulePackageName(normalizedId);
  if (!packageName) return undefined;

  if (CORE_VENDOR_PACKAGES.has(packageName)) {
    return 'core-vendor';
  }

  if (packageName.startsWith('@tanstack/')) {
    return 'query-vendor';
  }

  if (REALTIME_VENDOR_PACKAGES.has(packageName)) {
    return 'realtime-vendor';
  }

  if (I18N_VENDOR_PACKAGES.has(packageName)) {
    return 'i18n-vendor';
  }

  if (packageName === 'lucide-react') {
    return 'icons-vendor';
  }

  if (NATIVE_VENDOR_PACKAGES.has(packageName)) {
    return 'native-vendor';
  }

  if (FORM_VENDOR_PACKAGES.has(packageName)) {
    return 'forms-vendor';
  }

  if (HTTP_VENDOR_PACKAGES.has(packageName)) {
    return 'http-vendor';
  }

  if (DATE_VENDOR_PACKAGES.has(packageName)) {
    return 'date-vendor';
  }

  if (packageName.startsWith('@radix-ui/')) {
    return 'radix-vendor';
  }

  // Let Rollup decide for remaining dependencies so route-only libs can stay lazy.
  return undefined;
}

function normalizeDevProxyTarget(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withProtocol = /^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

function resolveDevProxyTarget(env) {
  const candidates = [
    env.VITE_DEV_PROXY_TARGET,
    env.VITE_API_BASE_URL,
    env.VITE_SOCKET_URL
  ];
  for (const candidate of candidates) {
    const normalized = normalizeDevProxyTarget(candidate);
    if (normalized) return normalized;
  }
  return DEFAULT_DEV_PROXY_TARGET;
}

/**
 * Strip component displayName and name properties in production.
 * This prevents React DevTools from showing readable component names.
 */
function stripComponentNames() {
  return {
    name: 'strip-component-names',
    apply: 'build',
    transform(code, id) {
      if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) return null;
      // Remove .displayName assignments
      const stripped = code.replace(/\w+\.displayName\s*=\s*['"][^'"]*['"]\s*;?/g, '');
      if (stripped !== code) return { code: stripped, map: null };
      return null;
    },
  };
}

// MINIMAL CONFIG FOR BUILD TESTING
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devProxyTarget = resolveDevProxyTarget(env);
  const rawPort = env.PORT || env.VITE_PORT || process.env.PORT || process.env.VITE_PORT || '8081';
  const parsedPort = Number.parseInt(rawPort, 10);
  const devPort = Number.isFinite(parsedPort) ? parsedPort : 8081;
  const forceOptimizeDeps =
    String(env.VITE_OPTIMIZE_DEPS_FORCE || process.env.VITE_OPTIMIZE_DEPS_FORCE || '')
      .toLowerCase() === 'true';
  const hasPortEnv = Boolean(env.PORT || process.env.PORT);

  return {
    plugins: [react(), stripComponentNames()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      port: devPort,
      strictPort: !hasPortEnv,
      proxy: {
        "/api": {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/uploads": {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/static": {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      force: forceOptimizeDeps,
      // Keep known lazy UI/native deps pre-optimized to reduce stale on-demand dep fetches in dev.
      include: ['@radix-ui/react-tabs', '@capacitor-community/contacts'],
    },
    build: {
      sourcemap: false,
      modulePreload: true,
      // Strip console.log/warn in production, keep errors + mangle for obfuscation
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          passes: 1,
          dead_code: true,
          conditionals: true,
          evaluate: true,
          reduce_vars: true,
          collapse_vars: true,
          booleans_as_integers: false,
          hoist_funs: true,
          join_vars: true,
          sequences: true,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,  // Remove all comments
          ascii_only: true,
          ecma: 2020,
        },
      },
      // Warn on large chunks (250kb)
      chunkSizeWarningLimit: 250,
      rollupOptions: {
        output: {
          manualChunks: resolveVendorChunk,
        },
      },
    }
  };
});
