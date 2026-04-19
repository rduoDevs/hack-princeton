import { useState } from 'react'
import socket from '../socket'
import { useGameStore, GameMode } from '../store/gameStore'

const FONT = "'Press Start 2P', monospace"
const SCAN = 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)'

export default function ModeSelector() {
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [connecting, setConnecting] = useState(false)
  const setConnected  = useGameStore((s) => s.setConnected)
  const setJoined     = useGameStore((s) => s.setJoined)
  const setObserver   = useGameStore((s) => s.setObserver)
  const setSelectedMode = useGameStore((s) => s.setSelectedMode)

  const connect = (fn: () => void) => {
    setConnecting(true)
    setError('')

    const onConnect = () => {
      socket.off('connect_error', onError)
      setConnecting(false)
      fn()
    }
    const onError = () => {
      socket.off('connect', onConnect)
      setConnecting(false)
      setError('CONNECTION FAILED')
    }

    if (socket.connected) {
      setConnecting(false)
      fn()
    } else {
      socket.once('connect', onConnect)
      socket.once('connect_error', onError)
      socket.connect()
    }
  }

  const joinHuman = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('CALLSIGN REQUIRED'); return }
    connect(() => {
      setConnected(true)
      socket.emit('game:select_mode', { mode: 'human_vs_ai' as GameMode })
      socket.emit('game:join', { name: trimmed, type: 'human' })
      setSelectedMode('human_vs_ai')
    })
  }

  const watchAI = () => {
    connect(() => {
      setConnected(true)
      socket.emit('game:select_mode', { mode: 'all_ai_observer' as GameMode })
      setSelectedMode('all_ai_observer')
      setObserver(true)
      // Observer is "joined" with no player ID
      setJoined('__observer__', 'OBSERVER')
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#060610',
      backgroundImage: SCAN,
      zIndex: 200, fontFamily: FONT,
    }}>
      <div style={{
        position: 'relative', background: 'rgba(4,4,20,0.98)',
        border: '3px solid #00e5ff', padding: '42px 52px',
        textAlign: 'center', maxWidth: 500, width: '94%',
        boxShadow: '0 0 0 1px #001533, 0 0 80px rgba(0,229,255,0.12)',
      }}>
        {/* Corner markers */}
        {[{top:5,left:5},{top:5,right:5},{bottom:5,left:5},{bottom:5,right:5}].map((pos,i) => (
          <div key={i} style={{position:'absolute',width:9,height:9,background:'#00e5ff',...pos}}/>
        ))}

        <div style={{fontSize:7,color:'#223344',letterSpacing:3,marginBottom:18}}>// MISSION SELECT //</div>
        <div style={{fontSize:20,color:'#00e5ff',letterSpacing:2,marginBottom:8,textShadow:'0 0 24px rgba(0,229,255,0.7)'}}>HAIL MARY</div>
        <div style={{fontSize:10,color:'#334455',letterSpacing:4,marginBottom:10}}>PROTOCOL</div>
        <div style={{fontSize:7,color:'#ff4444',letterSpacing:1,marginBottom:34}}>OXYGEN SCARCITY // AI ALIGNMENT</div>

        {/* Human mode */}
        <div style={{marginBottom:24,paddingBottom:24,borderBottom:'1px solid #0d1e2e'}}>
          <div style={{fontSize:7,color:'#00e5ff',letterSpacing:2,marginBottom:12}}>[ PLAY AS CREW ]</div>
          <input type="text" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&joinHuman()} placeholder=">_ ENTER CALLSIGN"
            maxLength={20} autoFocus
            style={{
              width:'100%', background:'rgba(0,229,255,0.04)', border:'2px solid rgba(0,229,255,0.35)',
              color:'#99ddee', padding:'11px 14px', fontSize:9, outline:'none',
              fontFamily:FONT, textAlign:'center', letterSpacing:1, marginBottom:8,
            }}
          />
          <button onClick={joinHuman} disabled={connecting}
            style={{
              width:'100%', background:'rgba(0,229,255,0.08)', border:'2px solid #00e5ff',
              color:'#00e5ff', padding:'12px', fontSize:8, cursor:connecting?'not-allowed':'pointer',
              fontFamily:FONT, letterSpacing:2,
              textShadow:'0 0 10px rgba(0,229,255,0.8)',
            }}>
            [ JOIN AS CREW — HUMAN VS AI ]
          </button>
        </div>

        {/* Observer mode */}
        <div>
          <div style={{fontSize:7,color:'#cc88ff',letterSpacing:2,marginBottom:12}}>[ RESEARCH OBSERVER ]</div>
          <button onClick={watchAI} disabled={connecting}
            style={{
              width:'100%', background:'rgba(180,100,255,0.08)', border:'2px solid #cc88ff',
              color:'#cc88ff', padding:'12px', fontSize:8, cursor:connecting?'not-allowed':'pointer',
              fontFamily:FONT, letterSpacing:2,
            }}>
            [ WATCH ALL-AI EXPERIMENT ]
          </button>
          <div style={{fontSize:6,color:'#334455',marginTop:8}}>Full metrics · Discriminator outputs · Agent dashboards</div>
        </div>

        {error && <div style={{fontSize:7,color:'#ff3333',marginTop:14}}>[ERR] {error}</div>}
        {connecting && <div style={{fontSize:7,color:'#556677',marginTop:10}}>// CONNECTING...</div>}
      </div>
    </div>
  )
}
