import { useEffect, useState } from 'react'
import type { StoryAlert as StoryAlertType } from '../store/gameStore'

interface Props { alert: StoryAlertType }

const FONT = "'Press Start 2P', monospace"
const BODY  = "'VT323', 'Courier New', monospace"

const COLORS = { info: '#00e5ff', warning: '#ffd700', critical: '#ff3333' }
const ICONS  = { info: '>',       warning: '!',       critical: '!!' }

export default function StoryAlert({ alert }: Props) {
  const [visible, setVisible] = useState(true)
  const color = COLORS[alert.type]

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 9000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(560px, 93vw)',
        background: 'rgba(4,4,16,0.97)',
        border: `2px solid ${color}`,
        padding: '10px 14px',
        zIndex: 50,
        fontFamily: FONT,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
        animation: 'pixelDrop 0.12s steps(3) forwards',
      }}
    >
      <style>{`
        @keyframes pixelDrop {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 7, color, letterSpacing: 2, marginBottom: 6 }}>
            [{ICONS[alert.type]}] RND&nbsp;{alert.round} // {alert.title.toUpperCase()}
          </div>
          <div style={{ fontFamily: BODY, fontSize: 15, color: '#99aabb', lineHeight: 1.55 }}>
            {alert.body}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent',
            border: `1px solid ${color}44`,
            color,
            cursor: 'pointer',
            fontSize: 9,
            fontFamily: FONT,
            padding: '2px 6px',
            flexShrink: 0,
          }}
        >
          X
        </button>
      </div>
    </div>
  )
}
