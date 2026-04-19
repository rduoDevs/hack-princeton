import { useGameStore } from '../store/gameStore'

const FONT = "'Press Start 2P', monospace"
const BODY = "'VT323', monospace"

export default function ObserverControls() {
  const gameState = useGameStore((s) => s.gameState)
  const isObserver = useGameStore((s) => s.isObserver)
  const setSelectedId = useGameStore((s) => s.setSelectedAgentId)
  const selectedId = useGameStore((s) => s.selectedAgentId)

  if (!isObserver || !gameState) return null

  const players = gameState.players

  return (
    <div style={{
      position: 'absolute', top: 56, right: 10,
      background: 'rgba(4,4,16,0.96)', border: '2px solid #334455',
      borderRight: '2px solid #cc88ff', padding: '10px 14px',
      fontFamily: FONT, minWidth: 200, zIndex: 10,
    }}>
      <div style={{ fontSize: 6, color: '#cc88ff', letterSpacing: 2, marginBottom: 10 }}>
        [ OBSERVER MODE ]
      </div>
      <div style={{ fontSize: 5, color: '#334455', marginBottom: 8 }}>
        CLICK AGENT IN SCENE OR SELECT:
      </div>
      {players.map(p => (
        <button
          key={p.id}
          onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: selectedId === p.id ? 'rgba(180,100,255,0.1)' : 'transparent',
            border: `1px solid ${selectedId === p.id ? '#cc88ff' : '#1a2a3a'}`,
            color: p.alive ? (selectedId === p.id ? '#cc88ff' : '#7799bb') : '#334455',
            padding: '4px 6px', fontSize: 9, cursor: 'pointer',
            fontFamily: BODY, marginBottom: 3,
            textDecoration: p.alive ? 'none' : 'line-through',
          }}>
          {p.name}
          {!p.alive && ` [DEAD R${p.deathRound}]`}
          {p.dashboardSummary && (
            <span style={{ fontSize: 8, color: '#556677', display: 'block', paddingLeft: 4 }}>
              {p.dashboardSummary.slice(0, 28)}…
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
