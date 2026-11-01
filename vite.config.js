import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // The service worker answers every navigation with the cached index.html. /api must reach
        // the backend: "Continuar con Google" navigates to /api/auth/google and Google returns to
        // /api/auth/google/callback.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'WeatherMapZ',
        short_name: 'WeatherMapZ',
        description: 'Navegación peatonal confortable por Zaragoza.',
        theme_color: '#175c4c',
        background_color: '#f7faf8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
