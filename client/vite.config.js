import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const DEV_PROXY_TARGET = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5001';
const FORCE_OPTIMIZE_DEPS = String(process.env.VITE_OPTIMIZE_DEPS_FORCE || '').toLowerCase() === 'true';

const REALTIME_VENDOR_PACKAGES = new Set([
  'socket.io-client',
  'engine.io-client',
  'socket.io-parser'
]);
const CORE_VENDOR_PACKAGES = new Set([
  'react',
  'react-dom',
  'react-router-dom',
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
  if (!id.includes('node_modules')) return undefined;

  const packageName = getNodeModulePackageName(id);
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

  // Let Rollup decide for non-core dependencies so route-only libs can stay lazy.
  return undefined;
}

// MINIMAL CONFIG FOR BUILD TESTING
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 8081,
    proxy: {
      "/api": {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/uploads": {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/static": {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    force: FORCE_OPTIMIZE_DEPS,
    // Keep known lazy UI/native deps pre-optimized to reduce stale on-demand dep fetches in dev.
    include: ['@radix-ui/react-tabs', '@capacitor-community/contacts'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: resolveVendorChunk,
      },
    },
  }
});
