import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { apiFunctionsDev } from './vite-plugin-api-dev.js';

export default defineConfig({
  base: '/',
  // Fixed port so the dev URL never silently moves to 5174.
  server: { port: 5173, strictPort: true },
  // Fresh pre-bundle cache: the old node_modules/.vite still held Firebase 11.10.0
  // (with the "ca9" assertion bug) after upgrading to 12.x.
  cacheDir: 'node_modules/.vite-junio8',
  plugins: [
    react(),
    apiFunctionsDev(),
    VitePWA({
      // New deploys update the installed app automatically (main.jsx also checks every 30 min).
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-48.png', 'apple-touch-icon.png', 'brand/*.webp'],
      manifest: {
        id: '/staff',
        name: 'Junio 8 Café',
        short_name: 'Junio 8',
        description: 'Junio 8 Café: table ordering, live kitchen display and admin.',
        lang: 'en-IN',
        dir: 'ltr',
        categories: ['food', 'business'],
        theme_color: '#f4efe8',
        background_color: '#f4efe8',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        // Kitchen tablets are usually landscape; let the device decide.
        orientation: 'any',
        // The installed app opens on /staff, which sends admin → /admin, kitchen → /kitchen.
        start_url: '/staff?source=pwa',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Kitchen display', short_name: 'Kitchen', url: '/kitchen', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Admin panel', short_name: 'Admin', url: '/admin', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // SPA: any page opened offline gets the app shell...
        navigateFallback: '/index.html',
        // ...except server functions, which must always hit the network.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Menu photos: show instantly on repeat visits and on patchy café Wi-Fi.
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\/image\/upload\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'menu-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ]
});
