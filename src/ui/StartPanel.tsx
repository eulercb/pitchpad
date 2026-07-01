import { useStore } from '../store'
import { game } from '../runtime'
import { noteName } from '../engine/notes'

export function StartPanel() {
  const settings = useStore((s) => s.settings)
  const pool = `${noteName(settings.rangeMin)}–${noteName(settings.rangeMax)}${
    settings.whiteOnly ? ' · white keys' : ''
  }`

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center">
      <div>
        <p className="font-display text-3xl">Ready when you are</p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted)]">
          {settings.roundsPerSession} rounds · {pool}
          <br />
          reference tone {settings.referenceTone ? 'on' : 'off'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => game.startSession()}
        className="rounded-full px-8 py-4 text-base font-semibold transition-transform duration-200 ease-[var(--ease-settle)] active:translate-y-0.5"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, var(--color-accent) 0%, var(--color-accent-dim) 82%)',
          color: 'var(--color-surface-inset)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.28), 0 6px 16px rgba(0,0,0,0.35)',
        }}
      >
        Start practice
      </button>
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
    </main>
  )
}
