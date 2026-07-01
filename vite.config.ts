import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// PitchPad — Vite config.
// PWA uses generateSW (Workbox) with registerType 'prompt' so we can show a
// non-intrusive "update available" toast instead of silently reloading.
//
// Deployment note: `base` is env-driven so the *same* codebase builds correctly
// for three targets without touching this file:
//   • local dev / `preview`            → '/'   (default)
//   • production (custom domain root)  → '/'   (served at pitchpad.zen.dev.br)
//   • per-PR preview on GitHub Pages   → './'  (VITE_BASE_PATH=./)
// PR previews are published to a subdirectory (…/pr-preview/pr-N/), so a
// *relative* base keeps the hashed asset URLs valid from any depth. The service
// worker is skipped for previews (VITE_DISABLE_PWA=true): its absolute scope and
// precache manifest are meaningless — and actively confusing — in a throwaway
// subdirectory that shares an origin with the real app.
const base = process.env.VITE_BASE_PATH ?? '/'
const pwaDisabled = process.env.VITE_DISABLE_PWA === 'true'
// A web app manifest needs an *absolute* scope/start_url. When base is relative
// (previews) fall back to '/', which is harmless there since the PWA is off.
const appScope = base.startsWith('/') ? base : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: pwaDisabled,
      registerType: 'prompt',
      injectRegister: null, // we register manually in src/pwa.ts to control the update UX
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'PitchPad — Ear Trainer',
        short_name: 'PitchPad',
        description:
          'Train your ear on your own MIDI piano: hear a note, find it, play it back.',
        start_url: appScope,
        scope: appScope,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1c1410',
        theme_color: '#1c1410',
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
