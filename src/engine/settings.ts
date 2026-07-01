// The v1 "sensible defaults" (§5). The app must be fully playable on these
// without opening Settings. Everything here is user-editable later.
import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  inputDeviceName: null,
  outputDeviceName: null,
  rangeMin: 60, // C4
  rangeMax: 71, // B4
  whiteOnly: true, // 7 white-key targets, one octave
  referenceTone: true, // anchor the ear with C4 before the target
  referenceNote: 60, // C4
  noteDurationMs: 1000,
  outputVelocity: 90,
  outputChannel: 0, // channel 1 (0-indexed)
  inputChannel: null, // omni — accept note-on from any channel
  soundSource: 'piano', // the piano makes the sound; in-app synth is off by default
  haptics: true,
  audioCue: false, // keep the ear clean; no pitched success/fail cue by default
  roundsPerSession: 10,
  theme: 'dark',
  showNoteLabels: false, // don't label the keys you're testing
}

/** Clamp/repair a settings object read from storage so bad data can't break play. */
export function sanitizeSettings(input: Partial<Settings> | undefined | null): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(input ?? {}) }
  let min = Math.round(s.rangeMin)
  let max = Math.round(s.rangeMax)
  if (min > max) [min, max] = [max, min]
  s.rangeMin = Math.max(0, Math.min(127, min))
  s.rangeMax = Math.max(0, Math.min(127, max))
  const rn = Math.round(Number(s.referenceNote))
  s.referenceNote = Number.isFinite(rn)
    ? Math.max(0, Math.min(127, rn))
    : DEFAULT_SETTINGS.referenceNote
  s.noteDurationMs = Math.max(200, Math.min(4000, Math.round(s.noteDurationMs)))
  s.outputVelocity = Math.max(1, Math.min(127, Math.round(s.outputVelocity)))
  s.outputChannel = Math.max(0, Math.min(15, Math.round(s.outputChannel)))
  s.roundsPerSession = Math.max(1, Math.min(100, Math.round(s.roundsPerSession)))
  if (s.inputChannel !== null) {
    s.inputChannel = Math.max(0, Math.min(15, Math.round(s.inputChannel)))
  }
  if (s.soundSource !== 'piano' && s.soundSource !== 'in-app' && s.soundSource !== 'both') {
    s.soundSource = DEFAULT_SETTINGS.soundSource
  }
  if (s.theme !== 'dark' && s.theme !== 'light') s.theme = DEFAULT_SETTINGS.theme
  return s
}
