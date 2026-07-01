import { useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useGame'
import { useStore } from '../store'
import { game, sound } from '../runtime'
import { noteName, semitoneOffsetLabel } from '../engine/notes'
import { Bloom } from './Bloom'
import { FeedbackRing, type RingState } from './FeedbackRing'
import { ReplayGlyph, CheckGlyph, CrossGlyph } from './icons'
import { vibrate, HAPTIC_CORRECT, HAPTIC_WRONG } from './haptics'
import type { GamePhase } from '../engine/types'

function ringStateFor(phase: GamePhase): RingState {
  if (phase === 'AWAITING_ANSWER') return 'listening'
  if (phase === 'FEEDBACK_CORRECT') return 'correct'
  if (phase === 'FEEDBACK_WRONG') return 'wrong'
  return 'idle'
}

function wordFor(phase: GamePhase): string {
  switch (phase) {
    case 'PLAYING_REFERENCE':
      return 'Reference'
    case 'PLAYING_TARGET':
      return 'Listen'
    case 'AWAITING_ANSWER':
      return 'Find it'
    case 'FEEDBACK_CORRECT':
      return 'Right'
    case 'FEEDBACK_WRONG':
      return 'Not quite'
    default:
      return ''
  }
}

export function RoundView() {
  const g = useGame()
  const settings = useStore((s) => s.settings)
  const [echoPulse, setEchoPulse] = useState(0)
  // null so the very first note (the round-1 reference) still triggers an echo
  const prevPhase = useRef<GamePhase | null>(null)

  // Resonance echo in the center: bloom each time a note sounds.
  useEffect(() => {
    const phase = g.phase
    if (
      phase !== prevPhase.current &&
      (phase === 'PLAYING_REFERENCE' || phase === 'PLAYING_TARGET')
    ) {
      setEchoPulse((p) => p + 1)
    }
    prevPhase.current = phase
  }, [g.phase])

  // Haptics + optional audio cue on feedback. Keyed on the attempt count, not
  // just the phase, so a *second* wrong answer in the same round also fires.
  const fedbackAttempt = useRef(0)
  useEffect(() => {
    const inFeedback = g.phase === 'FEEDBACK_CORRECT' || g.phase === 'FEEDBACK_WRONG'
    if (inFeedback && g.attemptsThisRound !== fedbackAttempt.current) {
      fedbackAttempt.current = g.attemptsThisRound
      if (g.phase === 'FEEDBACK_CORRECT') {
        if (settings.haptics) vibrate(HAPTIC_CORRECT)
        if (settings.audioCue) sound.cue('correct')
      } else {
        if (settings.haptics) vibrate(HAPTIC_WRONG)
        if (settings.audioCue) sound.cue('wrong')
      }
    } else if (!inFeedback) {
      fedbackAttempt.current = 0
    }
  }, [g.phase, g.attemptsThisRound, settings.haptics, settings.audioCue])

  const ringState = ringStateFor(g.phase)
  const word = wordFor(g.phase)
  const wordColor =
    g.phase === 'FEEDBACK_CORRECT'
      ? 'var(--color-correct)'
      : g.phase === 'FEEDBACK_WRONG'
        ? 'var(--color-wrong)'
        : 'var(--color-text)'
  const canReplay = g.phase === 'AWAITING_ANSWER' || g.phase === 'FEEDBACK_WRONG'
  const offset =
    g.lastAnswer != null && g.target != null ? semitoneOffsetLabel(g.lastAnswer, g.target) : ''

  const announce =
    g.phase === 'FEEDBACK_CORRECT' && g.target != null
      ? `Correct. That was ${noteName(g.target)}.`
      : g.phase === 'FEEDBACK_WRONG' && g.target != null && g.lastAnswer != null
        ? `Not quite. You played ${noteName(g.lastAnswer)}. The note was ${noteName(g.target)}.`
        : ''

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-7 px-6">
      <p className="sr-only" role="status" aria-live="assertive">
        {announce}
      </p>
      <div key={`${g.phase}-${g.roundIndex}`} className="anim-settle-in text-center">
        <p className="font-display text-[34px] leading-none" style={{ color: wordColor }}>
          {word}
        </p>
        <div className="mt-3 flex h-5 items-center justify-center gap-2 text-sm text-[color:var(--color-muted)]">
          {g.phase === 'AWAITING_ANSWER' && (
            <span
              className="listen-dot inline-block h-2 w-2 rounded-full"
              style={{ background: 'var(--color-accent)' }}
              aria-hidden
            />
          )}
          <span aria-live="polite">{subLine(g.phase, g.target)}</span>
        </div>
      </div>

      <div
        className={`relative ${g.phase === 'FEEDBACK_CORRECT' ? 'anim-bounce' : ''}`}
        style={{ width: 220, height: 220 }}
      >
        <Bloom variant={echoPulse > 0 ? 'strike' : 'idle'} size={196} pulse={echoPulse} />
        <FeedbackRing state={ringState} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <ReplayButton disabled={!canReplay} onReplay={() => game.replay()} />
        </div>
        {/* spec-mandated shape channel: a check / X badge on the ring (§5) */}
        {(g.phase === 'FEEDBACK_CORRECT' || g.phase === 'FEEDBACK_WRONG') && (
          <span
            key={`glyph-${g.phase}-${g.attemptsThisRound}`}
            aria-hidden
            className={`absolute left-1/2 top-0 z-30 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${
              g.phase === 'FEEDBACK_WRONG' ? 'anim-shake' : 'anim-settle-in'
            }`}
            style={{
              background: 'var(--color-surface)',
              color:
                g.phase === 'FEEDBACK_CORRECT' ? 'var(--color-correct)' : 'var(--color-wrong)',
              boxShadow: `inset 0 1px 0 var(--color-hairline), 0 0 0 2px ${
                g.phase === 'FEEDBACK_CORRECT' ? 'var(--color-correct)' : 'var(--color-wrong)'
              }`,
            }}
          >
            {g.phase === 'FEEDBACK_CORRECT' ? <CheckGlyph size={22} /> : <CrossGlyph size={20} />}
          </span>
        )}
      </div>

      {/* wrong-answer teaching cue: how far off, and which direction */}
      <div className="flex h-12 items-center justify-center">
        {g.phase === 'FEEDBACK_WRONG' && g.lastAnswer != null && (
          <div className="text-center">
            <span className="font-display-num text-2xl" style={{ color: 'var(--color-wrong)' }}>
              {offset || `${noteName(g.lastAnswer)}`}
            </span>
            <span className="ml-2 text-sm text-[color:var(--color-muted)]">
              you played {noteName(g.lastAnswer)}
            </span>
          </div>
        )}
        {g.phase === 'FEEDBACK_CORRECT' && g.target != null && (
          <p className="text-sm text-[color:var(--color-muted)]">that was {noteName(g.target)}</p>
        )}
      </div>
    </section>
  )
}

function subLine(phase: GamePhase, target: number | null): string {
  switch (phase) {
    case 'PLAYING_REFERENCE':
      return 'here’s your anchor'
    case 'PLAYING_TARGET':
      return 'hear the note'
    case 'AWAITING_ANSWER':
      return 'play the note you heard'
    default:
      return target != null ? '' : ''
  }
}

function ReplayButton({ disabled, onReplay }: { disabled: boolean; onReplay: () => void }) {
  const [down, setDown] = useState(false)
  return (
    <button
      type="button"
      aria-label="Replay the note"
      disabled={disabled}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onClick={onReplay}
      className="flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-settle)] disabled:opacity-45"
      style={{
        background:
          'radial-gradient(circle at 50% 38%, var(--color-accent) 0%, var(--color-accent-dim) 78%)',
        color: 'var(--color-surface-inset)',
        transform: down && !disabled ? 'translateY(2px)' : 'none',
        boxShadow: down
          ? 'inset 0 2px 6px rgba(0,0,0,0.4)'
          : 'inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -3px 8px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.35)',
      }}
    >
      <ReplayGlyph size={34} />
      <span className="label-caps mt-1 text-[11px]">Replay</span>
    </button>
  )
}
