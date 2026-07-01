import { useSyncExternalStore } from 'react'
import { midi } from '../engine/midi'
import type { MidiState } from '../engine/types'

/** Live snapshot of the MIDI engine. */
export function useMidi(): MidiState {
  return useSyncExternalStore(midi.subscribe, midi.getSnapshot, midi.getSnapshot)
}
