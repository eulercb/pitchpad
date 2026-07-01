// A minimal synchronous pub/sub store with immutable snapshots, shaped for
// React's useSyncExternalStore. `getSnapshot` returns the same reference until
// `setState` swaps it, so React re-renders only on real changes. No framework
// imports live here — the engine stays portable and testable.
export class Observable<T extends object> {
  private listeners = new Set<() => void>()
  protected state: T

  constructor(initial: T) {
    this.state = initial
  }

  getSnapshot = (): T => this.state

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  protected setState(patch: Partial<T> | ((prev: T) => T)): void {
    const next =
      typeof patch === 'function'
        ? (patch as (p: T) => T)(this.state)
        : { ...this.state, ...patch }
    if (next === this.state) return
    this.state = next
    for (const l of this.listeners) l()
  }
}
