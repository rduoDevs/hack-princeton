import { useEffect, useState } from 'react'
import socket from './socket'
import { useGameStore } from './store/gameStore'
import PixiSceneCanvas from './pixi/PixiSceneCanvas'
import HUD from './components/HUD'

const PIXEL_FONT = "'Press Start 2P', monospace"

// ─── Join Screen ─────────────────────────────────────────────────────────────

function JoinScreen() {
  const [name, setName] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const setConnected = useGameStore((s) => s.setConnected)
  const setJoined    = useGameStore((s) => s.setJoined)

  const join = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('CALLSIGN REQUIRED'); return }
    setConnecting(true)
    setError('')

    if (!socket.connected) socket.connect()

    socket.once('connect', () => {
      setConnected(true)
      socket.emit('game:join', { name: trimmed, type: 'human' })
      setJoined(socket.id ?? 'local', trimmed)
    })

    socket.once('connect_error', () => {
      setConnecting(false)
      setError('CONNECTION FAILED — SERVER OFFLINE?')
    })

    if (socket.connected) {
      setConnected(true)
      socket.emit('game:join', { name: trimmed, type: 'human' })
      setJoined(socket.id ?? 'local', trimmed)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') join() }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060610',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
        zIndex: 200,
        fontFamily: PIXEL_FONT,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'rgba(4,4,20,0.98)',
          border: '3px solid #00e5ff',
          padding: '42px 52px',
          textAlign: 'center',
          maxWidth: 460,
          width: '92%',
          boxShadow: '0 0 0 1px #001533, 0 0 80px rgba(0,229,255,0.12)',
        }}
      >
        {/* Pixel corner accents */}
        {[
          { top: 5, left: 5 }, { top: 5, right: 5 },
          { bottom: 5, left: 5 }, { bottom: 5, right: 5 },
        ].map((pos, i) => (
          <div key={i} style={{ position: 'absolute', width: 9, height: 9, background: '#00e5ff', ...pos }} />
        ))}

        <div style={{ fontSize: 7, color: '#223344', letterSpacing: 3, marginBottom: 18 }}>
          // MISSION BRIEFING //
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#00e5ff',
            letterSpacing: 2,
            marginBottom: 8,
            textShadow: '0 0 24px rgba(0,229,255,0.7)',
          }}
        >
          HAIL MARY
        </div>
        <div style={{ fontSize: 10, color: '#334455', letterSpacing: 4, marginBottom: 10 }}>
          PROTOCOL
        </div>
        <div style={{ fontSize: 7, color: '#ff4444', letterSpacing: 1, marginBottom: 34 }}>
          AI ALIGNMENT CRISIS // SURVIVE
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            placeholder=">_ ENTER CALLSIGN"
            maxLength={20}
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(0,229,255,0.04)',
              border: '2px solid rgba(0,229,255,0.35)',
              color: '#99ddee',
              padding: '11px 14px',
              fontSize: 9,
              outline: 'none',
              fontFamily: PIXEL_FONT,
              textAlign: 'center',
              letterSpacing: 1,
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 7, color: '#ff3333', marginBottom: 10, letterSpacing: 1 }}>
            [ERR] {error}
          </div>
        )}

        <button
          onClick={join}
          disabled={connecting}
          style={{
            width: '100%',
            background: connecting ? 'transparent' : 'rgba(0,229,255,0.08)',
            border: `2px solid ${connecting ? '#1a2a3a' : '#00e5ff'}`,
            color: connecting ? '#223344' : '#00e5ff',
            padding: '12px',
            fontSize: 8,
            cursor: connecting ? 'not-allowed' : 'pointer',
            fontFamily: PIXEL_FONT,
            letterSpacing: 2,
            textShadow: connecting ? 'none' : '0 0 10px rgba(0,229,255,0.8)',
          }}
        >
          {connecting ? '// CONNECTING...' : '[ JOIN AS HUMAN CREW ]'}
        </button>

        <div style={{ marginTop: 22, fontSize: 6, color: '#1a2533' }}>
          localhost:3003
        </div>
      </div>
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const joined        = useGameStore((s) => s.joined)
  const setConnected  = useGameStore((s) => s.setConnected)
  const setJoined     = useGameStore((s) => s.setJoined)
  const setGameState  = useGameStore((s) => s.setGameState)
  const setPhaseInfo  = useGameStore((s) => s.setPhaseInfo)
  const addMessage    = useGameStore((s) => s.addMessage)
  const setActionResults = useGameStore((s) => s.setActionResults)
  const addWhisper    = useGameStore((s) => s.addWhisper)

  useEffect(() => {
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('game:state', (state) => {
      setGameState(state)
      const localName = useGameStore.getState().localPlayerName
      if (localName) {
        const self = state.players.find(
          (p: any) => p.name === localName && p.type === 'human'
        )
        if (self) useGameStore.setState({ localPlayerId: self.id })
      }
    })

    socket.on('game:phase', (info) => setPhaseInfo(info))

    socket.on('game:message', (msg) => addMessage(msg))

    socket.on('game:action_result', (payload) => {
      setActionResults(payload.results ?? [])
      if (payload.results) {
        payload.results.forEach((r: any) => {
          addMessage({
            playerId: '__system__',
            playerName: 'SYSTEM',
            text: `[RND ${payload.round}] ${r.result ?? JSON.stringify(r)}`,
            timestamp: Date.now(),
          })
        })
      }
    })

    socket.on('game:whisper', (whisper) => addWhisper(whisper))

    socket.on('game:over', (payload) => {
      const current = useGameStore.getState().gameState
      if (current) {
        setGameState({
          ...current,
          phase: 'over',
          outcome: { result: payload.outcome, survivors: payload.survivors, message: payload.message },
        })
      }
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('game:state')
      socket.off('game:phase')
      socket.off('game:message')
      socket.off('game:action_result')
      socket.off('game:over')
      socket.off('game:whisper')
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#060610' }}>
      {joined && (
        <>
          <PixiSceneCanvas />
          <HUD />
        </>
      )}
      {!joined && <JoinScreen />}
    </div>
  )
}
