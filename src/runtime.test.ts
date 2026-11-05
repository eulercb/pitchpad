import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./engine/audio', () => ({ AppSound: class {
  setSource = vi.fn()
  setScreenMode = vi.fn()
  unlock = vi.fn(async () => {})
  playNote = vi.fn()
  allNotesOff = vi.fn()
} }))

import { game, sound, connectScreen, changeInstrument } from './runtime'
import { midi } from './engine/midi'
import { useStore } from './store'

describe('on-screen runtime', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    game.endSession()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts with synth audio without requesting MIDI access and ignores MIDI device loss', async () => {
    const connectMidi = vi.spyOn(midi, 'connect')
    await connectScreen()
    expect(connectMidi).not.toHaveBeenCalled()
    expect(sound.unlock).toHaveBeenCalled()
    expect(sound.setScreenMode).toHaveBeenCalledWith(true)
    expect(useStore.getState().inputMode).toBe('screen')
    expect(game.getSnapshot().phase).toBe('READY')
    game.startSession('challenge')
    // Simulate the real MIDI observable notifying a hardware disconnect.
    const getSnapshot = vi.spyOn(midi, 'getSnapshot').mockReturnValue({ ...midi.getSnapshot(), status: 'NO_DEVICE' })
    // selectInput publishes a new state through the same observable.
    midi.selectInput(null)
    expect(game.getSnapshot().phase).not.toBe('PAUSED')
    getSnapshot.mockRestore()
    changeInstrument()
    expect(game.getSnapshot().phase).toBe('DISCONNECTED')
    expect(sound.setScreenMode).toHaveBeenLastCalledWith(false)
  })

  it('persists a challenge record before the run ends', async () => {
    await connectScreen()
    game.startSession('challenge')
    vi.advanceTimersByTime(2400)
    expect(game.getSnapshot().phase).toBe('AWAITING_ANSWER')
    game.handleNoteOn(game.getSnapshot().target!)
    expect(useStore.getState().challengeBest).toBeGreaterThanOrEqual(1)
    expect(game.getSnapshot().phase).toBe('FEEDBACK_CORRECT')
  })
})
