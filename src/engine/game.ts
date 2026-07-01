// Game state machine (§8). Pure TypeScript — no React, no MIDI imports. It talks
// to the world through an injected `Sound` (for output) and `handleNoteOn` (for
// input), so it's fully unit-testable with a no-op Sound + fake timers.
//
//   DISCONNECTED ─connect→ READY ─start→ PLAYING_REFERENCE? → PLAYING_TARGET
//   → AWAITING_ANSWER ─noteOn→ (correct) FEEDBACK_CORRECT ─next→ round | SUMMARY
//                              (wrong)   FEEDBACK_WRONG   ─retry→ AWAITING | ─next→ round
//   any-active ─deviceLost→ PAUSED ─deviceBack→ (resume)
import { Observable } from './observable'
import { range } from './notes'
import type { GamePhase, GameState, MidiNote, RoundResult, Settings, Sound } from './types'

const REF_TARGET_GAP_MS = 260 // silence between the reference anchor and the target
const POST_TARGET_MS = 140 // brief settle after the target before we start listening
const CORRECT_ADVANCE_MS = 1200 // savour the "Right" beat before auto-advancing

// Phases where a round is in flight (used for pause/resume + input gating).
const ACTIVE_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  'PLAYING_REFERENCE',
  'PLAYING_TARGET',
  'AWAITING_ANSWER',
  'JUDGING',
  'FEEDBACK_CORRECT',
  'FEEDBACK_WRONG',
])

// Phases where an inbound note counts as an answer.
const ANSWERING_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  'AWAITING_ANSWER',
  'FEEDBACK_WRONG', // a fresh key press after a miss is a retry
])

export interface GameEngineOptions {
  bestStreak?: number
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  rng?: () => number
}

function initialState(bestStreak: number): GameState {
  return {
    phase: 'DISCONNECTED',
    roundIndex: 0,
    totalRounds: 0,
    target: null,
    reference: null,
    lastAnswer: null,
    lastResult: null,
    revealed: false,
    attemptsThisRound: 0,
    score: 0,
    streak: 0,
    bestStreak,
    results: [],
    perNote: {},
    resumePhase: null,
  }
}

export class GameEngine extends Observable<GameState> {
  private settings: Settings
  private readonly rng: () => number
  private timers: ReturnType<typeof setTimeout>[] = []
  private pending: RoundResult | null = null // this round's result-in-progress
  private prevTarget: MidiNote | null = null // to avoid immediate repeats

  constructor(
    private sound: Sound,
    settings: Settings,
    opts: GameEngineOptions = {},
  ) {
    super(initialState(opts.bestStreak ?? 0))
    this.settings = settings
    this.rng = opts.rng ?? Math.random
  }

  // ── external inputs ────────────────────────────────────────────────────
  updateSettings(settings: Settings): void {
    // Applied immediately for judging/pool; sequence-timing reads at play time,
    // so in-flight prompts finish on their old timing and the next round adopts new.
    this.settings = settings
  }

  /** Wire this to MIDI note-on and to on-screen keyboard taps. */
  handleNoteOn(note: MidiNote): void {
    if (!ANSWERING_PHASES.has(this.state.phase)) return
    this.judge(note)
  }

  // ── connection coordination (called by the app from MIDI status) ────────
  notifyConnected(): void {
    if (this.state.phase === 'DISCONNECTED') {
      this.setState({ phase: 'READY' })
    } else if (this.state.phase === 'PAUSED') {
      this.resumeFromPause()
    }
  }

  notifyDisconnected(): void {
    const phase = this.state.phase
    if (ACTIVE_PHASES.has(phase)) {
      // Pause mid-round: freeze, silence, remember where to resume.
      this.clearTimers()
      this.sound.allNotesOff()
      this.setState({ phase: 'PAUSED', resumePhase: phase })
    } else if (phase === 'READY') {
      this.setState({ phase: 'DISCONNECTED' })
    }
    // SESSION_SUMMARY / already-PAUSED / DISCONNECTED: leave as-is.
  }

  private resumeFromPause(): void {
    const resume = this.state.resumePhase
    this.setState({ resumePhase: null })
    // If we were mid-prompt or listening, the cleanest resume is to replay the
    // round so the ear gets the note again; feedback states just restore.
    if (
      resume === 'PLAYING_REFERENCE' ||
      resume === 'PLAYING_TARGET' ||
      resume === 'AWAITING_ANSWER'
    ) {
      this.playSequence()
    } else {
      this.setState({ phase: resume ?? 'AWAITING_ANSWER' })
    }
  }

  // ── session / round lifecycle ────────────────────────────────────────────
  startSession(): void {
    this.clearTimers()
    this.sound.allNotesOff()
    this.pending = null
    this.prevTarget = null
    this.setState({
      roundIndex: 0,
      totalRounds: this.settings.roundsPerSession,
      score: 0,
      streak: 0,
      results: [],
      perNote: {},
      lastResult: null,
    })
    this.beginRound()
  }

  private beginRound(): void {
    const target = this.pickTarget()
    this.prevTarget = target
    this.pending = null
    this.setState({
      target,
      reference: this.settings.referenceTone ? this.settings.referenceNote : null,
      lastAnswer: null,
      revealed: false,
      attemptsThisRound: 0,
    })
    this.playSequence()
  }

