import { useSyncExternalStore } from 'react'
import { game } from '../runtime'
import type { GameState } from '../engine/types'

/** Live snapshot of the game state machine. */
export function useGame(): GameState {
  return useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot)
}
