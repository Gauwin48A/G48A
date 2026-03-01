import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const DEV_PROXY_TARGET = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5001';

const REALTIME_VENDOR_PACKAGES = new Set([
  'socket.io-client',
  'engine.io-client',
  'socket.io-parser',
  'pusher-js'
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

  if (packageName.startsWith('@tanstack/')) {
    return 'query-vendor';
  }

  if (REALTIME_VENDOR_PACKAGES.has(packageName)) {
    return 'realtime-vendor';
  }

  // Keep the rest in a stable baseline vendor chunk to avoid over-fragmentation.
  return 'vendor';
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
    force: true,
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
