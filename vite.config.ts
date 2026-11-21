import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site: https://miyukigit.github.io/gymix/
const base = '/gymix/'
const day = 24 * 60 * 60

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // Registration is handled by PwaStatus via virtual:pwa-register/react.
      injectRegister: null,
      manifest: {
        id: base,
        name: 'GYMIX — Smart Workout Tracker',
        short_name: 'GYMIX',
        description: 'Personal fitness companion',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#101110',
        theme_color: '#101110',
        icons: [
          { src: `${base}gymix-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}gymix-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}gymix-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Prompt updates require an explicit user action before the waiting SW activates.
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gymix-google-fonts-stylesheets',
              expiration: { maxEntries: 4, maxAgeSeconds: 7 * day },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gymix-google-font-files',
              expiration: { maxEntries: 24, maxAgeSeconds: 365 * day },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'gymix-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * day },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: { port: 5173 },
})
