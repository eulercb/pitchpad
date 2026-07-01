import { useMemo, useState, type PointerEvent } from 'react'
import { noteName } from '../engine/notes'
import { buildKeyboardLayout } from './keyboardLayout'
import { Bloom } from './Bloom'

export interface RevealTarget {
  midi: number
  kind: 'wrong' | 'correct'
}

interface KeyboardProps {
  min: number
  max: number
  answered: number | null
  reveal: RevealTarget | null
  interactive: boolean
  showLabels: boolean
  onPress: (midi: number) => void
}

const WHITE_H = 156
const BLACK_H = 98
const CORRECT = 'var(--color-correct)'

// The chunky, dimensional octave. A co-equal craft object: used both as the
// tap-to-answer fallback and to reveal the correct key on a miss (§6).
export function Keyboard({ min, max, answered, reveal, interactive, showLabels, onPress }: KeyboardProps) {
  const layout = useMemo(() => buildKeyboardLayout(min, max), [min, max])
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set())

  const press = (midi: number) => {
    if (!interactive) return
    setPressed((p) => new Set(p).add(midi))
    onPress(midi)
  }
  const release = (midi: number) =>
    setPressed((p) => {
      if (!p.has(midi)) return p
      const next = new Set(p)
      next.delete(midi)
      return next
    })

  const down = (midi: number) => (e: PointerEvent) => {
    e.preventDefault()
    press(midi)
  }
  const up = (midi: number) => () => release(midi)

  const keyState = (midi: number): string => {
    if (reveal?.midi === midi) return reveal.kind === 'correct' ? 'reveal-correct' : 'reveal'
    if (answered === midi) return 'answered'
    return 'rest'
  }

  return (
    <div className="keyboard panel rounded-t-[var(--radius-panel)] px-2 pb-2 pt-3">
      <div
        className="relative"
        style={{ height: WHITE_H }}
        role="group"
        aria-label="On-screen piano keyboard"
      >
        {/* reveal glow + note name, floated above the keyboard */}
        {reveal && (
          <>
            <span
              className="pointer-events-none absolute -top-9 z-20 -translate-x-1/2 font-display text-lg"
              style={{
                left: `${layout.centers[reveal.midi] ?? 50}%`,
                color: reveal.kind === 'correct' ? CORRECT : 'var(--color-accent)',
              }}
            >
              {noteName(reveal.midi)}
            </span>
            <span
              className="pointer-events-none absolute z-0"
              style={{ left: `${layout.centers[reveal.midi] ?? 50}%`, top: 14 }}
            >
              <Bloom
                variant={reveal.kind === 'correct' ? 'strike' : 'hold'}
                size={168}
                color={reveal.kind === 'correct' ? CORRECT : undefined}
                pulse={reveal.midi}
              />
            </span>
          </>
        )}

        {/* white keys */}
        <div className="flex h-full gap-[2px]">
          {layout.whites.map((midi) => {
            const state = keyState(midi)
            const isPressed = pressed.has(midi) || state === 'answered'
            return (
              <button
                key={midi}
                type="button"
                aria-label={noteName(midi)}
                aria-disabled={!interactive}
                data-state={state}
                onPointerDown={down(midi)}
                onPointerUp={up(midi)}
                onPointerLeave={up(midi)}
                onPointerCancel={up(midi)}
                className="relative z-10 flex flex-1 items-end justify-center rounded-b-[10px] pb-2 transition-transform duration-200 ease-[var(--ease-settle)]"
                style={{
                  height: WHITE_H,
                  touchAction: 'none',
                  background: isPressed ? 'var(--color-key-white-press)' : 'var(--color-key-white)',
                  transform: isPressed ? 'translateY(5px)' : 'none',
                  boxShadow: keyShadowWhite(state, isPressed),
                }}
              >
                {showLabels && (
                  <span className="label-caps text-[10px] text-[color:var(--color-surface-inset)] opacity-70">
                    {noteName(midi)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* black keys */}
        {layout.blacks.map((b) => {
          const state = keyState(b.midi)
          const isPressed = pressed.has(b.midi) || state === 'answered'
          return (
            <button
              key={b.midi}
              type="button"
              aria-label={noteName(b.midi)}
              aria-disabled={!interactive}
              data-state={state}
              onPointerDown={down(b.midi)}
              onPointerUp={up(b.midi)}
              onPointerLeave={up(b.midi)}
              onPointerCancel={up(b.midi)}
              className="absolute top-0 z-30 rounded-b-[6px] transition-transform duration-200 ease-[var(--ease-settle)]"
              style={{
                left: `${b.leftPercent}%`,
                width: `${b.widthPercent}%`,
                height: BLACK_H,
                touchAction: 'none',
                background: isPressed ? 'var(--color-key-black-press)' : 'var(--color-key-black)',
                transform: isPressed ? 'translateY(4px)' : 'none',
                boxShadow: keyShadowBlack(state, isPressed),
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function keyShadowWhite(state: string, pressed: boolean): string {
  const bevel = pressed
    ? 'inset 0 1px 0 0 var(--color-key-bevel), inset 0 -2px 0 0 rgba(0,0,0,0.28)'
    : 'inset 0 2px 0 0 var(--color-key-bevel), inset 0 -5px 0 0 rgba(0,0,0,0.22)'
  if (state === 'reveal') return `${bevel}, 0 0 0 2px var(--color-accent)`
  if (state === 'reveal-correct') return `${bevel}, 0 0 0 2px ${CORRECT}`
  if (state === 'answered') return `${bevel}, 0 0 0 2px var(--color-wrong)`
  return bevel
}

function keyShadowBlack(state: string, pressed: boolean): string {
  const bevel = pressed
    ? 'inset 0 -1px 0 0 rgba(255,255,255,0.05)'
    : 'inset 0 -3px 0 0 rgba(255,255,255,0.06), 0 3px 5px rgba(0,0,0,0.45)'
  if (state === 'reveal') return `${bevel}, 0 0 0 2px var(--color-accent)`
  if (state === 'reveal-correct') return `${bevel}, 0 0 0 2px ${CORRECT}`
  if (state === 'answered') return `${bevel}, 0 0 0 2px var(--color-wrong)`
  return bevel
}
