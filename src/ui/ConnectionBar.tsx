import { useMidi } from '../hooks/useMidi'
import { GearGlyph } from './icons'
import type { MidiState } from '../engine/types'

function present(m: MidiState): { color: string; label: string; pulse: boolean } {
  switch (m.status) {
    case 'CONNECTED':
      return {
        color: 'var(--color-correct)',
        label: m.selectedOutputName ?? m.selectedInputName ?? 'Connected',
        pulse: false,
      }
    case 'CONNECTING':
      return { color: 'var(--color-accent)', label: 'Connecting…', pulse: true }
    case 'DISCONNECTED_MIDSESSION':
      return { color: 'var(--color-wrong)', label: 'Reconnect your piano', pulse: true }
    default:
      return { color: 'var(--color-muted)', label: 'Not connected', pulse: false }
  }
}

export function ConnectionBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const m = useMidi()
  const { color, label, pulse } = present(m)

  return (
    <header className="panel flex items-center gap-3 rounded-b-[var(--radius-panel)] px-4 py-3">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${pulse ? 'listen-dot' : ''}`}
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        aria-hidden
      />
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-display text-base">PitchPad</span>
        <span className="label-caps truncate text-[11px] text-[color:var(--color-muted)]">
          {label}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings"
        className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-text)]"
      >
        <GearGlyph />
      </button>
    </header>
  )
}
