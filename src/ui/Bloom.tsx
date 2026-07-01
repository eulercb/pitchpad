import type { CSSProperties } from 'react'

export type BloomVariant = 'idle' | 'strike' | 'hold'

interface BloomProps {
  variant: BloomVariant
  /** diameter in px */
  size: number
  /** override the glow color (defaults to the amber accent) */
  color?: string
  /** bump this to restart a `strike` animation (React remounts the node) */
  pulse?: number
  className?: string
}

// The resonance bloom: warm light radiating from where a note sounds.
// Purely decorative; positioned by its relative parent. Animates transform +
// opacity only (never blur/width) so it stays smooth on mid-range Android.
export function Bloom({ variant, size, color, pulse = 0, className }: BloomProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(color ? ({ ['--bloom-color']: color } as CSSProperties) : {}),
  }
  return (
    <span
      // remounting on each strike pulse restarts the CSS animation
      key={variant === 'strike' ? `strike-${pulse}` : variant}
      aria-hidden
      className={`bloom ${className ?? ''}`}
      data-bloom={variant === 'idle' ? undefined : variant}
      style={style}
    />
  )
}
