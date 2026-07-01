# PitchPad — Design System: "Lampglow" (locked)

The whole app is a pool of warm lamplight thrown over a dark piano at night.
When a note sounds, its pitch **blooms as light** from the key that would play it —
a struck string quietly resonating the instrument. Practice here should feel like
sitting down alone after the house is asleep.

This is the source of truth for the visual language. Chosen from a 3-way design
exploration (Lampglow 34.5 > Bench Tuner 33 > Standing Wave 31.75), with one graft
from Bench Tuner: the signed **semitone-offset** readout on a wrong answer, because
ear-training *is* pitch distance — feedback should teach direction, not just verdict.

## 1. Palette (locked tokens — never inline a one-off hex)

Warm plum-brown, R>G>B throughout, never neutral charcoal.

| Token | Hex | Role |
|---|---|---|
| `ground` | `#1C1410` | Page background. The room in shadow. |
| `surface` | `#332417` | Raised panels (bars, sheet, keyboard bed, cards). Lifted 2 stops from ground. |
| `surface-inset` | `#150F0B` | Recessed wells: key gaps, Replay socket, listening groove. |
| `hairline` | `#4A3826` | 1px top inner-edge on every raised panel + dividers. |
| `accent` | `#E8A54B` | THE single accent: brass lamplight. Replay, active states, streak, bloom. |
| `accent-dim` | `#B57F38` | Pressed/inactive accent, bloom outer falloff. |
| `correct` | `#7FB08A` | Oxidized-sage. "Right" — ALWAYS with solid ring + check + label. |
| `wrong` | `#D46A5B` | Terracotta-clay. "Not quite" — ALWAYS with broken ring + reveal + label. |
| `text` | `#F2E4CE` | Warm ivory. Primary text + white-key faces. Never #FFF. |
| `muted` | `#A88C6A` | Dim brass. Secondary labels, inactive dots, "listening…". ≥14px on ground. |

Keyboard-specific: `key-white #EBDCC2`, `key-white-press #D4C3A6`,
`key-black #241A12`, `key-black-press #160F09`, `key-top-bevel #F7ECD8`,
key gaps/bevel = `surface-inset #150F0B`.

## 2. Type

- **Fraunces** (`@fontsource-variable/fraunces`) — identity only: state word, note-name
  reveal, wordmark, stat digits. wght **400–500** (never 600+), `SOFT` 100 (max),
  `WONK` 1 (on), `opsz` 96 at display sizes, tracking −0.02em. Numbers use `tnum`.
- **Public Sans** (`@fontsource-variable/public-sans`) — all chrome. 400/600.
  Labels: uppercase +0.06em.

Scale (px, portrait): `display` 56/1.0 (note reveal) · `state` 34/1.05 (state word) ·
`stat-num` 22 · `title` 18 · `body` 16 (Public Sans) · `label` 13 uppercase (Public Sans 600) ·
`micro` 12 (Public Sans).

## 3. Signature — the Resonance Bloom (P0)

Warm light blooms *from* a key when its note sounds. CSS-only radial-gradient span
layered behind each key + one in the round-view center. **Animate `transform: scale()`
and `opacity` only** (never box-shadow blur/width — janks on mid Android).

- `strike`: single 700ms swell + fade — `cubic-bezier(0.22,1,0.36,1)`.
- `hold`: steady breathing glow ~0.8Hz for the wrong-answer reveal.
- During an active prompt the **target key must NOT bloom** (would give away the answer);
  only the *center* echo plays on target/replay. Key blooms appear only on reveal/answer.
- Correct answer: `strike` tinted `correct` sage on the played key.
- Reduced-motion: blooms become a static glow.

## 4. Motion — physical settle, CSS only (no motion lib)

| Name | Easing | Dur | Applied to |
|---|---|---|---|
| `settle` | `cubic-bezier(0.34,1.56,0.64,1)` | 320ms | prompt drop-in, sheet rise, ring settle, stat tick |
| `press` | instant down / `settle` up | — | Replay disc, keys |
| `bloom` | `cubic-bezier(0.22,1,0.36,1)` | 700ms | resonance bloom |
| `breathe` | ease-in-out | 1.25s loop | wrong-answer held reveal |
| `listen-pulse` | ease-in-out | 1.6s loop | "listening…" dot 0.4↔0.9 |

Replay disc depresses 2px into its socket. Keys travel ~5px (white) / 4px (black) down.
Correct = one vertical round-view resonance bounce (±6px settle) + ring draws 280ms.
Wrong = X settles with exactly **2** shake oscillations (not a loop) + broken ring snaps.
Haptics fire on the settle peak: correct `vibrate(18)`, wrong `vibrate([22,60,22])`.
All loops honor `prefers-reduced-motion`.

## 5. Feedback — colorblind-safe (shape is load-bearing, color redundant)

- **Correct:** unbroken **solid** 2px ring draws clockwise (280ms) + filled check glyph +
  label **"Right"** (Fraunces `state`) + sage `strike` on the played key + single haptic.
- **Wrong:** **broken/segmented double-stroke** ring (shape-distinct from correct) + X glyph
  with 2-oscillation shake + label **"Not quite"** + signed semitone offset below in Fraunces
  tnum (`+2 ♯` / `−1 ♭`, computed `played − target`, integers only — no fake cents) +
  correct key reveals with `hold` breathing bloom & note name above + double-buzz haptic.

## 6. On-screen keyboard

One octave, white keys C4–B4 + 5 black keys overlaid. A co-equal craft object.
White keys: 7 across, ~150px tall, `key-white` face, radius `0 0 10px 10px`, 2px inset gaps,
1px `key-top-bevel` top highlight, 4px darker front bevel. Black keys: width ~62% of white,
~96px tall, `key-black`, radius `0 0 6px 6px`, absolutely positioned over boundaries, raised.
Every key is a real `<button aria-label="C4">`. Press: translateY(5/4px) + press tone +
deepen inset, spring back with `settle`. Reveal states via data-attributes (not color-only):
`reveal` = breathing bloom + note name above + 1.5px accent outline; `reveal-correct` =
sage strike + sage outline. Legends **off by default** (don't label the keys you're testing);
settings toggle shows them in `muted micro`.

## 7. Anti-default guardrails — do NOT

1. Don't drift `ground` toward neutral charcoal or brighten `accent` toward signal-amber.
   Exact hexes are locked CSS custom properties; `ground` keeps R>G>B.
2. Don't ship a raised panel without its top `hairline`, and don't collapse `surface` toward
   `ground`. No drop-shadow-on-card-on-gradient stacks.
3. Don't use Fraunces at 600+, at default axes, or for body/UI text. Quarantine it to identity.
4. Don't add a second bold element, second accent, or second geometry. Boldness = the bloom only.
   Correct/wrong stay warm (sage, terracotta) — never electric green / alarm red.
5. Don't stack decorative motion. No drifting ripples, no looping shake, no particle swells.
   Every loop/bounce honors `prefers-reduced-motion`.
