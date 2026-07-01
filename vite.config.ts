import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// PitchPad — Vite config.
// PWA uses generateSW (Workbox) with registerType 'prompt' so we can show a
// non-intrusive "update available" toast instead of silently reloading.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // we register manually in src/pwa.ts to control the update UX
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PitchPad — Ear Trainer',
        short_name: 'PitchPad',
        description:
          'Train your ear on your own MIDI piano: hear a note, find it, play it back.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#17120e',
        theme_color: '#17120e',
        categories: ['music', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // The fallback synth samples are large and lazy — runtime-cache them
        // only if/when the user turns on in-app sound, never in the precache.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/samples/') ||
              url.hostname.includes('smplr') ||
              url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pitchpad-synth-samples',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // keep the SW out of the dev loop; test it via `build` + `preview`
      },
    }),
  ],
})
