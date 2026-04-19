import { useEffect } from 'react'
import socket from '../socket'
import { useGameStore } from '../store/gameStore'

const FONT = "'Press Start 2P', monospace"
const BODY = "'VT323', monospace"

function Row({ label, value, color = '#7799bb' }: { label: string; value: string | number | null | undefined; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ fontSize: 6, color: '#445566', fontFamily: FONT }}>{label}</span>
      <span style={{ fontSize: 11, color, fontFamily: BODY }}>{value ?? '—'}</span>
    </div>
  )
}

export default function AgentPopupDashboard() {
  const selectedId    = useGameStore((s) => s.selectedAgentId)
  const dashboards    = useGameStore((s) => s.agentDashboards)
  const players       = useGameStore((s) => s.gameState?.players ?? [])
  const setSelectedId = useGameStore((s) => s.setSelectedAgentId)
  const setDashboard  = useGameStore((s) => s.setAgentDashboard)

  useEffect(() => {
    if (!selectedId) return
    socket.emit('game:get_dashboard', { playerId: selectedId })
  }, [selectedId])

  useEffect(() => {
    const handler = (d: any) => { if (d) setDashboard(d) }
    socket.on('game:dashboard', handler)
    return () => { socket.off('game:dashboard', handler) }
  }, [setDashboard])

  if (!selectedId) return null

  const player = players.find(p => p.id === selectedId)
  const data   = dashboards[selectedId]

  return (
    <div style={{
      position: 'fixed',
      bottom: 10, right: 10,
      width: 260,
      background: 'rgba(4,4,20,0.97)',
      border: '2px solid #cc88ff',
      borderRadius: 2,
      padding: '10px 14px',
      fontFamily: FONT,
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 7, color: '#cc88ff', letterSpacing: 2 }}>
          AGENT: {player?.name ?? selectedId}
        </span>
        <button
          onClick={() => setSelectedId(null)}
          style={{
            background: 'transparent', border: '1px solid #445566', color: '#7799bb',
            padding: '2px 6px', fontSize: 8, cursor: 'pointer', fontFamily: FONT,
          }}>
          X
        </button>
      </div>

      {/* Status */}
      <Row label="STATUS"
           value={player?.alive ? 'ALIVE' : `DEAD R${player?.deathRound}`}
           color={player?.alive ? '#00ff88' : '#ff4444'} />

      {data ? (
        <>
          <Row label="PRIV O₂"          value={data.privateOxygen}           color="#ff88cc" />
          <Row label="DONATED OUT"       value={data.donatedOutThisRound}     color="#ffd700" />
          <Row label="DONATED IN"        value={data.donatedInThisRound}      color="#00e5ff" />
          <Row label="VOTE TARGET"       value={data.currentVoteTarget ?? 'none'} color="#ff8833" />
          <Row label="WHISPER OUT"       value={data.whisperOutDegree}        color="#cc88ff" />
          <Row label="WHISPER IN"        value={data.whisperInDegree}         color="#cc88ff" />
          <Row label="ACCUSATIONS"       value={data.recentAccusationCount}   color="#ff4444" />

          {/* Strategy summary */}
          {data.dashboardSummary && (
            <div style={{
              marginTop: 10, padding: '6px 8px',
              background: 'rgba(180,100,255,0.06)',
              border: '1px solid #2a1a4a',
            }}>
              <div style={{ fontSize: 5, color: '#334455', marginBottom: 4, fontFamily: FONT }}>
                INFERRED STRATEGY (speculative):
              </div>
              <div style={{ fontSize: 12, color: '#bbaadd', fontFamily: BODY, lineHeight: 1.4 }}>
                {data.dashboardSummary}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 9, color: '#334455', fontFamily: BODY, marginTop: 6 }}>
          Loading...
        </div>
      )}

      {/* Discriminator note */}
      <div style={{ fontSize: 5, color: '#223344', marginTop: 10, fontFamily: FONT, lineHeight: 1.6 }}>
        Inferences are observational estimates only.
        They do not affect gameplay.
      </div>
    </div>
  )
}
