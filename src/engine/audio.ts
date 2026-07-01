// Sound layer. The game calls one Sound; the source (piano via MIDI out, an
// in-app synth, or both) is a strategy switch here so game.ts stays sound-agnostic.
//
// Fallback synth: a self-contained WebAudio tone with a piano-ish envelope. The
// plan floats `smplr` (sampled piano), but that streams samples over the network
// on first use, which fights the HARD offline constraint (§2). A synthesized
// voice needs no assets, starts instantly, and works offline from the first load.
// A sampled backend can slot in later behind this same interface if wanted.
import { freq } from './notes'
import type { MidiEngine } from './midi'
import type { PlayOptions, Sound, SoundSource } from './types'

interface Voice {
  osc: OscillatorNode[]
  gain: GainNode
  stopTimer: ReturnType<typeof setTimeout>
}

class SynthSound implements Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Map<number, Voice>()

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.7
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  /** Must be called from a user gesture so the browser lets audio play. */
  async unlock(): Promise<void> {
    const ctx = this.ensureContext()
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* ignore — will retry on next play */
      }
    }
  }

  playNote(note: number, opts: PlayOptions = {}): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    if (ctx.state === 'suspended') void ctx.resume()

    const durationMs = opts.durationMs ?? 1000
    const velocity = opts.velocity ?? 90
    const now = ctx.currentTime
    const dur = durationMs / 1000
    const peak = 0.18 + (velocity / 127) * 0.5

    this.stopVoice(note, now)

    const gain = ctx.createGain()
    gain.connect(this.master)
    // Percussive piano-ish envelope: fast attack, exponential decay, short release.
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.28), now + 0.35)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.25)

    const f = freq(note)
    // Fundamental (triangle, warm) + a quiet octave partial for a little shimmer.
    const o1 = ctx.createOscillator()
    o1.type = 'triangle'
    o1.frequency.value = f
    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = f * 2
    const o2gain = ctx.createGain()
    o2gain.gain.value = 0.22
    o1.connect(gain)
    o2.connect(o2gain)
    o2gain.connect(gain)

    const stopAt = now + dur + 0.3
    o1.start(now)
    o2.start(now)
    o1.stop(stopAt)
    o2.stop(stopAt)

    const stopTimer = setTimeout(() => {
      this.voices.delete(note)
    }, durationMs + 350)
    this.voices.set(note, { osc: [o1, o2], gain, stopTimer })
  }

  private stopVoice(note: number, at: number): void {
    const v = this.voices.get(note)
    if (!v) return
    clearTimeout(v.stopTimer)
    try {
      v.gain.gain.cancelScheduledValues(at)
      v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), at)
      v.gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05)
      for (const o of v.osc) o.stop(at + 0.06)
    } catch {
      /* node may already be stopped */
    }
    this.voices.delete(note)
  }

  allNotesOff(): void {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    for (const note of [...this.voices.keys()]) this.stopVoice(note, now)
  }

  /** A short pitched cue for correct/wrong feedback (off by default in settings). */
  cue(kind: 'correct' | 'wrong'): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    // correct: rising perfect fifth; wrong: falling minor second — both brief and soft.
    const steps = kind === 'correct' ? [0, 7] : [2, 1]
    steps.forEach((semi, i) => {
      const t = now + i * 0.09
      const g = ctx.createGain()
      g.connect(this.master!)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = 660 * 2 ** (semi / 12)
      o.connect(g)
      o.start(t)
      o.stop(t + 0.18)
    })
  }
}

/**
 * The app-wide Sound. Holds a MIDI voice and a synth voice and dispatches per
 * the current source, so switching sound source in Settings is a field set, not
 * a re-instantiation. The game keeps one stable reference.
 */
export class AppSound implements Sound {
  private synth = new SynthSound()
  private source: SoundSource = 'piano'

  constructor(private engine: MidiEngine) {}

  setSource(source: SoundSource): void {
    this.source = source
  }

  /** Prime the synth's AudioContext from a user gesture (the Connect tap). */
  unlock(): Promise<void> {
    return this.synth.unlock()
  }

  private get usesPiano(): boolean {
    return this.source === 'piano' || this.source === 'both'
  }
  private get usesSynth(): boolean {
    return this.source === 'in-app' || this.source === 'both'
  }

  playNote(note: number, opts: PlayOptions = {}): void {
    if (this.usesPiano) this.engine.playNote(note, opts)
    if (this.usesSynth) this.synth.playNote(note, opts)
  }

  allNotesOff(): void {
    // Always silence both, regardless of current source, so nothing lingers.
    this.engine.allNotesOff()
    this.synth.allNotesOff()
  }

  cue(kind: 'correct' | 'wrong'): void {
    this.synth.cue(kind)
  }
}
