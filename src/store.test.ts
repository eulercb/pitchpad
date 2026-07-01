import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DEFAULT_SETTINGS } from './engine/settings'
import type { GameState } from './engine/types'

const KEY = 'pitchpad:v1'

// The store is a module singleton that loads from localStorage on import, so we
// re-import a fresh copy to simulate a reload.
async function freshStore() {
  vi.resetModules()
  const mod = await import('./store')
  return mod.useStore
}

describe('store persistence', () => {
  beforeEach(() => localStorage.clear())

  it('falls back to defaults with empty storage', async () => {
    const useStore = await freshStore()
    expect(useStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(useStore.getState().bestStreak).toBe(0)
  })

  it('loads a valid persisted payload', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        settings: { ...DEFAULT_SETTINGS, roundsPerSession: 5, referenceTone: false },
        bestStreak: 7,
        lifetimeStats: { sessionsPlayed: 2, roundsPlayed: 20, firstTryCorrect: 10, perNote: { 60: { attempts: 3, correct: 2 } } },
      }),
    )
    const useStore = await freshStore()
    expect(useStore.getState().settings.roundsPerSession).toBe(5)
    expect(useStore.getState().settings.referenceTone).toBe(false)
    expect(useStore.getState().bestStreak).toBe(7)
    expect(useStore.getState().lifetimeStats.perNote[60]).toEqual({ attempts: 3, correct: 2 })
  })

  it('ignores a schema-version mismatch', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 99, settings: { ...DEFAULT_SETTINGS, roundsPerSession: 5 }, bestStreak: 9 }),
    )
    const useStore = await freshStore()
    expect(useStore.getState().settings.roundsPerSession).toBe(DEFAULT_SETTINGS.roundsPerSession)
    expect(useStore.getState().bestStreak).toBe(0)
  })

  it('survives corrupt JSON', async () => {
    localStorage.setItem(KEY, '{not valid json')
    const useStore = await freshStore()
    expect(useStore.getState().bestStreak).toBe(0)
    expect(useStore.getState().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('sanitizes an out-of-range persisted setting', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 1, settings: { ...DEFAULT_SETTINGS, noteDurationMs: 99999, rangeMin: 80, rangeMax: 60 }, bestStreak: 0, lifetimeStats: {} }),
    )
    const useStore = await freshStore()
    const s = useStore.getState().settings
    expect(s.noteDurationMs).toBeLessThanOrEqual(4000)
    expect(s.rangeMin).toBeLessThanOrEqual(s.rangeMax) // inverted range repaired
  })

  it('persists settings changes across a reload', async () => {
    let useStore = await freshStore()
    useStore.getState().updateSettings({ roundsPerSession: 15 })
    useStore = await freshStore()
    expect(useStore.getState().settings.roundsPerSession).toBe(15)
  })

  it('records a finished session into lifetime stats + best streak', async () => {
    const useStore = await freshStore()
    const game = {
      results: [
        { target: 60, answered: 60, correct: true, firstTry: true, attempts: 1, revealed: false },
        { target: 62, answered: 61, correct: false, firstTry: false, attempts: 1, revealed: true },
      ],
      perNote: { 60: { attempts: 1, correct: 1 }, 62: { attempts: 1, correct: 0 } },
      bestStreak: 5,
    } as unknown as GameState

    useStore.getState().recordSession(game)
    const s = useStore.getState()
    expect(s.bestStreak).toBe(5)
    expect(s.lifetimeStats.sessionsPlayed).toBe(1)
    expect(s.lifetimeStats.roundsPlayed).toBe(2)
    expect(s.lifetimeStats.firstTryCorrect).toBe(1)
    expect(s.lifetimeStats.perNote[60]).toEqual({ attempts: 1, correct: 1 })

    // reload keeps it
    const reloaded = await freshStore()
    expect(reloaded.getState().lifetimeStats.roundsPlayed).toBe(2)
    expect(reloaded.getState().bestStreak).toBe(5)
  })
})
