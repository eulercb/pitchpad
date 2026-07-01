import { useEffect, type ReactNode } from 'react'
import { useStore } from '../store'
import { useMidi } from '../hooks/useMidi'
import { usePwa } from '../pwa'
import { noteName } from '../engine/notes'
import { CloseGlyph } from './icons'
import type { Settings, SoundSource } from '../engine/types'

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const resetStats = useStore((s) => s.resetStats)
  const bestStreak = useStore((s) => s.bestStreak)
  const canInstall = usePwa((s) => s.canInstall)
  const install = usePwa((s) => s.install)
  const m = useMidi()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (patch: Partial<Settings>) => update(patch)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="scrim-enter absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="sheet-enter panel relative max-h-[86vh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ boxShadow: 'inset 0 1px 0 0 var(--color-hairline), 0 -12px 32px rgba(0,0,0,0.4)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[color:var(--color-surface)] px-5 pb-3 pt-4">
          <h2 className="font-display text-lg">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-9 w-9 place-items-center rounded-full text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 pt-2">
          <Section title="Sound">
            <Segmented<SoundSource>
              label="Sound source"
              value={settings.soundSource}
              options={[
                { value: 'piano', label: 'Piano' },
                { value: 'in-app', label: 'In-app' },
                { value: 'both', label: 'Both' },
              ]}
              onChange={(v) => set({ soundSource: v })}
            />
            <Hint>
              No sound from your piano? Switch on in-app sound, or check your piano’s Local
              Control / MIDI settings.
            </Hint>
            <Toggle
              label="Reference tone"
              hint="Play the anchor note before each target"
              checked={settings.referenceTone}
              onChange={(v) => set({ referenceTone: v })}
            />
            <Slider
              label="Note length"
              value={settings.noteDurationMs}
              min={300}
              max={3000}
              step={100}
              format={(v) => `${(v / 1000).toFixed(1)}s`}
              onChange={(v) => set({ noteDurationMs: v })}
            />
            <Slider
              label="Output volume"
              value={settings.outputVelocity}
              min={20}
              max={127}
              step={1}
              format={(v) => String(v)}
              onChange={(v) => set({ outputVelocity: v })}
            />
            <Toggle
              label="Success / fail cue"
              hint="A short sound on right/wrong (off keeps the ear clean)"
              checked={settings.audioCue}
              onChange={(v) => set({ audioCue: v })}
            />
          </Section>

          <Section title="Notes">
            <NoteStepper
              label="Lowest note"
              value={settings.rangeMin}
              onChange={(v) => set({ rangeMin: v })}
            />
            <NoteStepper
              label="Highest note"
              value={settings.rangeMax}
              onChange={(v) => set({ rangeMax: v })}
            />
            <Toggle
              label="White keys only"
              hint="Exclude the black keys from targets"
              checked={settings.whiteOnly}
              onChange={(v) => set({ whiteOnly: v })}
            />
            <Toggle
              label="Show note labels"
              hint="Print C–B on the keys"
              checked={settings.showNoteLabels}
              onChange={(v) => set({ showNoteLabels: v })}
            />
            <Stepper
              label="Rounds per session"
              value={settings.roundsPerSession}
              min={3}
              max={30}
              step={1}
              onChange={(v) => set({ roundsPerSession: v })}
            />
          </Section>

          <Section title="Device">
            <DeviceSelect
              label="MIDI input"
              devices={m.inputs.map((d) => d.name)}
              value={settings.inputDeviceName ?? m.selectedInputName}
              onChange={(name) => set({ inputDeviceName: name })}
            />
            <DeviceSelect
              label="MIDI output"
              devices={m.outputs.map((d) => d.name)}
              value={settings.outputDeviceName ?? m.selectedOutputName}
              onChange={(name) => set({ outputDeviceName: name })}
            />
            <ChannelSelect
              label="Input channel"
              value={settings.inputChannel}
              onChange={(v) => set({ inputChannel: v })}
            />
            <Stepper
              label="Output channel"
              value={settings.outputChannel + 1}
              min={1}
              max={16}
              step={1}
              onChange={(v) => set({ outputChannel: v - 1 })}
            />
          </Section>

          <Section title="Feel">
            <Toggle
              label="Haptics"
              hint="Buzz on right/wrong"
              checked={settings.haptics}
              onChange={(v) => set({ haptics: v })}
            />
            <Segmented
              label="Theme"
              value={settings.theme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ]}
              onChange={(v) => set({ theme: v })}
            />
          </Section>

          {canInstall && (
            <Section title="App">
              <Row label="Install PitchPad" hint="Add to your home screen, launch full-screen">
                <button
                  type="button"
                  onClick={() => void install()}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-surface-inset)' }}
                >
                  Install
                </button>
              </Row>
            </Section>
          )}

          <Section title="Stats">
            <Row label="Best streak" hint={`Your longest run of first-try answers`}>
              <span className="font-display-num text-xl">{bestStreak}</span>
            </Row>
            <button
              type="button"
              onClick={resetStats}
              className="self-start rounded-full px-4 py-2 text-sm text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-wrong)]"
            >
              Reset stats
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}

