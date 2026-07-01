import { describe, it, expect } from 'vitest'
import {
  MIDDLE_C,
  A4,
  freq,
  isBlackKey,
  isWhiteKey,
  noteClass,
  noteName,
  octaveOf,
  range,
  semitoneOffsetLabel,
  clampMidi,
} from './notes'

describe('note anchors', () => {
  it('pins C4 = 60 and A4 = 69', () => {
    expect(MIDDLE_C).toBe(60)
    expect(A4).toBe(69)
    expect(noteName(60)).toBe('C4')
    expect(noteName(69)).toBe('A4')
  })
})

describe('noteName / noteClass / octaveOf', () => {
  it('names naturals and sharps with the correct octave', () => {
    expect(noteName(60)).toBe('C4')
    expect(noteName(61)).toBe('C♯4')
    expect(noteName(71)).toBe('B4')
    expect(noteName(72)).toBe('C5')
    expect(noteName(21)).toBe('A0') // lowest piano key
    expect(noteName(108)).toBe('C8') // highest piano key
  })

  it('handles the octave boundary (B->C rolls the octave)', () => {
    expect(octaveOf(59)).toBe(3) // B3
    expect(octaveOf(60)).toBe(4) // C4
    expect(noteClass(59)).toBe('B')
    expect(noteClass(60)).toBe('C')
  })

  it('is robust to notes below C0', () => {
    // MIDI 0 = C-1 in scientific pitch notation
    expect(noteName(0)).toBe('C-1')
    expect(noteClass(0)).toBe('C')
  })
})

describe('white / black keys', () => {
  it('classifies the C-major octave correctly', () => {
    const white = [60, 62, 64, 65, 67, 69, 71] // C D E F G A B
    const black = [61, 63, 66, 68, 70] // C# D# F# G# A#
    for (const n of white) {
      expect(isWhiteKey(n)).toBe(true)
      expect(isBlackKey(n)).toBe(false)
    }
    for (const n of black) {
      expect(isBlackKey(n)).toBe(true)
      expect(isWhiteKey(n)).toBe(false)
    }
  })
})

describe('freq', () => {
  it('returns 440 Hz at A4 and doubles per octave', () => {
    expect(freq(69)).toBeCloseTo(440, 6)
    expect(freq(81)).toBeCloseTo(880, 6) // A5
    expect(freq(57)).toBeCloseTo(220, 6) // A3
  })

  it('gives middle C ~261.63 Hz', () => {
    expect(freq(60)).toBeCloseTo(261.6256, 3)
  })
})

describe('range', () => {
  it('produces the default white-key pool C4–B4', () => {
    expect(range(60, 71, { whiteOnly: true })).toEqual([60, 62, 64, 65, 67, 69, 71])
  })

  it('includes accidentals when whiteOnly is off', () => {
    expect(range(60, 63)).toEqual([60, 61, 62, 63])
  })

  it('is inclusive of both ends', () => {
    expect(range(60, 60)).toEqual([60])
  })

  it('returns [] for an inverted range', () => {
    expect(range(71, 60)).toEqual([])
  })

  it('clamps out-of-bounds inputs into 0..127', () => {
    expect(range(-5, -3)).toEqual([0])
    expect(range(126, 130)).toEqual([126, 127])
  })
})

describe('semitoneOffsetLabel', () => {
  it('is empty when the answer matches', () => {
    expect(semitoneOffsetLabel(60, 60)).toBe('')
  })

  it('signs sharp for above, flat for below', () => {
    expect(semitoneOffsetLabel(62, 60)).toBe('+2 ♯')
    expect(semitoneOffsetLabel(59, 60)).toBe('−1 ♭')
    expect(semitoneOffsetLabel(72, 60)).toBe('+12 ♯')
  })
})

describe('clampMidi', () => {
  it('rounds and clamps to 0..127', () => {
    expect(clampMidi(60.4)).toBe(60)
    expect(clampMidi(-10)).toBe(0)
    expect(clampMidi(200)).toBe(127)
  })
})
