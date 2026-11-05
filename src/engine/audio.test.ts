import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSound } from './audio'
import { MidiEngine } from './midi'

const oscillator = () => ({ type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })
const createOscillator = vi.fn(oscillator)
class AudioContextStub {
  state = 'running'
  currentTime = 0
  destination = {}
  createOscillator = createOscillator
  createGain() {
    return { connect: vi.fn(), gain: { value: 0.7, setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() } }
  }
}

describe('screen audio routing', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.clearAllMocks() })

  it('always uses the offline synth in screen mode and restores the piano preference afterward', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', AudioContextStub)
    const midi = new MidiEngine()
    const playMidi = vi.spyOn(midi, 'playNote')
    const sound = new AppSound(midi)
    sound.setSource('piano')
    await sound.unlock()
    sound.setScreenMode(true)
    sound.playNote(60)
    expect(createOscillator).toHaveBeenCalledTimes(2)
    expect(playMidi).not.toHaveBeenCalled()
    sound.setSource('piano') // changing settings cannot silently disable screen audio
    sound.playNote(62)
    expect(createOscillator).toHaveBeenCalledTimes(4)
    sound.setScreenMode(false)
    sound.playNote(64)
    expect(playMidi).toHaveBeenCalledWith(64, {})
    expect(createOscillator).toHaveBeenCalledTimes(4)
    sound.allNotesOff()
  })
})
