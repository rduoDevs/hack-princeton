import { useGameStore } from '../store/gameStore'

const FONT    = "'Press Start 2P', monospace"
const SCANLINE = 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)'

interface PixelBarProps {
  value: number
  max: number
  color: string
  segments?: number
}

function PixelBar({ value, max, color, segments = 8 }: PixelBarProps) {
  const filled = Math.round(Math.max(0, Math.min(1, value / max)) * segments)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 8,
            background: i < filled ? color : 'rgba(255,255,255,0.07)',
            boxShadow: i < filled ? `0 0 4px ${color}55` : 'none',
          }}
        />
      ))}
    </div>
  )
}

interface BarRowProps { label: string; value: number; max: number; color: string }
function BarRow({ label, value, max, color }: BarRowProps) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, color: '#445566', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color }}>{Math.round(value)}/{max}</span>
      </div>
      <PixelBar value={value} max={max} color={color} />
    </div>
  )
}

export default function ResourceBars() {
  const ship = useGameStore((s) => s.gameState?.ship)
  if (!ship) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 172,
        background: 'rgba(4,4,16,0.96)',
        border: '2px solid #001533',
        borderLeft: '2px solid #00e5ff',
        padding: '12px',
        pointerEvents: 'none',
        fontFamily: FONT,
        backgroundImage: SCANLINE,
      }}
    >
      <div style={{ fontSize: 7, color: '#00e5ff', letterSpacing: 1, marginBottom: 12, textShadow: '0 0 8px rgba(0,229,255,0.5)' }}>
        SHIP STATUS
      </div>
      <BarRow label="HULL"  value={ship.hull_integrity} max={100} color="#ff4444" />
      <BarRow label="O2"    value={ship.oxygen}         max={100} color="#00e5ff" />
      <BarRow label="PWR"   value={ship.power}          max={100} color="#ffd700" />
      <BarRow label="PARTS" value={ship.repair_parts}   max={50}  color="#ff8833" />
    </div>
  )
}
