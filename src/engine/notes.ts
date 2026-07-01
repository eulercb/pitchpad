// Note math. Standardized on SCIENTIFIC PITCH NOTATION with C4 = MIDI 60,
// which makes A4 = 69 = 440 Hz. This constant is the anchor for everything below.
import type { MidiNote } from './types'

export const MIDDLE_C: MidiNote = 60 // C4
export const A4: MidiNote = 69
export const A4_FREQ = 440
export const MIDI_MIN = 0
export const MIDI_MAX = 127

const NOTE_CLASSES = [
  'C',
  'C♯', // C#
  'D',
  'D♯', // D#
  'E',
  'F',
  'F♯', // F#
  'G',
  'G♯', // G#
  'A',
  'A♯', // A#
  'B',
] as const

// pitch classes (n % 12) that are white keys on a piano
const WHITE_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11])

/** Positive modulo so negative MIDI numbers still map correctly. */
function pc(n: MidiNote): number {
  return ((Math.round(n) % 12) + 12) % 12
}

/** Pitch-class name with a Unicode sharp, e.g. 60 -> "C", 61 -> "C♯". */
export function noteClass(n: MidiNote): string {
  return NOTE_CLASSES[pc(n)]
}

/** Octave in scientific pitch notation: C4 (=60) -> 4. */
export function octaveOf(n: MidiNote): number {
  return Math.floor(Math.round(n) / 12) - 1
}

/** Full note name, e.g. 61 -> "C♯4", 69 -> "A4". */
export function noteName(n: MidiNote): string {
  return `${noteClass(n)}${octaveOf(n)}`
}

export function isWhiteKey(n: MidiNote): boolean {
  return WHITE_CLASSES.has(pc(n))
}

export function isBlackKey(n: MidiNote): boolean {
  return !isWhiteKey(n)
}

/** Equal-tempered frequency in Hz; used only by the fallback synth. */
export function freq(n: MidiNote): number {
  return A4_FREQ * 2 ** ((n - A4) / 12)
}

export function clampMidi(n: number): MidiNote {
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, Math.round(n)))
}

/**
 * Inclusive list of MIDI numbers from min..max. With `whiteOnly`, drops the
 * black keys. Returns [] if the range is inverted. Feeds both the target pool
 * and the on-screen keyboard.
 */
export function range(
  minMidi: MidiNote,
  maxMidi: MidiNote,
  opts: { whiteOnly?: boolean } = {},
): MidiNote[] {
  const lo = clampMidi(minMidi)
  const hi = clampMidi(maxMidi)
  const out: MidiNote[] = []
  for (let n = lo; n <= hi; n++) {
    if (opts.whiteOnly && !isWhiteKey(n)) continue
    out.push(n)
  }
  return out
}

/**
 * Signed semitone distance from target, formatted for the wrong-answer readout
 * (§5): e.g. played 62 vs target 60 -> "+2 ♯"; 59 vs 60 -> "−1 ♭".
 * Returns "" when they match. Direction sign uses ♯ (up) / ♭ (down).
 */
export function semitoneOffsetLabel(played: MidiNote, target: MidiNote): string {
  const delta = Math.round(played) - Math.round(target)
  if (delta === 0) return ''
  const arrow = delta > 0 ? '♯' : '♭' // sharp up / flat down
  const sign = delta > 0 ? '+' : '−' // U+2212 minus
  return `${sign}${Math.abs(delta)} ${arrow}`
}
