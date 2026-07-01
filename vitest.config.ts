import { defineConfig } from 'vitest/config'

// Tests target the pure-TS engine (notes.ts, game.ts) and the store.
// No Vite plugins here: esbuild handles TS transforms, which keeps this config
// decoupled from the app build and avoids vite-version type clashes.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
  },
})
