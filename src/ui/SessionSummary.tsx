import { useGame } from '../hooks/useGame'
import { game } from '../runtime'
import { noteName } from '../engine/notes'
import type { GameState } from '../engine/types'

function weakestNotes(g: GameState): string[] {
  const entries = Object.entries(g.perNote).filter(([, t]) => t.attempts > 0)
  if (entries.length === 0) return []
  let worst = 1.1
  for (const [, t] of entries) worst = Math.min(worst, t.correct / t.attempts)
  if (worst >= 1) return [] // nothing missed on the first try
  return entries
    .filter(([, t]) => t.correct / t.attempts === worst)
    .map(([midi]) => noteName(Number(midi)))
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display-num text-4xl">{value}</span>
      <span className="label-caps mt-1 text-[11px] text-[color:var(--color-muted)]">{label}</span>
    </div>
  )
}

export function SessionSummary() {
  const g = useGame()
  const total = g.results.length || g.totalRounds
  const firstTry = g.results.filter((r) => r.correct && r.firstTry).length
  const accuracy = total > 0 ? Math.round((firstTry / total) * 100) : 0
  const weak = weakestNotes(g)

  return (
    <main className="anim-settle-in flex min-h-full flex-col items-center justify-center gap-9 px-8 text-center">
      <div>
        <p className="label-caps text-xs text-[color:var(--color-muted)]">Session complete</p>
        <p className="mt-2 font-display text-4xl">
          {firstTry}/{total} on the first try
        </p>
      </div>

      <div className="flex items-start justify-center gap-10">
        <BigStat value={`${accuracy}%`} label="Accuracy" />
        <BigStat value={String(g.bestStreak)} label="Best streak" />
      </div>

      <div className="max-w-xs text-sm text-[color:var(--color-muted)]">
        {weak.length === 0 ? (
          <p>Clean run — nothing tripped you up. Nice ear.</p>
        ) : (
          <p>
            Trickiest for you: <span className="text-[color:var(--color-accent)]">{weak.join(', ')}</span>. Worth another round.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
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
          Play again
        </button>
        <button
          type="button"
          onClick={() => game.endSession()}
          className="px-4 py-2 text-sm text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-text)]"
        >
          Back to start
        </button>
      </div>
    </main>
  )
}
