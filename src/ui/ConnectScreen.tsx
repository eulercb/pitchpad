import { useState } from 'react'
import { useMidi } from '../hooks/useMidi'
import { connect, connectScreen } from '../runtime'
import { Bloom } from './Bloom'
import type { ConnectionStatus } from '../engine/types'

// Friendly, specific copy for every connection state (§6.6) — never a blank screen.
function help(status: ConnectionStatus): { title: string; body: string } {
  switch (status) {
    case 'UNSUPPORTED':
      return {
        title: 'Play on screen instead',
        body: 'PitchPad talks to your piano over Web MIDI, which this browser doesn’t support. You can still train with the on-screen keyboard and built-in sound.',
      }
    case 'PERMISSION_DENIED':
      return {
        title: 'Play without MIDI access',
        body: 'Play on screen with built-in sound, or try connecting your piano again and allow MIDI access.',
      }
    case 'NO_DEVICE':
      return {
        title: 'No piano? Play on screen.',
        body: 'Use the on-screen keyboard and built-in sound, or plug in and power on a USB-MIDI piano to try connecting again.',
      }
    default:
      return {
        title: 'Hear it. Find it. Play it back.',
        body: 'Train your ear with the on-screen keyboard and built-in sound. No piano or MIDI permission needed. You can also connect your own digital piano.',
      }
  }
}

export function ConnectScreen() {
  const m = useMidi()
  const [busy, setBusy] = useState(false)
  const { title, body } = help(m.status)
  const unsupported = m.status === 'UNSUPPORTED'
  const isRetry = m.status === 'PERMISSION_DENIED' || m.status === 'NO_DEVICE'

  const onConnect = async () => {
    setBusy(true)
    try {
      await connect()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-full flex-col items-center gap-6 px-6 py-8 text-center">
      <div className="relative mt-auto flex shrink-0 flex-col items-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
          <Bloom variant="strike" size={260} pulse={1} />
        </div>
        <h1 className="font-display text-5xl">PitchPad</h1>
      </div>

      <div className="max-w-xs">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted)]">{body}</p>
      </div>

      <button type="button" onClick={() => void connectScreen()} disabled={busy}
        className="shrink-0 rounded-full bg-[color:var(--color-accent)] px-8 py-4 font-semibold text-[color:var(--color-surface-inset)] disabled:opacity-60">
        Play on screen
      </button>

      {!unsupported && (
        <button
          type="button"
          onClick={onConnect}
          disabled={busy || m.status === 'CONNECTING'}
          className="shrink-0 rounded-full border border-[color:var(--color-accent)] px-8 py-4 text-base font-semibold disabled:opacity-60"
        >
          {busy || m.status === 'CONNECTING' ? 'Connecting…' : isRetry ? 'Try again' : 'Connect your piano'}
        </button>
      )}

      <p className="mb-auto max-w-xs text-xs leading-relaxed text-[color:var(--color-muted)] opacity-80">
        No piano needed for on-screen play. Sound and practice work offline once loaded.
      </p>
    </main>
  )
}
