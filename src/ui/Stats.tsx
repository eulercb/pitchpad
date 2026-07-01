import { useGame } from '../hooks/useGame'
import { game } from '../runtime'

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        key={String(value)}
        className="anim-tick font-display-num text-[22px] leading-none"
        style={{ color: accent ? 'var(--color-accent)' : 'var(--color-text)' }}
      >
        {value}
      </span>
      <span className="label-caps mt-1 text-[10px] text-[color:var(--color-muted)]">{label}</span>
    </div>
  )
}

export function Stats() {
  const g = useGame()
  const roundNum = Math.min(g.roundIndex + 1, g.totalRounds)
  const nextLabel =
    g.phase === 'FEEDBACK_CORRECT' || g.phase === 'FEEDBACK_WRONG' ? 'Next' : 'Skip'

  return (
    <footer className="panel flex items-center justify-between rounded-t-[var(--radius-panel)] px-6 py-3">
      <Stat label="Round" value={`${roundNum}/${g.totalRounds}`} />
      <Stat label="Streak" value={g.streak} accent={g.streak > 0} />
      <Stat label="Score" value={g.score} />
      <button
        type="button"
        onClick={() => game.nextRound()}
        className="rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors"
        style={{ background: 'color-mix(in oklab, var(--color-accent) 16%, transparent)' }}
      >
        {nextLabel}
      </button>
    </footer>
  )
}
