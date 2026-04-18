import { useGameStore } from '../store/gameStore'

const FONT = "'Press Start 2P', monospace"
const HP_SEGMENTS = 5

export default function PlayerCards() {
  const players   = useGameStore((s) => s.gameState?.players ?? [])
  const localId   = useGameStore((s) => s.localPlayerId)
  const setWhisp  = useGameStore((s) => s.setActiveWhisperTarget)

  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 176,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        pointerEvents: 'all',
        fontFamily: FONT,
      }}
    >
      {players.map((p) => {
        const isLocal  = p.id === localId
        const hpPct    = Math.max(0, Math.min(100, p.health))
        const hpColor  = hpPct > 60 ? '#00ff88' : hpPct > 30 ? '#ffd700' : '#ff3333'
        const typeClr  = p.type === 'human' ? '#00e5ff' : '#ff4444'
        const filledSg = Math.round((hpPct / 100) * HP_SEGMENTS)

        return (
          <div
            key={p.id}
            style={{
              background: isLocal ? 'rgba(0,40,60,0.96)' : 'rgba(4,4,16,0.96)',
              border: `2px solid ${isLocal ? '#00e5ff' : '#0d1e2e'}`,
              padding: '6px 8px',
              opacity: p.alive ? 1 : 0.4,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 7, color: p.alive ? '#ddeeff' : '#445566', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name.slice(0, 9)}{isLocal && <span style={{ color: '#00e5ff' }}>*</span>}
              </span>
              <span style={{ fontSize: 6, color: typeClr, flexShrink: 0 }}>
                {p.type === 'human' ? 'HMN' : 'A.I'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 6, color: '#334455' }}>
                {(p.role ?? '').slice(0, 6).toUpperCase()}
              </span>
              {!isLocal && p.alive && (
                <button
                  onClick={() => setWhisp(p.id)}
                  style={{
                    fontSize: 6,
                    padding: '1px 4px',
                    background: 'rgba(180,100,220,0.1)',
                    border: '1px solid #5533aa',
                    color: '#cc88ff',
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  [W]
                </button>
              )}
            </div>

            {/* HP pixel blocks */}
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: HP_SEGMENTS }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 5,
                    background: i < filledSg ? hpColor : 'rgba(255,255,255,0.06)',
                    boxShadow: i < filledSg ? `0 0 3px ${hpColor}55` : 'none',
                  }}
                />
              ))}
            </div>

            {!p.alive && (
              <div style={{ fontSize: 6, color: '#ff3333', marginTop: 3, textAlign: 'center', letterSpacing: 2 }}>
                KIA
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
