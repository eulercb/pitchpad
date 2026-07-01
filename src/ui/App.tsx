import { useEffect, useState } from 'react'
import { useGame } from '../hooks/useGame'
import { useWakeLock } from '../hooks/useWakeLock'
import { useStore } from '../store'
import { answerByTap } from '../runtime'
import { ConnectScreen } from './ConnectScreen'
import { ConnectionBar } from './ConnectionBar'
import { RoundView } from './RoundView'
import { Keyboard, type RevealTarget } from './Keyboard'
import { Stats } from './Stats'
import { StartPanel, PausedPanel } from './StartPanel'
import { SessionSummary } from './SessionSummary'
import { SettingsSheet } from './SettingsSheet'
import { UpdateToast } from './UpdateToast'
import type { GamePhase, GameState } from '../engine/types'

const ACTIVE: ReadonlySet<GamePhase> = new Set<GamePhase>([
  'PLAYING_REFERENCE',
  'PLAYING_TARGET',
  'AWAITING_ANSWER',
  'JUDGING',
  'FEEDBACK_CORRECT',
  'FEEDBACK_WRONG',
])

function revealFor(g: GameState): RevealTarget | null {
  if (g.target == null) return null
  if (g.phase === 'FEEDBACK_WRONG' && g.revealed) return { midi: g.target, kind: 'wrong' }
  if (g.phase === 'FEEDBACK_CORRECT') return { midi: g.target, kind: 'correct' }
  return null
}

export function App() {
  const g = useGame()
  const settings = useStore((s) => s.settings)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const active = ACTIVE.has(g.phase)
  useWakeLock(active)

  // Apply the theme + keep the browser chrome color in sync.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#e7dcc6' : '#1c1410')
  }, [settings.theme])

  // Never connected (or fully disconnected outside a session) → the connect gate.
  if (g.phase === 'DISCONNECTED') {
    return (
      <>
        <ConnectScreen />
        <UpdateToast />
      </>
    )
  }

  let main
  if (g.phase === 'READY') main = <StartPanel />
  else if (g.phase === 'SESSION_SUMMARY') main = <SessionSummary />
  else if (g.phase === 'PAUSED') main = <PausedPanel />
  else main = <RoundView />

  const answerInteractive = g.phase === 'AWAITING_ANSWER' || g.phase === 'FEEDBACK_WRONG'

  return (
    <div className="flex h-full flex-col">
      <ConnectionBar onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex min-h-0 flex-1 flex-col">{main}</div>

      {active && (
        <>
          <Keyboard
            min={settings.rangeMin}
            max={settings.rangeMax}
            answered={g.phase === 'FEEDBACK_WRONG' ? g.lastAnswer : null}
            reveal={revealFor(g)}
            interactive={answerInteractive}
            showLabels={settings.showNoteLabels}
            onPress={answerByTap}
          />
          <Stats />
        </>
      )}

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      <UpdateToast />
    </div>
  )
}
