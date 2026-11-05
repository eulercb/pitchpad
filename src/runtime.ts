// Wires the framework-agnostic engine singletons to the settings store and to
// each other. Imported once (side effects run on module load). The UI reads the
// engines through hooks and issues commands through the helpers exported here.
import { midi } from './engine/midi'
import { AppSound } from './engine/audio'
import { GameEngine } from './engine/game'
import { useStore } from './store'
import type { ConnectionStatus } from './engine/types'

const s0 = useStore.getState()

export const sound = new AppSound(midi)
sound.setSource(s0.settings.soundSource)

export const game = new GameEngine(sound, s0.settings, {
  bestStreak: s0.bestStreak,
  learning: s0.learning,
  onLearning: (history) => useStore.getState().setLearning(history),
})

midi.setInputChannelFilter(s0.settings.inputChannel)

// Inbound MIDI note-on → the game's single answer path.
midi.onNote((e) => {
  if (e.type === 'noteOn' && useStore.getState().inputMode === 'piano') game.handleNoteOn(e.note)
})

// MIDI connection status → game pause/resume coordination (only on transitions).
const DISCONNECT_STATES: ReadonlySet<ConnectionStatus> = new Set<ConnectionStatus>([
  'DISCONNECTED_MIDSESSION',
  'NO_DEVICE',
  'PERMISSION_DENIED',
  'UNSUPPORTED',
])
let prevStatus: ConnectionStatus | null = null
midi.subscribe(() => {
  const { status } = midi.getSnapshot()
  if (useStore.getState().inputMode === 'screen') return
  if (status === prevStatus) return
  prevStatus = status
  if (status === 'CONNECTED') game.notifyConnected()
  else if (DISCONNECT_STATES.has(status)) game.notifyDisconnected()
})

// Settings changes → propagate to the engines live.
useStore.subscribe((state, prev) => {
  if (state.learning !== prev.learning) game.updateLearning(state.learning)
  if (state.inputMode !== prev.inputMode) sound.setScreenMode(state.inputMode === 'screen')
  if (state.settings === prev.settings) return
  const s = state.settings
  game.updateSettings(s)
  sound.setSource(s.soundSource)
  midi.setInputChannelFilter(s.inputChannel)
  if (s.inputDeviceName !== prev.settings.inputDeviceName) midi.selectInput(s.inputDeviceName)
  if (s.outputDeviceName !== prev.settings.outputDeviceName) midi.selectOutput(s.outputDeviceName)
})

// Finished session → persist stats + best streak.
let prevPhase = game.getSnapshot().phase
game.subscribe(() => {
  const st = game.getSnapshot()
  if (st.mode === 'challenge' && st.score > useStore.getState().challengeBest) {
    useStore.getState().recordChallengeScore(st.score)
  }
  if (st.phase === prevPhase) return
  const endedEarly = st.phase === 'READY' && prevPhase !== 'DISCONNECTED' &&
    prevPhase !== 'SESSION_SUMMARY' && st.results.length > 0
  prevPhase = st.phase
  if (st.phase === 'SESSION_SUMMARY' || endedEarly) useStore.getState().recordSession(st)
})

function useMock(): boolean {
  return (
    import.meta.env.DEV &&
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).has('mock')
  )
}

/** Called from the Connect user-gesture: unlock audio, then request MIDI access. */
export async function connect(): Promise<void> {
  const { settings } = useStore.getState()
  await sound.unlock()
  await midi.connect({
    preferredInputName: settings.inputDeviceName,
    preferredOutputName: settings.outputDeviceName,
    mock: useMock(),
  })
  if (midi.getSnapshot().status === 'CONNECTED') {
    useStore.getState().setInputMode('piano')
    game.notifyConnected()
  }
}

// Dev-only handle for headless testing (mock mode). Never referenced in prod UI.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __pitchpad?: unknown }).__pitchpad = { game, midi, sound }
}

/** On-screen keyboard tap: sound the note (audible fallback) and submit it as the answer. */
export function answerByTap(note: number): void {
  const { settings } = useStore.getState()
  sound.playNote(note, {
    velocity: settings.outputVelocity,
    durationMs: 480,
    channel: settings.outputChannel,
  })
  game.handleNoteOn(note)
}

/** Hardware-free entry, called from a user gesture to unlock offline synth audio. */
export async function connectScreen(): Promise<void> {
  await sound.unlock()
  useStore.getState().setInputMode('screen')
  game.notifyConnected()
}

export function changeInstrument(): void {
  game.endSession()
  game.notifyDisconnected()
  useStore.getState().setInputMode('piano')
}
