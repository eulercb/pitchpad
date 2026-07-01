// Web MIDI engine — enumerate, select, send, receive, hot-plug. Framework-free.
//
// A note on note-off scheduling: the spec suggests scheduling Note Off via the
// MIDIOutput.send() timestamp argument. We deliberately use a *cancelable*
// setTimeout instead. Timestamped sends are fire-and-forget — they cannot be
// cancelled — so a retrigger of the same pitch, or a reset, would leave a stale
// scheduled Note Off that cuts the new note or fires after teardown. A 1s
// note-off needs no sub-ms precision, and "never leave a stuck note / never cut
// a live note" is the overriding requirement, so cancelable scheduling wins.
import { Observable } from './observable'
import type { MidiInputEvent, MidiPortInfo, MidiState, PlayOptions } from './types'

type NoteListener = (e: MidiInputEvent) => void

export interface ConnectOptions {
  preferredInputName?: string | null
  preferredOutputName?: string | null
  /** Dev-only: use the virtual transport instead of real hardware. Never ships enabled. */
  mock?: boolean
}

const NOTE_ON = 0x90
const NOTE_OFF = 0x80
const CC = 0xb0
const ALL_SOUND_OFF = 0x78 // CC 120
const ALL_NOTES_OFF = 0x7b // CC 123

const UNSUPPORTED_MSG =
  'Web MIDI isn’t available here. Open PitchPad in Chrome on Android.'

function toInfo(port: MIDIPort): MidiPortInfo {
  return {
    id: port.id,
    name: port.name ?? 'Unknown device',
    manufacturer: port.manufacturer ?? '',
  }
}

export class MidiEngine extends Observable<MidiState> {
  private access: MIDIAccess | null = null
  private currentInput: MIDIInput | null = null
  private currentOutput: MIDIOutput | null = null
  private noteListeners = new Set<NoteListener>()

  /** Notes we've turned on, with their cancelable auto-off timer. */
  private outstanding = new Map<number, { channel: number; timer: ReturnType<typeof setTimeout> }>()

  private mockMode = false
  private preferredInputName: string | null = null
  private preferredOutputName: string | null = null
  private inputChannelFilter: number | null = null // null = omni

  constructor() {
    super({
      status: 'IDLE',
      inputs: [],
      outputs: [],
      selectedInputName: null,
      selectedOutputName: null,
      mock: false,
      message: null,
    })
  }

  // ── Inbound note subscription (the game listens here) ────────────────────
  onNote = (fn: NoteListener): (() => void) => {
    this.noteListeners.add(fn)
    return () => {
      this.noteListeners.delete(fn)
    }
  }

  private emitNote(e: MidiInputEvent): void {
    for (const l of this.noteListeners) l(e)
  }