// ── building blocks ──────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="label-caps text-[11px] text-[color:var(--color-muted)]">{title}</h3>
      {children}
    </section>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-[color:var(--color-text)]">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[color:var(--color-muted)]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="-mt-2 text-xs leading-relaxed text-[color:var(--color-muted)]">{children}</p>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Row label={label} hint={hint}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-7 w-12 rounded-full transition-colors duration-200"
        style={{
          background: checked ? 'var(--color-accent)' : 'var(--color-surface-inset)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full transition-all duration-200 ease-[var(--ease-settle)]"
          style={{
            left: checked ? 26 : 4,
            background: checked ? 'var(--color-surface-inset)' : 'var(--color-muted)',
          }}
        />
      </button>
    </Row>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Row label={label}>
      <div
        className="flex gap-1 rounded-full p-1"
        style={{ background: 'var(--color-surface-inset)' }}
      >
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={on}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                background: on ? 'var(--color-accent)' : 'transparent',
                color: on ? 'var(--color-surface-inset)' : 'var(--color-muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </Row>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <Row label={label}>
      <div className="flex items-center gap-3">
        <StepBtn label="−" onClick={() => onChange(clamp(value - step))} disabled={value <= min} />
        <span className="w-12 text-center font-display-num text-lg">
          {format ? format(value) : value}
        </span>
        <StepBtn label="+" onClick={() => onChange(clamp(value + step))} disabled={value >= max} />
      </div>
    </Row>
  )
}

function StepBtn({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === '+' ? 'Increase' : 'Decrease'}
      className="grid h-9 w-9 place-items-center rounded-full text-lg text-[color:var(--color-text)] transition-opacity disabled:opacity-30"
      style={{ background: 'var(--color-surface-inset)' }}
    >
      {label}
    </button>
  )
}

function NoteStepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-3">
        <StepBtn label="−" onClick={() => onChange(Math.max(21, value - 1))} disabled={value <= 21} />
        <span className="w-14 text-center font-display text-lg">{noteName(value)}</span>
        <StepBtn label="+" onClick={() => onChange(Math.min(108, value + 1))} disabled={value >= 108} />
      </div>
    </Row>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[color:var(--color-text)]">{label}</p>
        <span className="font-display-num text-sm text-[color:var(--color-accent)]">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pp-range w-full"
      />
    </div>
  )
}

function DeviceSelect({
  label,
  devices,
  value,
  onChange,
}: {
  label: string
  devices: string[]
  value: string | null
  onChange: (name: string) => void
}) {
  const unique = Array.from(new Set(devices))
  return (
    <Row label={label}>
      {unique.length === 0 ? (
        <span className="text-xs text-[color:var(--color-muted)]">None</span>
      ) : (
        <select
          aria-label={label}
          value={value ?? unique[0]}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[9rem] rounded-lg px-3 py-2 text-sm text-[color:var(--color-text)]"
          style={{ background: 'var(--color-surface-inset)' }}
        >
          {unique.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}
    </Row>
  )
}

function ChannelSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <Row label={label} hint="Omni accepts any channel">
      <select
        aria-label={label}
        value={value === null ? 'omni' : String(value)}
        onChange={(e) => onChange(e.target.value === 'omni' ? null : Number(e.target.value))}
        className="rounded-lg px-3 py-2 text-sm text-[color:var(--color-text)]"
        style={{ background: 'var(--color-surface-inset)' }}
      >
        <option value="omni">Omni</option>
        {Array.from({ length: 16 }, (_, i) => (
          <option key={i} value={i}>
            {i + 1}
          </option>
        ))}
      </select>
    </Row>
  )
}
