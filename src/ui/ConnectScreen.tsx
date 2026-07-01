import { useState } from 'react'
import { useMidi } from '../hooks/useMidi'
import { connect } from '../runtime'
import { Bloom } from './Bloom'
import type { ConnectionStatus } from '../engine/types'

// Friendly, specific copy for every connection state (§6.6) — never a blank screen.
function help(status: ConnectionStatus, message: string | null): { title: string; body: string } {
  switch (status) {
    case 'UNSUPPORTED':
      return {
        title: 'Chrome on Android needed',
        body: 'PitchPad talks to your piano over Web MIDI, which this browser doesn’t support. Open it in Chrome on an Android phone.',
      }
    case 'PERMISSION_DENIED':
      return {
        title: 'Permission needed',
        body: message ?? 'PitchPad needs access to your MIDI device. Tap Connect and allow it.',
      }
    case 'NO_DEVICE':
      return {
        title: 'No piano found',
        body: 'Plug your piano in over USB-C (OTG), power it on, and make sure it’s a class-compliant USB-MIDI device. Then try again.',
      }
    default:
      return {
        title: 'Hear it. Find it. Play it back.',
        body: 'Connect your digital piano and train your ear on your own instrument.',
      }
  }
}

export function ConnectScreen() {
  const m = useMidi()
  const [busy, setBusy] = useState(false)
  const { title, body } = help(m.status, m.message)
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
    <main className="flex min-h-full flex-col items-center justify-center gap-8 px-8 text-center">
      <div className="relative flex flex-col items-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
          <Bloom variant="strike" size={260} pulse={1} />
        </div>
        <h1 className="font-display text-5xl">PitchPad</h1>
      </div>

      <div className="max-w-xs">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-muted)]">{body}</p>
      </div>

      {!unsupported && (
        <button
          type="button"
          onClick={onConnect}
          disabled={busy || m.status === 'CONNECTING'}
          className="rounded-full px-8 py-4 text-base font-semibold transition-transform duration-200 ease-[var(--ease-settle)] active:translate-y-0.5 disabled:opacity-60"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, var(--color-accent) 0%, var(--color-accent-dim) 82%)',
            color: 'var(--color-surface-inset)',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.28), 0 6px 16px rgba(0,0,0,0.35)',
          }}
        >
          {busy || m.status === 'CONNECTING' ? 'Connecting…' : isRetry ? 'Try again' : 'Connect your piano'}
        </button>
      )}

      <p className="max-w-xs text-xs leading-relaxed text-[color:var(--color-muted)] opacity-80">
        Works offline once loaded. Your piano is the only thing you need online.
      </p>
    </main>
  )
}
