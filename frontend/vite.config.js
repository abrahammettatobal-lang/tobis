import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'tobis-color.svg',
        'logo.svg',
        'stream-guard.js',
        'en-vivo.html',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],
      manifest: false,
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/en-vivo\.html$/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/openfootball\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfootball-schedule',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
