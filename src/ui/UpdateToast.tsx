import { usePwa } from '../pwa'
import { CloseGlyph } from './icons'

// Non-intrusive bottom toasts: a persistent "update ready" prompt and a brief
// "ready offline" confirmation.
export function UpdateToast() {
  const needRefresh = usePwa((s) => s.needRefresh)
  const offlineReady = usePwa((s) => s.offlineReady)
  const applyUpdate = usePwa((s) => s.applyUpdate)
  const dismissUpdate = usePwa((s) => s.dismissUpdate)

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {needRefresh ? (
        <div className="sheet-enter panel pointer-events-auto flex max-w-sm items-center gap-3 rounded-full py-2 pl-5 pr-2">
          <span className="text-sm">A new version is ready.</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-surface-inset)' }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="Dismiss"
            className="grid h-8 w-8 place-items-center rounded-full text-[color:var(--color-muted)]"
          >
            <CloseGlyph size={18} />
          </button>
        </div>
      ) : (
        <div className="sheet-enter panel pointer-events-auto rounded-full px-5 py-2.5 text-sm text-[color:var(--color-muted)]">
          Ready to use offline.
        </div>
      )}
    </div>
  )
}
