// Pure layout math for the on-screen keyboard: given a MIDI range, place the
// white keys in equal slots and float the black keys over the slot boundaries.
import { isWhiteKey, range } from '../engine/notes'

export interface BlackKey {
  midi: number
  leftPercent: number
  widthPercent: number
}

export interface KeyboardLayout {
  whites: number[]
  blacks: BlackKey[]
  whiteCount: number
  /** horizontal center of a key as a 0–100 percentage of the keyboard width */
  centers: Record<number, number>
}

const BLACK_WIDTH_RATIO = 0.64

export function buildKeyboardLayout(min: number, max: number): KeyboardLayout {
  const all = range(min, max)
  const whites = all.filter(isWhiteKey)
  const whiteCount = Math.max(1, whites.length)
  const slot = 100 / whiteCount
  const blackWidth = slot * BLACK_WIDTH_RATIO

  const centers: Record<number, number> = {}
  whites.forEach((midi, i) => {
    centers[midi] = (i + 0.5) * slot
  })

  const blacks: BlackKey[] = []
  for (const midi of all) {
    if (isWhiteKey(midi)) continue
    // Anchor to the white key just below; fall back to the one just above
    // (range that begins on a black key).
    const leftIdx = whites.indexOf(midi - 1)
    const rightIdx = whites.indexOf(midi + 1)
    let boundary: number
    if (leftIdx >= 0) boundary = (leftIdx + 1) * slot
    else if (rightIdx >= 0) boundary = rightIdx * slot
    else continue // isolated black key with no white neighbor in range
    centers[midi] = boundary
    blacks.push({ midi, leftPercent: boundary - blackWidth / 2, widthPercent: blackWidth })
  }

  return { whites, blacks, whiteCount, centers }
}
