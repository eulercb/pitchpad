# PitchPad

An ear-training PWA for your own MIDI piano. Hear a note played on your
instrument, find it, and play it back — with immediate visual + haptic feedback,
scoring, and streaks. Mobile-first, portrait, installable, and fully offline
after the first load.

The piano is both the **sound source** (Web MIDI out) and the **answer input**
(Web MIDI in). Built for **Android Chrome** (Web MIDI isn't available on
iOS/Safari).

## How it plays

1. An optional **reference tone** (C4 by default) anchors your ear.
2. A **target note** sounds on your piano — you hear it, but don't see the key.
3. You **play the note back** on the piano (or tap the on-screen keyboard).
4. **Correct** → celebratory feedback + advance. **Wrong** → the correct key is
   revealed, with how many semitones off you were, and you can retry or move on.

Everything runs on sensible defaults (white keys C4–B4, 10 rounds, reference on)
— it's fully playable before you open Settings.

## Stack

Vite + React 18 + TypeScript · Tailwind CSS v4 · Zustand · `vite-plugin-pwa`
(Workbox) · native Web MIDI. Self-hosted fonts (Fraunces + Public Sans) so it
works offline. No backend.

The engine (`src/engine/*`) is framework-agnostic pure TypeScript — all MIDI,
audio, note math, and game-state logic — with React observing it through hooks.

```
src/engine/   midi · audio · notes · game (state machine) · settings · types
src/hooks/    useMidi · useGame · useWakeLock
src/ui/       App · ConnectScreen · RoundView · Keyboard · Feedback · Settings …
src/store.ts  settings + stats persistence (localStorage, versioned)
src/runtime.ts wires the singletons together
```

The visual language ("Lampglow") is documented in [`docs/DESIGN.md`](docs/DESIGN.md).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (notes, game machine, store, keyboard layout)
npm run build      # type-check + production build + service worker
npm run preview    # serve the production build
```

### No piano? Use mock mode

Append `?mock` in dev (`http://localhost:5173/?mock`) to run against a virtual
MIDI transport: connect works without hardware and the on-screen keyboard drives
input. Mock mode is gated to dev builds and never ships enabled.

## ⚠️ Testing on an actual Android phone

Web MIDI requires **a secure context (HTTPS or `localhost`) _and_ a user
gesture**. `localhost` on your dev machine counts, so `npm run dev` with the
piano plugged into the computer works for the main loop.

**But your phone hitting your laptop's LAN IP is _not_ a secure context** — Web
MIDI will silently fail there. To test on the phone, pick one:

1. **Deploy to a static HTTPS host** (Vercel / Netlify / GitHub Pages) and open
   the deployed URL on the phone. Also the fastest way to verify PWA install.
   *(Recommended.)*
2. **Tunnel** the dev server over HTTPS with `cloudflared` or `ngrok`.
3. **`mkcert`** a locally-trusted cert and serve Vite over HTTPS on the LAN
   (fiddlier cert trust on Android).

Connect the piano over **USB-C (OTG)** to a class-compliant USB-MIDI device.

If your piano doesn't sound incoming MIDI, turn on **in-app sound** in Settings
(or check the piano's Local Control / MIDI routing).
