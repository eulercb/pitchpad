// Settings + stats persistence. A single versioned localStorage key
// (`pitchpad:v1`); reads are guarded and fall back to defaults on any corruption
// or version mismatch, so bad storage can never break startup.
import { create } from 'zustand'
import { DEFAULT_SETTINGS, sanitizeSettings } from './engine/settings'
import type { GameState, LifetimeStats, NoteTally, Settings } from './engine/types'

const STORAGE_KEY = 'pitchpad:v1'
const SCHEMA_VERSION = 1

interface Persisted {
  schemaVersion: number
  settings: Settings
  bestStreak: number
  lifetimeStats: LifetimeStats
}

function emptyLifetime(): LifetimeStats {
  return { sessionsPlayed: 0, roundsPlayed: 0, firstTryCorrect: 0, perNote: {} }
}

function sanitizeLifetime(input: unknown): LifetimeStats {
  const base = emptyLifetime()
  if (!input || typeof input !== 'object') return base
  const l = input as Partial<LifetimeStats>
  const perNote: Record<number, NoteTally> = {}
  if (l.perNote && typeof l.perNote === 'object') {
    for (const [k, v] of Object.entries(l.perNote)) {
      const note = Number(k)
      if (!Number.isFinite(note) || !v) continue
      const t = v as Partial<NoteTally>
      perNote[note] = {
        attempts: Math.max(0, Math.floor(Number(t.attempts) || 0)),
        correct: Math.max(0, Math.floor(Number(t.correct) || 0)),
      }
    }
  }
  return {
    sessionsPlayed: Math.max(0, Math.floor(Number(l.sessionsPlayed) || 0)),
    roundsPlayed: Math.max(0, Math.floor(Number(l.roundsPlayed) || 0)),
    firstTryCorrect: Math.max(0, Math.floor(Number(l.firstTryCorrect) || 0)),
    perNote,
  }
}

function load(): { settings: Settings; bestStreak: number; lifetimeStats: LifetimeStats } {
  const fallback = {
    settings: DEFAULT_SETTINGS,
    bestStreak: 0,
    lifetimeStats: emptyLifetime(),
  }
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return fallback
    return {
      settings: sanitizeSettings(parsed.settings),
      bestStreak: Math.max(0, Math.floor(Number(parsed.bestStreak) || 0)),
      lifetimeStats: sanitizeLifetime(parsed.lifetimeStats),
    }
  } catch {
    return fallback
  }
}

function save(state: { settings: Settings; bestStreak: number; lifetimeStats: LifetimeStats }): void {
  try {
    if (typeof localStorage === 'undefined') return
    const payload: Persisted = { schemaVersion: SCHEMA_VERSION, ...state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* storage full / disabled — keep running, just don't persist */
  }
}

export interface StoreState {
  settings: Settings
  bestStreak: number
  lifetimeStats: LifetimeStats
  updateSettings: (patch: Partial<Settings>) => void
  /** Fold a finished session's results into lifetime stats + best streak. */
  recordSession: (game: GameState) => void
  resetStats: () => void
}

const initial = load()

export const useStore = create<StoreState>((set) => ({
  settings: initial.settings,
  bestStreak: initial.bestStreak,
  lifetimeStats: initial.lifetimeStats,

  updateSettings: (patch) =>
    set((s) => ({ settings: sanitizeSettings({ ...s.settings, ...patch }) })),

  recordSession: (game) =>
    set((s) => {
      const perNote: Record<number, NoteTally> = { ...s.lifetimeStats.perNote }
      for (const [k, v] of Object.entries(game.perNote)) {
        const note = Number(k)
        const prev = perNote[note] ?? { attempts: 0, correct: 0 }
        perNote[note] = {
          attempts: prev.attempts + v.attempts,
          correct: prev.correct + v.correct,
        }
      }
      const firstTry = game.results.filter((r) => r.correct && r.firstTry).length
      return {
        bestStreak: Math.max(s.bestStreak, game.bestStreak),
        lifetimeStats: {
          sessionsPlayed: s.lifetimeStats.sessionsPlayed + 1,
          roundsPlayed: s.lifetimeStats.roundsPlayed + game.results.length,
          firstTryCorrect: s.lifetimeStats.firstTryCorrect + firstTry,
          perNote,
        },
      }
    }),

  resetStats: () => set({ bestStreak: 0, lifetimeStats: emptyLifetime() }),
}))

// Persist any change to the slices we care about.
useStore.subscribe((s) =>
  save({ settings: s.settings, bestStreak: s.bestStreak, lifetimeStats: s.lifetimeStats }),
)
