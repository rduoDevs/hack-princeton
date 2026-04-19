import { useGameStore } from '../store/gameStore'
import socket from '../socket'

const FONT    = "'Press Start 2P', monospace"
const SCANLINE = 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)'

export default function GameOver() {
  const gameState    = useGameStore((s) => s.gameState)
  const localPlayerId = useGameStore((s) => s.localPlayerId)
  const reset        = useGameStore((s) => s.reset)

  if (gameState?.phase !== 'over' && !gameState?.outcome) return null

  const outcome    = gameState?.outcome
  const survivors  = outcome?.survivors ?? []
  const localName  = gameState?.players.find(p => p.id === localPlayerId)?.name
  const isObserver = !localPlayerId || localPlayerId === '__observer__'
  const iSurvived  = isObserver ? survivors.length > 0 : !!(localName && survivors.includes(localName))
  const mainColor  = iSurvived ? '#00ff88' : '#ff3333'

  const handlePlayAgain = () => {
    reset()
    socket.disconnect()
    window.location.reload()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,2,10,0.93)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        pointerEvents: 'all',
        fontFamily: FONT,
        backgroundImage: SCANLINE,
      }}
    >
      <div
        style={{
          background: 'rgba(4,4,16,0.98)',
          border: `3px solid ${mainColor}`,
          padding: '38px 52px',
          textAlign: 'center',
          maxWidth: 520,
          boxShadow: `0 0 50px ${mainColor}22`,
        }}
      >
        {/* Corner pixels */}
        {[{ top: 5, left: 5 }, { top: 5, right: 5 }, { bottom: 5, left: 5 }, { bottom: 5, right: 5 }].map((pos, i) => (
          <div key={i} style={{ position: 'absolute', width: 9, height: 9, background: mainColor, ...pos }} />
        ))}

        <div style={{ fontSize: 8, color: mainColor, letterSpacing: 3, marginBottom: 18 }}>
          {isObserver ? 'EXPERIMENT COMPLETE' : iSurvived ? 'MISSION COMPLETE' : 'MISSION FAILED'}
        </div>
        <div
          style={{
            fontSize: 26,
            color: mainColor,
            marginBottom: 12,
            textShadow: `0 0 24px ${mainColor}88`,
            letterSpacing: 2,
          }}
        >
          {isObserver ? (survivors.length > 0 ? 'SURVIVORS' : 'EXTINCTION') : iSurvived ? 'SURVIVED' : 'YOU DIED'}
        </div>
        {!isObserver && !iSurvived && survivors.length > 0 && (
          <div style={{ fontSize: 7, color: '#556677', marginBottom: 14, letterSpacing: 1 }}>
            {survivors.length} crew member{survivors.length > 1 ? 's' : ''} made it without you
          </div>
        )}

        {outcome?.totalOxygenRemaining !== undefined && (
          <div style={{ fontSize: 7, color: '#778899', marginBottom: 16 }}>
            O₂ remaining: {outcome.totalOxygenRemaining} | round {outcome.finalRound}
          </div>
        )}

        {survivors.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 7, color: '#334455', letterSpacing: 2, marginBottom: 8 }}>
              {!isObserver && !iSurvived ? 'OUTLIVED YOU' : 'SURVIVORS'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {survivors.map((name, i) => {
                const isMe = name === localName
                return (
                  <span
                    key={i}
                    style={{
                      background: isMe ? 'rgba(0,255,136,0.12)' : 'rgba(255,136,51,0.07)',
                      border: `2px solid ${isMe ? '#00ff8844' : '#ff883344'}`,
                      color: isMe ? '#00ff88' : '#ff8833',
                      padding: '3px 9px',
                      fontSize: 7,
                    }}
                  >
                    {name}{isMe ? ' ★' : ''}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <button
          onClick={handlePlayAgain}
          style={{
            background: 'rgba(0,229,255,0.07)',
            border: '2px solid #00e5ff',
            color: '#00e5ff',
            padding: '11px 30px',
            fontSize: 8,
            cursor: 'pointer',
            fontFamily: FONT,
            letterSpacing: 2,
            textShadow: '0 0 8px rgba(0,229,255,0.7)',
          }}
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  )
}