  /** Restrict inbound to one channel, or pass null for omni. */
  setInputChannelFilter(ch: number | null): void {
    this.inputChannelFilter = ch
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  async connect(opts: ConnectOptions = {}): Promise<void> {
    if (opts.preferredInputName !== undefined) this.preferredInputName = opts.preferredInputName
    if (opts.preferredOutputName !== undefined) this.preferredOutputName = opts.preferredOutputName

    if (opts.mock) {
      this.setupMock()
      return
    }

    // Feature-detect first — never throw into a blank screen.
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.requestMIDIAccess !== 'function'
    ) {
      this.setState({ status: 'UNSUPPORTED', message: UNSUPPORTED_MSG })
      return
    }

    this.setState({ status: 'CONNECTING', message: null })
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false })
      this.access = access
      access.onstatechange = this.handleStateChange
      this.refreshPorts()
    } catch (err) {
      this.setState({
        status: 'PERMISSION_DENIED',
        message:
          'PitchPad needs permission to reach your MIDI device. Tap Connect to try again.',
      })
      // keep the underlying error out of the UI but available for debugging
      if (import.meta.env.DEV) console.warn('[midi] requestMIDIAccess failed', err)
    }
  }

  private handleStateChange = (): void => {
    if (this.mockMode) return
    this.refreshPorts()
  }

  /** Enumerate ports, (re)select input/output, rewire the inbound handler, set status. */
  private refreshPorts(): void {
    if (!this.access) return
    const inputPorts = [...this.access.inputs.values()]
    const outputPorts = [...this.access.outputs.values()]
    const inputs = inputPorts.map(toInfo)
    const outputs = outputPorts.map(toInfo)

    const input = this.pickPort(inputPorts, this.state.selectedInputName, this.preferredInputName)
    const output = this.pickPort(outputPorts, this.state.selectedOutputName, this.preferredOutputName)

    this.attachInput(input)
    this.currentOutput = output

    const hadConnection =
      this.state.status === 'CONNECTED' || this.state.status === 'DISCONNECTED_MIDSESSION'
    const anyPorts = inputPorts.length > 0 || outputPorts.length > 0

    let status: MidiState['status']
    let message: string | null = null
    if (!anyPorts) {
      status = hadConnection ? 'DISCONNECTED_MIDSESSION' : 'NO_DEVICE'
    } else {
      status = 'CONNECTED'
      if (!input) message = 'Connected, but no MIDI input — you can still tap the keyboard to answer.'
      else if (!output) message = 'Connected, but no MIDI output — turn on in-app sound to hear notes.'
    }

    this.setState({
      status,
      inputs,
      outputs,
      selectedInputName: input ? (input.name ?? null) : null,
      selectedOutputName: output ? (output.name ?? null) : null,
      message,
    })
  }

  /** Prefer the currently-selected name, then the persisted preferred name, then the first port. */
  private pickPort<T extends MIDIPort>(
    ports: T[],
    selectedName: string | null,
    preferredName: string | null,
  ): T | null {
    if (ports.length === 0) return null
    for (const name of [selectedName, preferredName]) {
      if (!name) continue
      const hit = ports.find((p) => (p.name ?? '') === name)
      if (hit) return hit
    }
    return ports[0]
  }

  private attachInput(input: MIDIInput | null): void {
    if (this.currentInput === input) return
    if (this.currentInput) this.currentInput.onmidimessage = null
    this.currentInput = input
    if (input) input.onmidimessage = this.handleMessage
  }

  private handleMessage = (e: MIDIMessageEvent): void => {
    const data = e.data
    if (!data || data.length < 2) return
    const status = data[0]
    const cmd = status & 0xf0
    const channel = status & 0x0f
    if (this.inputChannelFilter !== null && channel !== this.inputChannelFilter) return

    if (cmd === NOTE_ON) {
      const velocity = data[2] ?? 0
      if (velocity > 0) this.emitNote({ type: 'noteOn', note: data[1], velocity, channel })
      else this.emitNote({ type: 'noteOff', note: data[1], channel }) // note-on vel 0 = off
    } else if (cmd === NOTE_OFF) {
      this.emitNote({ type: 'noteOff', note: data[1], channel })
    }
    // Everything else (clock, CC, aftertouch, pitch bend, sysex) is ignored, not crashed on.
  }

  // ── Device selection (Settings) ──────────────────────────────────────────
  selectInput(name: string | null): void {
    this.preferredInputName = name
    this.setState({ selectedInputName: name })
    this.refreshPorts()
  }

  selectOutput(name: string | null): void {
    this.preferredOutputName = name
    this.setState({ selectedOutputName: name })
    this.refreshPorts()
  }

  // ── Sending ────────────────────────────────────────────────────────────
  private sendRaw(bytes: number[]): void {
    if (this.mockMode) return // no real port to drive; the Sound layer handles audible output
    try {
      this.currentOutput?.send(bytes)
    } catch (err) {
      // the port can vanish between our null-check and send() during a hot-unplug
      if (import.meta.env.DEV) console.warn('[midi] send failed', err)
    }
  }

  /** Play a note now and schedule its Note Off. Retriggering the same pitch is safe. */
  playNote(note: number, opts: PlayOptions = {}): void {
    const channel = opts.channel ?? 0
    const velocity = opts.velocity ?? 90
    const durationMs = opts.durationMs ?? 1000

    // Retrigger safety: silence any live copy of this pitch before re-striking.
    const live = this.outstanding.get(note)
    if (live) {
      clearTimeout(live.timer)
      this.sendRaw([NOTE_OFF | live.channel, note, 0])
      this.outstanding.delete(note)
    }

    this.sendRaw([NOTE_ON | channel, note, velocity])
    const timer = setTimeout(() => {
      this.sendRaw([NOTE_OFF | channel, note, 0])
      this.outstanding.delete(note)
    }, durationMs)
    this.outstanding.set(note, { channel, timer })
  }

  /** Panic: explicit Note Off for every tracked note + All Notes/Sound Off on all channels. */
  allNotesOff(): void {
    for (const [note, { channel, timer }] of this.outstanding) {
      clearTimeout(timer)
      this.sendRaw([NOTE_OFF | channel, note, 0])
    }
    this.outstanding.clear()
    // Belt-and-suspenders across every channel so nothing sticks regardless of routing.
    for (let ch = 0; ch < 16; ch++) {
      this.sendRaw([CC | ch, ALL_NOTES_OFF, 0])
      this.sendRaw([CC | ch, ALL_SOUND_OFF, 0])
    }
  }

  // ── Mock transport (dev only) ─────────────────────────────────────────────
  private setupMock(): void {
    this.mockMode = true
    const input: MidiPortInfo = { id: 'mock-in', name: 'Mock Piano', manufacturer: 'PitchPad' }
    const output: MidiPortInfo = { id: 'mock-out', name: 'Mock Piano', manufacturer: 'PitchPad' }
    this.setState({
      status: 'CONNECTED',
      inputs: [input],
      outputs: [output],
      selectedInputName: input.name,
      selectedOutputName: output.name,
      mock: true,
      message: 'Mock MIDI (dev) — tap the keyboard to answer.',
    })
  }

  /** Dev/test hook: feed a synthetic inbound event as if it came from the port. */
  simulateInput(e: MidiInputEvent): void {
    this.emitNote(e)
  }

  get isMock(): boolean {
    return this.mockMode
  }
}

// App-wide singleton (survives React StrictMode double-mounts).
export const midi = new MidiEngine()
