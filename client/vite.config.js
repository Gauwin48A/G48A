import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const DEV_PROXY_TARGET = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5001';

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
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('/@tanstack/')) {
            return 'query-vendor';
          }

          if (
            id.includes('/@radix-ui/') ||
            id.includes('/lucide-react/') ||
            id.includes('/react-icons/')
          ) {
            return 'ui-vendor';
          }

          if (
            id.includes('/i18next') ||
            id.includes('/react-i18next')
          ) {
            return 'i18n-vendor';
          }

          if (
            id.includes('/socket.io-client/') ||
            id.includes('/pusher-js/')
          ) {
            return 'realtime-vendor';
          }

          if (id.includes('/@capacitor/')) {
            return 'capacitor-vendor';
          }

          return 'vendor';
        },
      },
    },
  }
});
