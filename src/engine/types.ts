// Shared engine types. No framework imports — this file is pure data.

/** A MIDI note number, 0–127. C4 = 60 (see notes.ts). */
export type MidiNote = number

/** Connection lifecycle surfaced by the MIDI engine; the UI renders each state. */
export type ConnectionStatus =
  | 'IDLE' // haven't attempted access yet (initial)
  | 'CONNECTING' // requestMIDIAccess in flight
  | 'UNSUPPORTED' // Web MIDI not available in this browser
  | 'PERMISSION_DENIED' // user/policy rejected the request
  | 'NO_DEVICE' // access granted, but no input/output present
  | 'CONNECTED' // ready to play + listen
  | 'DISCONNECTED_MIDSESSION' // a device dropped after we were connected

/** A MIDI port as the UI needs to see it. */
export interface MidiPortInfo {
  id: string
  name: string
  manufacturer: string
}

/** Snapshot of the MIDI engine, consumed by the UI via useSyncExternalStore. */
export interface MidiState {
  status: ConnectionStatus
  inputs: MidiPortInfo[]
  outputs: MidiPortInfo[]
  selectedInputName: string | null
  selectedOutputName: string | null
  /** true when running against the mock transport (dev only, never ships enabled). */
  mock: boolean
  /** last human-readable error, if any. */
  message: string | null
}

/** A parsed inbound MIDI event the game reacts to. */
export type MidiInputEvent =
  | { type: 'noteOn'; note: MidiNote; velocity: number; channel: number }
  | { type: 'noteOff'; note: MidiNote; channel: number }

/** Options for playing a note out to the instrument / synth. */
export interface PlayOptions {
  velocity?: number
  durationMs?: number
  channel?: number
}

/**
 * The one interface the game calls to make sound, regardless of source
 * (MIDI out to the piano, in-app synth, or both). Keeps game.ts sound-agnostic.
 */
export interface Sound {
  playNote(note: MidiNote, opts?: PlayOptions): void
  /** Panic: silence everything. Called on every reset / round change / teardown. */
  allNotesOff(): void
}

/** Where the target/reference tone comes from. */
export type SoundSource = 'piano' | 'in-app' | 'both'

export type Theme = 'dark' | 'light'

/** User-editable settings. The app is fully playable on these defaults (§5). */
export interface Settings {
  inputDeviceName: string | null
  outputDeviceName: string | null
  rangeMin: MidiNote // inclusive
  rangeMax: MidiNote // inclusive
  whiteOnly: boolean
  referenceTone: boolean
  referenceNote: MidiNote // anchor played before the target (C4 = 60)
  noteDurationMs: number
  outputVelocity: number
  outputChannel: number // 0-indexed
  inputChannel: number | null // null = omni
  soundSource: SoundSource
  haptics: boolean
  audioCue: boolean // success/fail pitched cue; off by default to keep the ear clean
  roundsPerSession: number
  theme: Theme
  showNoteLabels: boolean
}

/** The game state machine's phases (§8). */
export type GamePhase =
  | 'DISCONNECTED'
  | 'READY'
  | 'PLAYING_REFERENCE'
  | 'PLAYING_TARGET'
  | 'AWAITING_ANSWER'
  | 'JUDGING'
  | 'FEEDBACK_CORRECT'
  | 'FEEDBACK_WRONG'
  | 'SESSION_SUMMARY'
  | 'PAUSED'

/** Outcome of a completed round. */
export interface RoundResult {
  target: MidiNote
  answered: MidiNote | null
  correct: boolean
  firstTry: boolean
  attempts: number
  revealed: boolean
}

/** Per-note-class tally, keyed by MIDI number, for surfacing weak notes. */
export interface NoteTally {
  attempts: number
  correct: number
}

/** Lifetime stats persisted across sessions. */
export interface LifetimeStats {
  sessionsPlayed: number
  roundsPlayed: number
  firstTryCorrect: number
  perNote: Record<number, NoteTally>
}

/** Observable game state consumed by the UI. */
export interface GameState {
  phase: GamePhase
  roundIndex: number // 0-based index of the current round
  totalRounds: number
  target: MidiNote | null
  reference: MidiNote | null
  lastAnswer: MidiNote | null
  lastResult: RoundResult | null
  revealed: boolean // correct answer revealed on the keyboard
  attemptsThisRound: number
  score: number // first-try-correct count this session
  streak: number
  bestStreak: number
  results: RoundResult[]
  perNote: Record<number, NoteTally>
  /** the phase to return to when a lost device comes back (PAUSED bookkeeping). */
  resumePhase: GamePhase | null
}
