import { useGameStore } from '../store/gameStore'
import socket from '../socket'

const FONT    = "'Press Start 2P', monospace"
const SCANLINE = 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)'

export default function GameOver() {
  const gameState    = useGameStore((s) => s.gameState)
  const localPlayerId = useGameStore((s) => s.localPlayerId)
  const reset        = useGameStore((s) => s.reset)

  if (gameState?.phase !== 'over') return null
  if (!gameState.round || gameState.round < 1) return null
  if (localPlayerId && !gameState.players.some(p => p.id === localPlayerId)) return null

  const outcome   = gameState.outcome
  const isWin     = outcome?.result === 'win'
  const mainColor = isWin ? '#00ff88' : '#ff3333'

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
          MISSION {isWin ? 'COMPLETE' : 'FAILED'}
        </div>
        <div
          style={{
            fontSize: 26,
            color: mainColor,
            marginBottom: 26,
            textShadow: `0 0 24px ${mainColor}88`,
            letterSpacing: 2,
          }}
        >
          {isWin ? 'SURVIVED' : 'LOST'}
        </div>

        {outcome?.message && (
          <div style={{ fontSize: 8, color: '#778899', marginBottom: 22, lineHeight: 2.2, maxWidth: 420 }}>
            {outcome.message}
          </div>
        )}

        {outcome?.survivors && outcome.survivors.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 7, color: '#334455', letterSpacing: 2, marginBottom: 8 }}>SURVIVORS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {outcome.survivors.map((name, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(0,255,136,0.07)',
                    border: '2px solid #00ff8844',
                    color: '#00ff88',
                    padding: '3px 9px',
                    fontSize: 7,
                  }}
                >
                  {name}
                </span>
              ))}
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
