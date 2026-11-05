import { useState } from 'react'
import type { GameMode } from '../engine/types'
import { CURRICULUM, MASTERY_STREAK } from '../engine/learning'
import { useStore } from '../store'
import { game, connectScreen, changeInstrument } from '../runtime'
import { noteName } from '../engine/notes'

export function StartPanel() {
  const settings = useStore((s) => s.settings)
  const learning = useStore((s) => s.learning)
  const challengeBest = useStore((s) => s.challengeBest)
  const [mode, setMode] = useState<GameMode>('learning')
  const pool = `${noteName(settings.rangeMin)}–${noteName(settings.rangeMax)}${
    settings.whiteOnly ? ' · white keys' : ''
  }`

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-6 text-center">
      <div>
        <p className="font-display text-3xl">Ready when you are</p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted)]">
          {mode === 'practice' ? `${settings.roundsPerSession} rounds · ${pool} · reference ${settings.referenceTone ? 'on' : 'off'}` :
            mode === 'learning' ? 'Build your ear one note at a time. Your progress is saved on this device.' :
            'One mistake ends the run. Every 3 correct answers adds notes and shortens the tone.'}
        </p>
      </div>
      <div role="group" aria-label="Practice mode" className="grid w-full max-w-sm grid-cols-3 gap-2">
        {(['learning', 'practice', 'challenge'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
            className="rounded-xl border px-2 py-3 text-sm capitalize"
            style={{ borderColor: mode === value ? 'var(--color-accent)' : 'var(--color-hairline)',
              background: mode === value ? 'var(--color-surface)' : 'transparent' }}>
            {value === 'challenge' ? 'Endless' : value}
          </button>
        ))}
      </div>
      {mode === 'learning' && <div className="max-w-sm text-sm text-[color:var(--color-muted)]">
        <p>Step {learning.unlocked - 2} · {settings.roundsPerSession} rounds · C4 reference</p>
        <p className="mt-2">Get each note right {MASTERY_STREAK} times in a row without help to unlock the next.
          Missed notes get extra review; earlier notes stay in the mix.</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Learning progress">
          {CURRICULUM.slice(0, learning.unlocked).map((note) => <li key={note}
            className="rounded-lg bg-[color:var(--color-surface)] px-2 py-1">
            {noteName(note)} · {Math.min(MASTERY_STREAK, learning.perNote[note]?.streak ?? 0)}/{MASTERY_STREAK}
          </li>)}
        </ul>
      </div>}
      {mode === 'challenge' && <p className="max-w-sm text-sm text-[color:var(--color-muted)]">
        Best score: {challengeBest}. Starts with C4, D4 and E4, grows to two chromatic octaves,
        then keeps shortening the tone down to 200 ms. The reference disappears after 12 points.
        No skips or reveals. Replay is available.
      </p>}

      <button
        type="button"
        onClick={() => game.startSession(mode)}
        className="rounded-full px-8 py-4 text-base font-semibold transition-transform duration-200 ease-[var(--ease-settle)] active:translate-y-0.5"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, var(--color-accent) 0%, var(--color-accent-dim) 82%)',
          color: 'var(--color-surface-inset)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.28), 0 6px 16px rgba(0,0,0,0.35)',
        }}
      >
        {mode === 'learning' ? 'Start learning' : mode === 'challenge' ? 'Start challenge' : 'Start practice'}
      </button>
      <button type="button" onClick={changeInstrument}
        className="px-4 py-2 text-sm text-[color:var(--color-muted)]">Change instrument</button>
    </main>
  )
}

export function PausedPanel() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-10 text-center">
      <span
        className="listen-dot h-3 w-3 rounded-full"
        style={{ background: 'var(--color-wrong)', boxShadow: '0 0 10px var(--color-wrong)' }}
        aria-hidden
      />
      <div>
        <p className="font-display text-2xl">Paused</p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted)]" aria-live="polite">
          Your piano dropped off. Reconnect it over USB and we’ll pick right back up.
        </p>
      </div>
      <button type="button" onClick={() => void connectScreen()} className="rounded-full border px-6 py-3">
        Continue on screen
      </button>
    </main>
  )
}
