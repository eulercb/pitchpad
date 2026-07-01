// Thin, safe wrapper over the Vibration API. No-op where unsupported.
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    /* some browsers throw if called too early / without a gesture */
  }
}

// Distinct patterns fired on the motion's settle peak (§4).
export const HAPTIC_CORRECT = 18
export const HAPTIC_WRONG = [22, 60, 22]