  /** (Re)play reference (if enabled) then target, then open for answers. Unlimited, unpenalized. */
  replay(): void {
    if (this.state.target == null) return
    if (!ACTIVE_PHASES.has(this.state.phase)) return
    this.playSequence()
  }

  private playSequence(): void {
    this.clearTimers()
    this.sound.allNotesOff()
    const { noteDurationMs, outputVelocity, outputChannel, referenceTone, referenceNote } =
      this.settings
    const target = this.state.target
    if (target == null) return

    const playTargetStep = () => {
      this.setState({ phase: 'PLAYING_TARGET' })
      this.sound.playNote(target, {
        velocity: outputVelocity,
        durationMs: noteDurationMs,
        channel: outputChannel,
      })
      this.schedule(() => this.setState({ phase: 'AWAITING_ANSWER' }), noteDurationMs + POST_TARGET_MS)
    }

    if (referenceTone) {
      this.setState({ phase: 'PLAYING_REFERENCE' })
      this.sound.playNote(referenceNote, {
        velocity: outputVelocity,
        durationMs: noteDurationMs,
        channel: outputChannel,
      })
      this.schedule(playTargetStep, noteDurationMs + REF_TARGET_GAP_MS)
    } else {
      playTargetStep()
    }
  }

  // ── judging ────────────────────────────────────────────────────────────
  private judge(note: MidiNote): void {
    const target = this.state.target
    if (target == null) return
    this.clearTimers() // stop any pending phase transitions
    const attempts = this.state.attemptsThisRound + 1
    const correct = note === target // exact MIDI (single-octave pool); octave-agnostic is parked
    const firstTry = correct && attempts === 1

    if (correct) {
      this.pending = { target, answered: note, correct: true, firstTry, attempts, revealed: this.state.revealed }
      const streak = firstTry ? this.state.streak + 1 : this.state.streak
      const bestStreak = Math.max(this.state.bestStreak, streak)
      const score = firstTry ? this.state.score + 1 : this.state.score
      this.setState({
        phase: 'FEEDBACK_CORRECT',
        lastAnswer: note,
        attemptsThisRound: attempts,
        streak,
        bestStreak,
        score,
      })
      // auto-advance after a beat; user can also tap Next to go now
      this.schedule(() => this.nextRound(), CORRECT_ADVANCE_MS)
    } else {
      // A wrong attempt breaks the streak and reveals the correct key (beginner-friendly).
      this.pending = { target, answered: note, correct: false, firstTry: false, attempts, revealed: true }
      this.setState({
        phase: 'FEEDBACK_WRONG',
        lastAnswer: note,
        attemptsThisRound: attempts,
        revealed: true,
        streak: 0,
      })
    }
  }

  /** Explicitly reveal the correct key (also happens automatically on a wrong answer). */
  revealAnswer(): void {
    if (this.state.phase === 'AWAITING_ANSWER' || this.state.phase === 'FEEDBACK_WRONG') {
      this.setState({ revealed: true })
    }
  }

  /** Advance to the next round (or the session summary). Also used as Skip. */
  nextRound(): void {
    if (this.state.phase === 'SESSION_SUMMARY' || this.state.phase === 'DISCONNECTED') return
    this.clearTimers()
    this.sound.allNotesOff()
    this.finalizeRound()

    const nextIndex = this.state.roundIndex + 1
    if (nextIndex >= this.state.totalRounds) {
      this.setState({ phase: 'SESSION_SUMMARY' })
    } else {
      this.setState({ roundIndex: nextIndex })
      this.beginRound()
    }
  }

  private finalizeRound(): void {
    const target = this.state.target
    if (target == null) return
    // If the round is being skipped with no attempt, record a skipped miss.
    const result: RoundResult =
      this.pending ??
      {
        target,
        answered: this.state.lastAnswer,
        correct: false,
        firstTry: false,
        attempts: this.state.attemptsThisRound,
        revealed: this.state.revealed,
      }
    this.pending = null

    const perNote = { ...this.state.perNote }
    const tally = perNote[target] ?? { attempts: 0, correct: 0 }
    perNote[target] = {
      attempts: tally.attempts + 1,
      correct: tally.correct + (result.correct && result.firstTry ? 1 : 0),
    }

    this.setState({
      results: [...this.state.results, result],
      lastResult: result,
      perNote,
    })
  }

  endSession(): void {
    this.clearTimers()
    this.sound.allNotesOff()
    this.pending = null
    this.setState({ phase: this.state.phase === 'DISCONNECTED' ? 'DISCONNECTED' : 'READY' })
  }

  /** For teardown (unmount / hot-reload). */
  dispose(): void {
    this.clearTimers()
    this.sound.allNotesOff()
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private pickTarget(): MidiNote {
    const pool = range(this.settings.rangeMin, this.settings.rangeMax, {
      whiteOnly: this.settings.whiteOnly,
    })
    if (pool.length === 0) return this.settings.rangeMin
    if (pool.length === 1) return pool[0]
    let pick = pool[Math.floor(this.rng() * pool.length)]
    let guard = 0
    while (pick === this.prevTarget && guard++ < 24) {
      pick = pool[Math.floor(this.rng() * pool.length)]
    }
    return pick
  }

  private schedule(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms))
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t)
    this.timers = []
  }
}
