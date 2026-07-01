import type { CSSProperties } from 'react'

export type RingState = 'idle' | 'listening' | 'correct' | 'wrong'

interface FeedbackRingProps {
  state: RingState
  size?: number
}

const R = 100
const CIRC = 2 * Math.PI * R

// The ring encircling the round-view center. Shape is the load-bearing,
// colorblind-safe channel: a SOLID unbroken ring for correct, a BROKEN /
// segmented ring for wrong (§5). Color is redundant.
export function FeedbackRing({ state, size = 220 }: FeedbackRingProps) {
  const common = {
    cx: 110,
    cy: 110,
    r: R,
    fill: 'none',
    strokeLinecap: 'round' as const,
  }

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      {/* faint resting track */}
      <circle {...common} stroke="var(--color-hairline)" strokeWidth={2} opacity={0.5} />

      {state === 'listening' && (
        <circle
          {...common}
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="2 10"
          opacity={0.7}
          transform="rotate(-90 110 110)"
        />
      )}

      {state === 'correct' && (
        <circle
          {...common}
          stroke="var(--color-correct)"
          strokeWidth={3.5}
          className="ring-draw"
          style={{ ['--circ']: `${CIRC}`, strokeDasharray: CIRC } as CSSProperties}
          transform="rotate(-90 110 110)"
        />
      )}

      {state === 'wrong' && (
        // segmented double-stroke — distinct in shape from the solid correct ring
        <circle
          {...common}
          stroke="var(--color-wrong)"
          strokeWidth={3.5}
          strokeDasharray="4 11"
          transform="rotate(-90 110 110)"
        />
      )}
    </svg>
  )
}
