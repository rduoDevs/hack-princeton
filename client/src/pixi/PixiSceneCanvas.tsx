import { useEffect, useRef } from 'react'
import { PixiScene } from './PixiScene'
import { useGameStore } from '../store/gameStore'

export default function PixiSceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef  = useRef<PixiScene | null>(null)
  const gameState   = useGameStore((s) => s.gameState)
  const localPlayerId = useGameStore((s) => s.localPlayerId)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Guard: skip if a scene is already alive (React StrictMode double-fire)
    if (sceneRef.current) return

    const scene = new PixiScene(canvas)
    sceneRef.current = scene

    const onResize = () => scene.resize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (gameState && sceneRef.current) {
      sceneRef.current.updateFromGameState(gameState)
    }
  }, [gameState])

  useEffect(() => {
    if (localPlayerId && sceneRef.current) {
      sceneRef.current.setLocalPlayerId(localPlayerId)
    }
  }, [localPlayerId])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  )
}
