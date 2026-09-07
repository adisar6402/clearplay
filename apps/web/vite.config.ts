import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon/favicon-16x16.png',
        'favicon/favicon-32x32.png',
        'favicon/favicon-48x48.png',
        'favicon/favicon-64x64.png',
        'pwa/apple-touch-icon.png',
        'pwa/icon-144.png',
        'pwa/icon-192.png',
        'pwa/icon-256.png',
        'pwa/icon-384.png',
        'pwa/icon-512.png',
        'pwa/icon-maskable-512.png'
      ],
      manifest: {
        name: 'ClearPlay',
        short_name: 'ClearPlay',
        description: 'A privacy-first, distraction-free experience layer for online video.',
        theme_color: '#080A09',
        background_color: '#080A09',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        id: '/',
        icons: [
          { src: 'pwa/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: 'pwa/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
