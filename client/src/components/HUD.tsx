import { useGameStore } from '../store/gameStore'
import ResourceBars from './ResourceBars'
import PlayerCards from './PlayerCards'
import ChatPanel from './ChatPanel'
import ActionMenu from './ActionMenu'
import PhaseTimer from './PhaseTimer'
import GameOver from './GameOver'
import StoryAlert from './StoryAlert'

const FONT = "'Press Start 2P', monospace"
const SCANLINE = 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)'

export default function HUD() {
  const gameState = useGameStore((s) => s.gameState)
  const phase = gameState?.phase ?? 'lobby'
  const round = gameState?.round ?? 0

  const phaseColor =
    phase === 'discussion'  ? '#00e5ff'
    : phase === 'action'    ? '#ffd700'
    : phase === 'resolution'? '#ff8833'
    : '#556677'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        fontFamily: FONT,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 44,
          background: 'rgba(4,4,16,0.96)',
          borderBottom: '2px solid #001533',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          backgroundImage: SCANLINE,
        }}
      >
        <div style={{ fontSize: 10, color: '#00e5ff', letterSpacing: 1, textShadow: '0 0 12px rgba(0,229,255,0.7)' }}>
          HAIL MARY
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ fontSize: 8, color: '#334455' }}>
            RND&nbsp;<span style={{ color: '#e0e0e0', fontSize: 12 }}>{round}</span>
          </div>
          <div
            style={{
              fontSize: 8,
              color: phaseColor,
              border: `2px solid ${phaseColor}`,
              padding: '3px 8px',
              textShadow: `0 0 8px ${phaseColor}66`,
            }}
          >
            {phase.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Story event banner */}
      {gameState?.storyAlert && (
        <StoryAlert key={gameState.round} alert={gameState.storyAlert} />
      )}

      <ResourceBars />
      <PlayerCards />

      <div style={{ pointerEvents: 'all' }}>
        <ChatPanel />
        <ActionMenu />
      </div>
      <PhaseTimer />
      <GameOver />
    </div>
  )
}
