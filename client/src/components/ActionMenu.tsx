import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import socket from '../socket'

const FONT    = "'Press Start 2P', monospace"
const SCANLINE = 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)'

const ACTIONS = [
  { type: 'gather_oxygen', label: 'GATHER O2',  color: '#00e5ff' },
  { type: 'gather_power',  label: 'GATHER PWR', color: '#ffd700' },
  { type: 'repair',        label: 'REPAIR',      color: '#ff8833' },
  { type: 'hoard',         label: 'HOARD',       color: '#778899' },
  { type: 'share',         label: 'SHARE',       color: '#00ff88' },
  { type: 'sacrifice',     label: 'SACRIFICE',   color: '#ff4444' },
  { type: 'sabotage',      label: 'SABOTAGE',    color: '#ff2222', needsTarget: true },
] as const

export default function ActionMenu() {
  const phase   = useGameStore((s) => s.gameState?.phase)
  const players = useGameStore((s) => s.gameState?.players ?? [])
  const localId = useGameStore((s) => s.localPlayerId)
  const [selected, setSelected] = useState<string | null>(null)
  const [target, setTarget]     = useState('')
  const [sent, setSent]         = useState(false)

  if (phase !== 'action') return null

  const others = players.filter((p) => p.id !== localId && p.alive)

  const sendAction = () => {
    if (!selected) return
    const action = ACTIONS.find((a) => a.type === selected)
    if (!action) return
    if ('needsTarget' in action && action.needsTarget && !target) return
    socket.emit('game:action', {
      type: selected,
      ...('needsTarget' in action && action.needsTarget && target ? { target } : {}),
    })
    setSent(true)
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(4,4,16,0.97)',
        border: '2px solid #ffd700',
        padding: '10px 12px',
        minWidth: 370,
        fontFamily: FONT,
        backgroundImage: SCANLINE,
        pointerEvents: 'all',
      }}
    >
      <div style={{ fontSize: 7, color: '#ffd700', letterSpacing: 2, marginBottom: 10, textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>
        &gt; SELECT ACTION
      </div>

      {sent ? (
        <div style={{ fontSize: 8, color: '#00ff88', textAlign: 'center', padding: '8px 0', letterSpacing: 1 }}>
          [LOCKED] AWAITING RESOLUTION...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {ACTIONS.map((a) => {
              const active = selected === a.type
              return (
                <button
                  key={a.type}
                  onClick={() => { setSelected(a.type); setTarget('') }}
                  style={{
                    background: active ? `${a.color}20` : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${active ? a.color : '#1a2a3a'}`,
                    color: active ? a.color : '#445566',
                    padding: '4px 8px',
                    fontSize: 7,
                    cursor: 'pointer',
                    fontFamily: FONT,
                    textShadow: active ? `0 0 6px ${a.color}88` : 'none',
                  }}
                >
                  {a.label}
                </button>
              )
            })}
          </div>

          {selected === 'sabotage' && (
            <div style={{ marginBottom: 8 }}>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,34,34,0.07)',
                  border: '2px solid #ff222244',
                  color: target ? '#ff8888' : '#445566',
                  padding: '5px',
                  fontSize: 7,
                  fontFamily: FONT,
                  outline: 'none',
                }}
              >
                <option value="">-- SELECT TARGET --</option>
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.role}]
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={sendAction}
            disabled={!selected || (selected === 'sabotage' && !target)}
            style={{
              width: '100%',
              background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
              border: `2px solid ${selected ? '#00e5ff' : '#1a2a3a'}`,
              color: selected ? '#00e5ff' : '#334455',
              padding: '8px',
              fontSize: 8,
              cursor: selected ? 'pointer' : 'not-allowed',
              fontFamily: FONT,
              letterSpacing: 1,
              textShadow: selected ? '0 0 8px rgba(0,229,255,0.7)' : 'none',
            }}
          >
            CONFIRM ACTION
          </button>
        </>
      )}
    </div>
  )
}
