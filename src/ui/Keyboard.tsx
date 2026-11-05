import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { noteName } from '../engine/notes'
import { buildKeyboardLayout } from './keyboardLayout'
import { Bloom } from './Bloom'

export interface RevealTarget {
  midi: number
  kind: 'wrong' | 'correct'
}

interface KeyboardProps {
  enabledNotes?: number[]
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
const TAP_SLOP = 10

// The chunky, dimensional octave. A co-equal craft object: used both as the
// tap-to-answer fallback and to reveal the correct key on a miss (§6).
export function Keyboard({ enabledNotes, min, max, answered, reveal, interactive, showLabels, onPress }: KeyboardProps) {
  const layout = useMemo(() => buildKeyboardLayout(min, max), [min, max])
  const [pressed, setPressed] = useState<ReadonlySet<number>>(() => new Set())
  const pointers = useRef(new Map<number, { midi: number; x: number; y: number }>())

  useEffect(() => {
    // A MIDI answer or a new prompt can disable keys before pointer-up arrives.
    pointers.current.clear()
    setPressed(new Set())
  }, [interactive, min, max])

  const press = (midi: number) => {
    if (!interactive || (enabledNotes && !enabledNotes.includes(midi))) return
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
    if (!interactive || e.button !== 0 || (enabledNotes && !enabledNotes.includes(midi))) return
    pointers.current.set(e.pointerId, { midi, x: e.clientX, y: e.clientY })
    setPressed((p) => new Set(p).add(midi))
  }
  const cancel = (midi: number) => (e: PointerEvent) => {
    pointers.current.delete(e.pointerId)
    release(midi)
  }
  const move = (midi: number) => (e: PointerEvent) => {
    const start = pointers.current.get(e.pointerId)
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP) cancel(midi)(e)
  }
  const up = (midi: number) => (e: PointerEvent) => {
    const start = pointers.current.get(e.pointerId)
    // Let native horizontal panning finish without turning the gesture into a guess.
    if (start?.midi === midi && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= TAP_SLOP) press(midi)
    cancel(midi)(e)
  }

  const keyState = (midi: number): string => {
    if (reveal?.midi === midi) return reveal.kind === 'correct' ? 'reveal-correct' : 'reveal'
    if (answered === midi) return 'answered'
    return 'rest'
  }

  return (
    <div className="keyboard panel shrink-0 rounded-t-[var(--radius-panel)]">
      <div className="flex h-8 items-center justify-center font-display text-lg">
        {reveal && <span style={{ color: reveal.kind === 'correct' ? CORRECT : 'var(--color-accent)' }}>
          {noteName(reveal.midi)}
        </span>}
      </div>
      <div className="overflow-x-auto px-2 pb-2" data-keyboard-scroll>
        <div
          className="relative"
          style={{ height: WHITE_H, minWidth: layout.whites.length * 38 }}
          role="group"
          aria-label="On-screen piano keyboard"
        >
          {/* The feedback glow follows its key; the name stays outside the scroller. */}
          {reveal && (
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
                  disabled={!interactive || (enabledNotes && !enabledNotes.includes(midi))}
                  data-state={state}
                  onClick={(e) => { if (e.detail === 0) { press(midi); release(midi) } }}
                  onPointerDown={down(midi)}
                  onPointerMove={move(midi)}
                  onPointerUp={up(midi)}
                  onPointerLeave={cancel(midi)}
                  onPointerCancel={cancel(midi)}
                  className="relative z-10 flex flex-1 items-end justify-center rounded-b-[10px] pb-2 transition-transform duration-200 ease-[var(--ease-settle)]"
                  style={{
                    height: WHITE_H,
                    touchAction: 'pan-x',
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
                disabled={!interactive || (enabledNotes && !enabledNotes.includes(b.midi))}
                data-state={state}
                onClick={(e) => { if (e.detail === 0) { press(b.midi); release(b.midi) } }}
                onPointerDown={down(b.midi)}
                onPointerMove={move(b.midi)}
                onPointerUp={up(b.midi)}
                onPointerLeave={cancel(b.midi)}
                onPointerCancel={cancel(b.midi)}
                className="absolute top-0 z-30 rounded-b-[6px] transition-transform duration-200 ease-[var(--ease-settle)]"
                style={{
                  left: `${b.leftPercent}%`,
                  width: `${b.widthPercent}%`,
                  height: BLACK_H,
                  touchAction: 'pan-x',
                  background: isPressed ? 'var(--color-key-black-press)' : 'var(--color-key-black)',
                  transform: isPressed ? 'translateY(4px)' : 'none',
                  boxShadow: keyShadowBlack(state, isPressed),
                }}
              />
            )
          })}
        </div>
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
