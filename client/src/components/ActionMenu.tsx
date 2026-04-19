import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import socket from '../socket'

const FONT = "'Press Start 2P', monospace"
const BODY = "'VT323', monospace"
const SCAN = 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 4px)'

export default function ActionMenu() {
  const phase      = useGameStore((s) => s.phaseInfo?.phase ?? s.gameState?.phase)
  const players    = useGameStore((s) => s.gameState?.players ?? [])
  const localId    = useGameStore((s) => s.localPlayerId)
  const privateOxy = useGameStore((s) => s.privateOxygen ?? 0)

  const [donateTarget, setDonateTarget] = useState('')
  const [donateAmount, setDonateAmount] = useState(1)
  const [voteTarget, setVoteTarget] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const alivePlayers = players.filter(p => p.alive)

  useEffect(() => {
    setSubmitted(false)
    setDonateTarget('')
    setDonateAmount(1)
    // Auto-select first alive player so a vote is always ready to submit
    setVoteTarget(alivePlayers[0]?.id ?? '')
  }, [phase])

  const others = players.filter(p => p.alive && p.id !== localId)

  const isLocalAlive = players.find(p => p.id === localId)?.alive ?? false

  if (!isLocalAlive) return null
  if (phase !== 'donation' && phase !== 'voting') return null

  const sendDonate = () => {
    if (!donateTarget || donateAmount <= 0) return
    socket.emit('game:donate', { entries: [{ toPlayerId: donateTarget, amount: donateAmount }] })
    setSubmitted(true)
  }

  const sendSacrifice = () => {
    if (!confirm('SACRIFICE yourself? Your private oxygen goes to the public pool.')) return
    socket.emit('game:sacrifice')
    setSubmitted(true)
  }

  const sendVote = () => {
    if (!voteTarget) return
    socket.emit('game:vote', { targetId: voteTarget })
    setSubmitted(true)
  }

  const borderColor = phase === 'donation' ? '#ffd700' : '#ff8833'

  return (
    <div style={{
      position: 'absolute', bottom: 160, right: 10,
      background: 'rgba(4,4,16,0.96)', border: `2px solid ${borderColor}`,
      borderRight: `2px solid ${borderColor}`, padding: '10px 14px',
      fontFamily: FONT, backgroundImage: SCAN, minWidth: 230, zIndex: 10,
    }}>
      <div style={{ fontSize: 7, color: borderColor, letterSpacing: 2, marginBottom: 8 }}>
        {phase === 'donation' ? '[ DONATE / SACRIFICE ]' : '[ VOTE ]'}
      </div>

      {submitted && (
        <div style={{ fontSize: 7, color: '#00ff88', marginBottom: 6 }}>
          ✓ SUBMITTED
        </div>
      )}

      {!submitted && phase === 'donation' && (
        <>
          <div style={{ marginBottom: 8 }}>
            <select value={donateTarget} onChange={e => setDonateTarget(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,215,0,0.06)', border: '1px solid #443300',
                color: donateTarget ? '#ffd700' : '#334455', padding: '4px', fontSize: 7, fontFamily: FONT, outline: 'none' }}>
              <option value="">-- TARGET --</option>
              {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setDonateAmount(n)}
                style={{
                  flex: 1, background: donateAmount === n ? 'rgba(255,215,0,0.15)' : 'transparent',
                  border: `1px solid ${donateAmount === n ? '#ffd700' : '#332200'}`,
                  color: donateAmount === n ? '#ffd700' : '#554400',
                  padding: '4px 0', fontSize: 7, cursor: 'pointer', fontFamily: FONT,
                }}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={sendDonate} disabled={!donateTarget}
            style={{
              width: '100%', background: 'rgba(255,215,0,0.06)', border: '1px solid #ffd700',
              color: '#ffd700', padding: '6px', fontSize: 6, cursor: 'pointer', fontFamily: FONT,
              marginBottom: 6, letterSpacing: 1,
            }}>
            DONATE {donateAmount} O₂
          </button>
          <button onClick={() => { socket.emit('game:donate', { entries: [] }); setSubmitted(true) }}
            style={{
              width: '100%', background: 'transparent', border: '1px solid #223344',
              color: '#334455', padding: '5px', fontSize: 6, cursor: 'pointer', fontFamily: FONT,
              marginBottom: 6,
            }}>
            NO DONATION
          </button>
          <button onClick={sendSacrifice}
            style={{
              width: '100%', background: 'rgba(255,0,0,0.06)', border: '1px solid #ff3333',
              color: '#ff3333', padding: '5px', fontSize: 6, cursor: 'pointer', fontFamily: FONT,
            }}>
            ⚠ SACRIFICE
          </button>
        </>
      )}

      {!submitted && phase === 'voting' && (
        <>
          <div style={{ fontSize: 6, color: '#ff4444', marginBottom: 4 }}>VOTE REQUIRED</div>
          <select value={voteTarget} onChange={e => setVoteTarget(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,136,51,0.06)', border: '1px solid #442200',
              color: '#ff8833', padding: '4px', fontSize: 7, fontFamily: FONT,
              outline: 'none', marginBottom: 8 }}>
            {alivePlayers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.id === localId ? ' [YOU]' : ''}
              </option>
            ))}
          </select>
          <button onClick={sendVote}
            style={{
              width: '100%', background: 'rgba(255,136,51,0.08)', border: '1px solid #ff8833',
              color: '#ff8833', padding: '6px', fontSize: 6,
              cursor: 'pointer', fontFamily: FONT, letterSpacing: 1,
            }}>
            {`VOTE EJECT ${alivePlayers.find(p=>p.id===voteTarget)?.name?.slice(0,8).toUpperCase() ?? '...'}`}
          </button>
        </>
      )}
    </div>
  )
}
