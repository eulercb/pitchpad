import { describe, it, expect } from 'vitest'
import { buildKeyboardLayout } from './keyboardLayout'

describe('buildKeyboardLayout', () => {
  it('lays out one octave C4–B4', () => {
    const l = buildKeyboardLayout(60, 71)
    expect(l.whites).toEqual([60, 62, 64, 65, 67, 69, 71])
    expect(l.whiteCount).toBe(7)
    expect(l.blacks.map((b) => b.midi)).toEqual([61, 63, 66, 68, 70])
  })

  it('gives every key a center within 0–100%', () => {
    const l = buildKeyboardLayout(60, 71)
    for (let n = 60; n <= 71; n++) {
      expect(l.centers[n]).toBeGreaterThanOrEqual(0)
      expect(l.centers[n]).toBeLessThanOrEqual(100)
    }
    // C4 is the first of seven slots → center ≈ 7.14%
    expect(l.centers[60]).toBeCloseTo(100 / 7 / 2, 3)
  })

  it('positions black keys on the white-key boundaries', () => {
    const l = buildKeyboardLayout(60, 71)
    const cSharp = l.blacks.find((b) => b.midi === 61)!
    // sits over the C|D boundary = 1/7 of the width
    expect(cSharp.leftPercent + cSharp.widthPercent / 2).toBeCloseTo(100 / 7, 3)
  })

  it('drops a leading black key with no white neighbor below it', () => {
    // range starting on C#4 (61): its lower white (C4=60) is out of range
    const l = buildKeyboardLayout(61, 62)
    // 61 anchors to the white above (D4=62) instead of being dropped
    expect(l.whites).toEqual([62])
    expect(l.blacks.map((b) => b.midi)).toEqual([61])
  })
})
