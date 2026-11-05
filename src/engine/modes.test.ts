import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameEngine } from './game'
import { DEFAULT_SETTINGS } from './settings'
import { CURRICULUM } from './learning'
import type { Sound } from './types'

function ready(g: GameEngine) {
  for (let i = 0; i < 5 && g.getSnapshot().phase !== 'AWAITING_ANSWER'; i++) {
    vi.advanceTimersToNextTimer()
  }
  expect(g.getSnapshot().phase).toBe('AWAITING_ANSWER')
}

function setup() {
  const sound: Sound = { playNote: vi.fn(), allNotesOff: vi.fn() }
  const g = new GameEngine(sound, { ...DEFAULT_SETTINGS, roundsPerSession: 1, referenceTone: false })
  g.notifyConnected()
  return { g, sound }
}

describe('learning and endless sessions', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps challenge running past the configured round limit and increases difficulty', () => {
    const { g, sound } = setup()
    g.startSession('challenge')
    expect(g.getSnapshot().pool).toEqual([60, 62, 64])
    expect(g.getSnapshot().reference).toBe(60)
    for (let i = 0; i < 100; i++) {
      ready(g)
      g.handleNoteOn(g.getSnapshot().target!)
      g.nextRound()
    }
    expect(g.getSnapshot().score).toBe(100)
    expect(g.getSnapshot().phase).not.toBe('SESSION_SUMMARY')
    expect(g.getSnapshot().pool).toEqual(CURRICULUM)
    expect(g.getSnapshot().reference).toBeNull()
    expect(sound.playNote).toHaveBeenLastCalledWith(expect.any(Number), expect.objectContaining({ durationMs: 200 }))
  })

  it('ends on the first wrong answer and ignores retries, reveals and skips', () => {
    const { g } = setup()
    g.startSession('challenge')
    ready(g)
    g.nextRound()
    g.revealAnswer()
    expect(g.getSnapshot().roundIndex).toBe(0)
    expect(g.getSnapshot().revealed).toBe(false)
    g.handleNoteOn(g.getSnapshot().target!)
    g.replay() // cannot turn a scored win into another attempt
    expect(g.getSnapshot().phase).toBe('FEEDBACK_CORRECT')
    g.nextRound()
    ready(g)
    const target = g.getSnapshot().target!
    g.handleNoteOn(target + 1)
    expect(g.getSnapshot().phase).toBe('SESSION_SUMMARY')
    expect(g.getSnapshot().score).toBe(1)
    expect(g.getSnapshot().results).toHaveLength(2)
    expect(g.getSnapshot().lastResult).toMatchObject({ target, correct: false, attempts: 1 })
    g.handleNoteOn(target)
    g.nextRound()
    vi.advanceTimersByTime(10000)
    expect(g.getSnapshot().score).toBe(1)
    expect(g.getSnapshot().results).toHaveLength(2)
    g.startSession()
    expect(g.getSnapshot().mode).toBe('challenge')
    expect(g.getSnapshot().score).toBe(0)
  })

  it('uses saved learning progress, its own note pool and a stable C4 anchor', () => {
    const onLearning = vi.fn()
    const g = new GameEngine({ playNote: vi.fn(), allNotesOff: vi.fn() },
      { ...DEFAULT_SETTINGS, rangeMin: 80, rangeMax: 90, referenceTone: false, roundsPerSession: 1 },
      { learning: { unlocked: 8, perNote: {} }, onLearning })
    g.notifyConnected()
    g.startSession('learning')
    expect(g.getSnapshot().pool).toEqual(CURRICULUM.slice(0, 8))
    expect(g.getSnapshot().reference).toBe(60)
    ready(g)
    const target = g.getSnapshot().target!
    g.handleNoteOn(target)
    g.nextRound()
    expect(g.getSnapshot().phase).toBe('SESSION_SUMMARY')
    expect(onLearning).toHaveBeenCalledOnce()
    expect(onLearning.mock.calls[0][0].perNote[target]).toEqual({ attempts: 1, correct: 1, streak: 1 })
  })

  it('saves learning progress when a user ends a session early', () => {
    const onLearning = vi.fn()
    const g = new GameEngine({ playNote: vi.fn(), allNotesOff: vi.fn() }, DEFAULT_SETTINGS, { onLearning })
    g.notifyConnected()
    g.startSession('learning')
    ready(g)
    g.handleNoteOn(g.getSnapshot().target!)
    g.endSession()
    expect(onLearning).toHaveBeenCalledOnce()
    expect(g.getSnapshot().phase).toBe('READY')
    vi.advanceTimersByTime(10000)
    expect(onLearning).toHaveBeenCalledOnce()
  })

  it('does not award first-try credit after revealing a practice answer', () => {
    const { g } = setup()
    g.startSession('practice')
    ready(g)
    g.revealAnswer()
    g.handleNoteOn(g.getSnapshot().target!)
    expect(g.getSnapshot().score).toBe(0)
  })
})
