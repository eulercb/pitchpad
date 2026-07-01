import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from './game'
import { DEFAULT_SETTINGS } from './settings'
import { range } from './notes'
import type { PlayOptions, Settings, Sound } from './types'

// A Sound test double that counts panics and records played notes.
class SpySound implements Sound {
  played: number[] = []
  allNotesOffCount = 0
  playNote(note: number, _opts?: PlayOptions): void {
    this.played.push(note)
  }
  allNotesOff(): void {
    this.allNotesOffCount++
  }
}

// Deterministic PRNG (mulberry32) so target picks are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mkSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

function wrongNoteFor(target: number, settings: Settings): number {
  const pool = range(settings.rangeMin, settings.rangeMax, { whiteOnly: settings.whiteOnly })
  const other = pool.find((n) => n !== target)
  if (other == null) throw new Error('pool too small for a wrong note')
  return other
}

describe('GameEngine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Advance from the start of a round to AWAITING_ANSWER for the given settings.
  function reachAwaiting(settings: Settings): void {
    const { noteDurationMs } = settings
    if (settings.referenceTone) vi.advanceTimersByTime(noteDurationMs + 300) // ref → target
    vi.advanceTimersByTime(noteDurationMs + 300) // target → awaiting
  }

  it('starts DISCONNECTED and becomes READY on connect', () => {
    const g = new GameEngine(new SpySound(), mkSettings())
    expect(g.getSnapshot().phase).toBe('DISCONNECTED')
    g.notifyConnected()
    expect(g.getSnapshot().phase).toBe('READY')
  })

  it('plays the reference before the target when enabled, and skips it when disabled', () => {
    const withRef = new GameEngine(new SpySound(), mkSettings({ referenceTone: true, noteDurationMs: 200 }))
    withRef.notifyConnected()
    withRef.startSession()
    expect(withRef.getSnapshot().phase).toBe('PLAYING_REFERENCE')
    vi.advanceTimersByTime(200 + 300)
    expect(withRef.getSnapshot().phase).toBe('PLAYING_TARGET')
    vi.advanceTimersByTime(200 + 300)
    expect(withRef.getSnapshot().phase).toBe('AWAITING_ANSWER')

    const noRef = new GameEngine(new SpySound(), mkSettings({ referenceTone: false, noteDurationMs: 200 }))
    noRef.notifyConnected()
    noRef.startSession()
    expect(noRef.getSnapshot().phase).toBe('PLAYING_TARGET') // straight to target
  })

  it('ignores inbound notes until AWAITING_ANSWER', () => {
    const s = mkSettings({ noteDurationMs: 200 })
    const g = new GameEngine(new SpySound(), s)
    g.notifyConnected()
    g.startSession()
    // during PLAYING_REFERENCE / PLAYING_TARGET, an answer must not register
    g.handleNoteOn(g.getSnapshot().target!)
    expect(g.getSnapshot().phase).toBe('PLAYING_REFERENCE')
    expect(g.getSnapshot().attemptsThisRound).toBe(0)
  })

  it('scores a first-try correct answer and grows the streak', () => {
    const s = mkSettings({ referenceTone: false, noteDurationMs: 100 })
    const g = new GameEngine(new SpySound(), s, { rng: mulberry32(1) })
    g.notifyConnected()
    g.startSession()
    reachAwaiting(s)
    const target = g.getSnapshot().target!
    g.handleNoteOn(target)
    const st = g.getSnapshot()
    expect(st.phase).toBe('FEEDBACK_CORRECT')
    expect(st.score).toBe(1)
    expect(st.streak).toBe(1)
    expect(st.bestStreak).toBe(1)
    expect(st.lastResult).toBeNull() // not finalized until the round advances
  })

  it('breaks the streak on a wrong answer, reveals the key, and a retry does not count as first-try', () => {
    const s = mkSettings({ referenceTone: false, noteDurationMs: 100 })
    const g = new GameEngine(new SpySound(), s, { rng: mulberry32(7) })
    g.notifyConnected()
    g.startSession()

    // round 1: get it right to build a streak
    reachAwaiting(s)
    g.handleNoteOn(g.getSnapshot().target!)
    expect(g.getSnapshot().streak).toBe(1)
    g.nextRound()

    // round 2: answer wrong
    reachAwaiting(s)
    const target2 = g.getSnapshot().target!
    g.handleNoteOn(wrongNoteFor(target2, s))
    let st = g.getSnapshot()
    expect(st.phase).toBe('FEEDBACK_WRONG')
    expect(st.streak).toBe(0)
    expect(st.revealed).toBe(true)
    expect(st.score).toBe(1) // unchanged

    // retry correct: counts as correct but not first-try
    g.handleNoteOn(target2)
    st = g.getSnapshot()
    expect(st.phase).toBe('FEEDBACK_CORRECT')
    expect(st.score).toBe(1) // still 1 — retry isn't first-try
    expect(st.streak).toBe(0) // stays broken
  })

  it('records per-note first-try accuracy on finalize', () => {
    const s = mkSettings({ referenceTone: false, noteDurationMs: 100, rangeMin: 60, rangeMax: 60, whiteOnly: false })
    const g = new GameEngine(new SpySound(), s)
    g.notifyConnected()
    g.startSession()
    reachAwaiting(s)
    expect(g.getSnapshot().target).toBe(60)
    g.handleNoteOn(60)
    g.nextRound() // finalize round 1
    expect(g.getSnapshot().perNote[60]).toEqual({ attempts: 1, correct: 1 })
  })

  it('ends in SESSION_SUMMARY after N rounds with N results', () => {
    const s = mkSettings({ referenceTone: false, noteDurationMs: 50, roundsPerSession: 3 })
    const g = new GameEngine(new SpySound(), s, { rng: mulberry32(42) })
    g.notifyConnected()
    g.startSession()
    for (let i = 0; i < 3; i++) {
      reachAwaiting(s)
      g.handleNoteOn(g.getSnapshot().target!)
      g.nextRound()
    }
    const st = g.getSnapshot()
    expect(st.phase).toBe('SESSION_SUMMARY')
    expect(st.results).toHaveLength(3)
    expect(st.score).toBe(3)
  })

  it('never repeats the target on consecutive rounds', () => {
    const s = mkSettings({ referenceTone: false, noteDurationMs: 20, roundsPerSession: 40 })
    const g = new GameEngine(new SpySound(), s, { rng: mulberry32(12345) })
    g.notifyConnected()
    g.startSession()
    const targets: number[] = []
    for (let i = 0; i < 40; i++) {
      reachAwaiting(s)
      const t = g.getSnapshot().target!
      targets.push(t)
      g.handleNoteOn(t)
      g.nextRound()
    }
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).not.toBe(targets[i - 1])
    }
  })

  it('panics (allNotesOff) on start, advance, and dispose — no stuck notes', () => {
    const spy = new SpySound()
    const s = mkSettings({ referenceTone: false, noteDurationMs: 50 })
    const g = new GameEngine(spy, s)
    g.notifyConnected()
    g.startSession()
    const afterStart = spy.allNotesOffCount
    expect(afterStart).toBeGreaterThan(0)
    reachAwaiting(s)
    g.handleNoteOn(g.getSnapshot().target!)
    g.nextRound()
    expect(spy.allNotesOffCount).toBeGreaterThan(afterStart)
    const beforeDispose = spy.allNotesOffCount
    g.dispose()
    expect(spy.allNotesOffCount).toBeGreaterThan(beforeDispose)
  })

  it('pauses on device loss mid-round and resumes when the device returns', () => {
    const s = mkSettings({ referenceTone: false, noteDurationMs: 100 })
    const g = new GameEngine(new SpySound(), s)
    g.notifyConnected()
    g.startSession()
    reachAwaiting(s)
    expect(g.getSnapshot().phase).toBe('AWAITING_ANSWER')

    g.notifyDisconnected()
    expect(g.getSnapshot().phase).toBe('PAUSED')
    expect(g.getSnapshot().resumePhase).toBe('AWAITING_ANSWER')

    g.notifyConnected() // device back → replays the round
    expect(g.getSnapshot().phase).toBe('PLAYING_TARGET')
    vi.advanceTimersByTime(100 + 300)
    expect(g.getSnapshot().phase).toBe('AWAITING_ANSWER')
  })
})
