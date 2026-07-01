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

## Deployment & CI

Four GitHub workflows (in [`.github/`](.github)) automate testing and hosting:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| **CI** (`ci.yml`) | every PR + push to `main` | type-check → `vitest` → production build |
| **Deploy** (`deploy.yml`) | push to `main` | tests, then builds and publishes the site |
| **PR Preview** (`pr-preview.yml`) | PR opened/updated/closed | deploys a live preview, removes it on close |
| **Dependabot** (`dependabot.yml`) | weekly | grouped npm + GitHub Actions updates |

The site is served from a custom domain (`pitchpad.zen.dev.br`, set via
[`public/CNAME`](public/CNAME)). Both the live site and PR previews are
published to the **`gh-pages` branch** so they can coexist:

- production → `https://pitchpad.zen.dev.br/`
- preview for PR #N → `https://pitchpad.zen.dev.br/pr-preview/pr-N/`

The main deploy uses `clean-exclude: pr-preview/`, so redeploying `main` never
wipes an open PR's preview. Vite's `base` is env-driven (see the note in
[`vite.config.ts`](vite.config.ts)): production builds at `/`, previews build
with a **relative** base (`VITE_BASE_PATH=./`) and the service worker off
(`VITE_DISABLE_PWA=true`) so assets resolve from the preview subdirectory.

> Previews run on `pull_request` (not `pull_request_target`), so previews are
> only built for PRs from branches in this repo — PRs from forks are skipped to
> avoid running untrusted code with a write token.

### One-time setup (repo settings)

1. **Actions → General → Workflow permissions** → select **Read and write
   permissions** (lets the deploy push to `gh-pages`).
2. Merge to `main` once (or run **Deploy** from the Actions tab). This creates
   the `gh-pages` branch.
3. **Settings → Pages → Build and deployment** → Source: **Deploy from a
   branch**, Branch: **`gh-pages`** / **`/ (root)`**.
4. **Settings → Pages → Custom domain** → enter `pitchpad.zen.dev.br` and, once
   DNS verifies, tick **Enforce HTTPS**. Add a DNS `CNAME` record pointing
   `pitchpad.zen.dev.br` → `eulercb.github.io` at your DNS provider.
