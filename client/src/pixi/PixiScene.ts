import * as PIXI from 'pixi.js'
import type { GameState } from '../store/gameStore'

// ─── Constants ───────────────────────────────────────────────────────────────
const WORLD_W  = 2600   // total world width
const HULL_T   = 20
const SPEED    = 200    // world px/s

const C = {
  BG:           0x020610,
  HULL:         0x0e1d2e,
  HULL_MID:     0x162638,
  HULL_LIGHT:   0x1e3048,
  INTERIOR:     0x070e1a,
  FLOOR:        0x0f1c2c,
  FLOOR_LINE:   0x182a3e,
  CEILING:      0x09121e,
  PIPE:         0x1d3550,
  PIPE_JOINT:   0x2a4a6a,
  ENGINE_CORE:  0x2233cc,
  ENG_HOT:      0x8844ff,
  PANEL:        0x0b2218,
  PANEL_LIT:    0x1a3a28,
  RIVET:        0x2a3c50,
  WIN_FRAME:    0x1c3555,
  WIN_GLASS:    0x010c1a,
  CYAN:         0x00e5ff,
  RED:          0xff3333,
  GOLD:         0xffd700,
  GREEN:        0x00ff88,
  AMBER:        0xff8800,
}

interface Star { g: PIXI.Graphics; spd: number; W: number; H: number }
interface PlayerNode {
  gfx:      PIXI.Graphics
  label:    PIXI.Text
  baseX:    number
  baseY:    number
  playerId: string
}

export class PixiScene {
  app: PIXI.Application

  // Camera world-space container
  private world: PIXI.Container

  // Animated layers (in world space)
  private stars:       Star[]
  private playerNodes: PlayerNode[]
  private engineGfx:   PIXI.Graphics
  private statusGfx:   PIXI.Graphics
  private screenGfx:   PIXI.Graphics
  private dangerGfx:   PIXI.Graphics   // screen space

  // Ship geometry (world coords)
  private sx: number; private sy: number
  private sw: number; private sh: number
  private ix: number; private iy: number
  private iw: number; private ih: number
  private engW:      number
  private bridgeW:   number
  private floorY:    number
  private engCoreX:  number; private engCoreY: number; private engCoreH: number
  private nozzleY1:  number; private nozzleY2: number
  private bridgeX:   number
  private crewLeft:  number; private crewRight: number
  private crewTop:   number; private crewBottom: number

  private inDanger     = false
  private W:     number; private H: number
  private localPlayerId: string | null = null
  private keys = new Set<string>()

  private readonly onKD = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
      e.preventDefault()
      this.keys.add(k)
    }
  }
  private readonly onKU = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  constructor(canvas: HTMLCanvasElement) {
    this.W = window.innerWidth
    this.H = window.innerHeight

    this.app = new PIXI.Application({
      view:            canvas,
      width:           this.W,
      height:          this.H,
      backgroundColor: C.BG,
      antialias:       false,
      resolution:      1,
    })

    this.world      = new PIXI.Container()
    this.engineGfx  = new PIXI.Graphics()
    this.statusGfx  = new PIXI.Graphics()
    this.screenGfx  = new PIXI.Graphics()
    this.dangerGfx  = new PIXI.Graphics()
    this.stars       = []
    this.playerNodes = []

    // ── Ship geometry ──────────────────────────────────────────────────────
    this.sw    = WORLD_W - 200          // 2400 world width, ship = 2200
    this.sh    = Math.min(this.H * 0.62, 430)
    this.sx    = 100                    // world x of ship left edge
    this.sy    = (this.H - this.sh) / 2
    this.ix    = this.sx + HULL_T
    this.iy    = this.sy + HULL_T
    this.iw    = this.sw - HULL_T * 2
    this.ih    = this.sh - HULL_T * 2
    this.engW    = Math.floor(this.iw * 0.15)
    this.bridgeW = Math.floor(this.iw * 0.15)
    this.floorY  = this.iy + Math.floor(this.ih * 0.76)
    this.engCoreX = this.ix + Math.floor(this.engW * 0.32)
    this.engCoreY = this.iy + 26
    this.engCoreH = this.floorY - this.engCoreY
    this.nozzleY1 = this.sy + Math.floor(this.sh * 0.30)
    this.nozzleY2 = this.sy + Math.floor(this.sh * 0.62)
    this.bridgeX  = this.ix + this.iw - this.bridgeW

    // Crew movement bounds (world space)
    this.crewLeft   = this.ix + this.engW + 8
    this.crewRight  = this.bridgeX - 8
    this.crewTop    = this.iy + 24
    this.crewBottom = this.floorY - 14   // feet on floor

    // ── Build layers ──────────────────────────────────────────────────────
    this.buildNebula()     // screen space (app.stage)
    this.buildStars()      // screen space (app.stage)
    this.buildGrid()       // screen space (app.stage)
    // world container
    this.buildShipExterior()
    this.buildShipInterior()
    this.world.addChild(this.engineGfx)
    this.buildPlayerNodes()
    this.world.addChild(this.statusGfx)
    this.world.addChild(this.screenGfx)
    this.app.stage.addChild(this.world)
    this.app.stage.addChild(this.dangerGfx)

    // Initial camera: center on first player node
    const initNode = this.playerNodes[0]
    if (initNode) {
      this.world.x = Math.max(this.W - WORLD_W, Math.min(0, this.W / 2 - initNode.gfx.x))
    }

    window.addEventListener('keydown', this.onKD)
    window.addEventListener('keyup',   this.onKU)
    this.app.ticker.add(() => this.tick())
  }

  setLocalPlayerId(id: string) {
    this.localPlayerId = id
    // set initial position to center of crew space for the local node
    const node = this.playerNodes.find(n => n.playerId === id)
    if (node) {
      node.gfx.x = (this.crewLeft + this.crewRight) / 2
      node.gfx.y = this.crewBottom
    }
  }

  // ── Background (screen space) ─────────────────────────────────────────────
  private buildNebula() {
    const { W, H } = this
    const g = new PIXI.Graphics()
    const patches: [number, number, number, number][] = [
      [W * 0.12, H * 0.28, 220, 0x001144],
      [W * 0.88, H * 0.68, 170, 0x110022],
      [W * 0.50, H * 0.50, 140, 0x00001e],
      [W * 0.65, H * 0.15, 110, 0x002211],
    ]
    for (const [nx, ny, r, nc] of patches) {
      for (let s = r; s > 0; s -= 12) {
        g.beginFill(nc, (1 - s / r) * 0.11)
        g.drawRect(nx - s, ny - s * 0.6, s * 2, s * 1.2)
        g.endFill()
      }
    }
    this.app.stage.addChild(g)
  }

  private buildStars() {
    const { W, H } = this
    const layers = [
      { count: 260, size: 1, spdMin: 0.25, spdMax: 0.65, alpha: 0.30 },
      { count: 90,  size: 2, spdMin: 0.80, spdMax: 1.60, alpha: 0.55 },
      { count: 24,  size: 3, spdMin: 2.00, spdMax: 3.60, alpha: 0.82 },
    ]
    const container = new PIXI.Container()
    for (const { count, size, spdMin, spdMax, alpha } of layers) {
      for (let i = 0; i < count; i++) {
        const g = new PIXI.Graphics()
        g.beginFill(0xffffff, alpha * (0.55 + Math.random() * 0.45))
        g.drawRect(0, 0, size, size)
        g.endFill()
        g.x = Math.random() * W
        g.y = Math.random() * H
        const spd = spdMin + Math.random() * (spdMax - spdMin)
        container.addChild(g)
        this.stars.push({ g, spd, W, H })
      }
    }
    this.app.stage.addChild(container)
  }

  private buildGrid() {
    const { W, H } = this
    const g = new PIXI.Graphics()
    g.lineStyle(1, 0x001a44, 0.04)
    const gs = 66
    for (let x = 0; x <= W; x += gs) { g.moveTo(x, 0); g.lineTo(x, H) }
    for (let y = 0; y <= H; y += gs) { g.moveTo(0, y); g.lineTo(W, y) }
    this.app.stage.addChild(g)
  }

  // ── Ship exterior (world space) ───────────────────────────────────────────
  private buildShipExterior() {
    const { sx, sy, sw, sh } = this
    const g = new PIXI.Graphics()

    // Main hull body
    g.beginFill(C.HULL)
    g.drawRect(sx, sy, sw, sh)
    g.endFill()

    // ── Nose cone (RIGHT) ─────────────────────────────────────────────────
    const noseSegs = [
      { w: 16, h: sh * 0.78 },
      { w: 12, h: sh * 0.60 },
      { w: 9,  h: sh * 0.44 },
      { w: 7,  h: sh * 0.28 },
      { w: 5,  h: sh * 0.14 },
    ]
    let nx = sx + sw
    for (const seg of noseSegs) {
      g.beginFill(C.HULL_MID)
      g.drawRect(nx, sy + (sh - seg.h) / 2, seg.w, seg.h)
      g.endFill()
      nx += seg.w
    }
    g.beginFill(C.HULL_LIGHT)
    g.drawRect(sx + sw, sy + sh * 0.36, 6, sh * 0.28)
    g.endFill()

    // ── Engine nozzles (LEFT) ─────────────────────────────────────────────
    const nozzleW = 22; const nozzleH = 30
    for (const ny of [this.nozzleY1, this.nozzleY2]) {
      g.beginFill(C.HULL_MID)
      g.drawRect(sx - nozzleW, ny - nozzleH / 2, nozzleW, nozzleH)
      g.endFill()
      g.beginFill(0x020610)
      g.drawRect(sx - nozzleW + 4, ny - nozzleH / 2 + 4, nozzleW - 8, nozzleH - 8)
      g.endFill()
    }

    // Hull accent lines
    g.lineStyle(1, C.HULL_LIGHT, 0.25)
    g.moveTo(sx, sy + 8);       g.lineTo(sx + sw, sy + 8)
    g.moveTo(sx, sy + sh - 8);  g.lineTo(sx + sw, sy + sh - 8)
    g.lineStyle(0)

    this.world.addChild(g)
  }

  // ── Ship interior (world space) ───────────────────────────────────────────
  private buildShipInterior() {
    const { ix, iy, iw, ih, engW, bridgeW, floorY, bridgeX } = this
    const g = new PIXI.Graphics()
    const floorH = (this.iy + this.ih) - floorY

    // Interior base fill
    g.beginFill(C.INTERIOR)
    g.drawRect(ix, iy, iw, ih)
    g.endFill()

    // ── Porthole windows in top hull (5 panes) ────────────────────────────
    {
      const pW = 56; const pY = this.sy; const pH = HULL_T
      const positions = [0.12, 0.28, 0.50, 0.72, 0.88].map(
        t => this.sx + this.sw * t - pW / 2
      )
      const allX = [this.sx, ...positions.flatMap(p => [p, p + pW]), this.sx + this.sw]
      for (let i = 0; i < allX.length - 1; i += 2) {
        g.beginFill(C.HULL)
        g.drawRect(allX[i], pY, allX[i + 1] - allX[i], pH)
        g.endFill()
      }
      for (const px of positions) {
        g.beginFill(C.WIN_FRAME)
        g.drawRect(px - 3, pY, pW + 6, pH + 4)
        g.endFill()
        g.beginFill(C.WIN_GLASS, 0.72)
        g.drawRect(px, pY, pW, pH)
        g.endFill()
        g.beginFill(0x224466, 0.45)
        g.drawRect(px + 2, pY + 2, pW - 4, 3)
        g.endFill()
      }
    }

    // ── Bottom hull portholes (3 panes) ───────────────────────────────────
    {
      const pW = 44; const pY2 = this.sy + this.sh - HULL_T; const pH2 = HULL_T
      const positions = [0.30, 0.50, 0.70].map(t => this.sx + this.sw * t - pW / 2)
      for (const px of positions) {
        g.beginFill(C.WIN_FRAME)
        g.drawRect(px - 3, pY2 - 2, pW + 6, pH2 + 2)
        g.endFill()
        g.beginFill(C.WIN_GLASS, 0.72)
        g.drawRect(px, pY2, pW, pH2)
        g.endFill()
        g.beginFill(0x001133, 0.35)
        g.drawRect(px + 2, pY2 + pH2 - 5, pW - 4, 3)
        g.endFill()
      }
    }

    // ── Ceiling strip ──────────────────────────────────────────────────────
    g.beginFill(C.CEILING)
    g.drawRect(ix, iy, iw, Math.floor(ih * 0.07))
    g.endFill()

    const ceilH = Math.floor(ih * 0.07)
    // Main conduit
    g.beginFill(C.PIPE)
    g.drawRect(ix, iy + ceilH + 1, iw, 5)
    g.endFill()
    // Conduit joints
    g.beginFill(C.PIPE_JOINT)
    for (let px = ix + 50; px < ix + iw; px += 80) {
      g.drawRect(px - 3, iy + ceilH - 1, 10, 9)
    }
    g.endFill()
    // Secondary conduits
    g.beginFill(C.PIPE)
    g.drawRect(ix, iy + ceilH + 10, iw * 0.45, 3)
    g.drawRect(ix + iw * 0.55, iy + ceilH + 10, iw * 0.45, 3)
    g.endFill()
    // LED strip background
    g.beginFill(0x06101e)
    g.drawRect(ix + iw * 0.05, iy + ceilH + 17, iw * 0.90, 7)
    g.endFill()

    // ── Vertical support columns in crew space ────────────────────────────
    const crewSpaceW = this.crewRight - this.crewLeft
    const colCount = Math.floor(crewSpaceW / 300)
    for (let ci = 1; ci < colCount; ci++) {
      const cx = this.crewLeft + (ci / colCount) * crewSpaceW
      g.beginFill(C.HULL_MID)
      g.drawRect(cx - 4, iy + ceilH, 8, this.floorY - iy - ceilH)
      g.endFill()
      // Column detail
      g.beginFill(C.PIPE_JOINT)
      g.drawRect(cx - 5, iy + ceilH + 20, 10, 6)
      g.drawRect(cx - 5, this.floorY - 26, 10, 6)
      g.endFill()
    }

    // ── Floor plates ──────────────────────────────────────────────────────
    g.beginFill(C.FLOOR)
    g.drawRect(ix, floorY, iw, floorH)
    g.endFill()
    g.beginFill(C.FLOOR_LINE)
    for (let fx = ix + 2; fx < ix + iw; fx += 38) {
      g.drawRect(fx, floorY, 2, floorH)
    }
    g.endFill()
    g.beginFill(C.PIPE_JOINT)
    g.drawRect(ix, floorY, iw, 2)
    g.endFill()

    // ── Engine section (left) ─────────────────────────────────────────────
    g.beginFill(C.HULL_MID)
    g.drawRect(ix, iy, engW, ih)
    g.endFill()
    g.beginFill(0x050b18)
    g.drawRect(this.engCoreX - 2, this.engCoreY - 2, Math.floor(engW * 0.36) + 4, this.engCoreH + 4)
    g.endFill()
    for (let vy = iy + 12; vy < floorY - 8; vy += 18) {
      g.beginFill(C.HULL)
      g.drawRect(ix + 3, vy, Math.floor(engW * 0.22), 7)
      g.endFill()
    }
    g.beginFill(C.PIPE, 0.6)
    g.drawRect(ix + 2, floorY - 10, engW - 4, 8)
    g.endFill()

    // ── Bridge/cockpit section (right) ────────────────────────────────────
    g.beginFill(C.HULL_MID)
    g.drawRect(bridgeX, iy, this.bridgeW, ih)
    g.endFill()
    const screenW = this.bridgeW - 10
    for (const sy2 of [iy + 14, iy + 46, iy + 78]) {
      g.beginFill(0x010508)
      g.drawRect(bridgeX + 5, sy2, screenW, 26)
      g.endFill()
    }
    g.beginFill(C.PANEL)
    g.drawRect(bridgeX + 5, iy + 112, screenW, 16)
    g.endFill()
    for (let bi = 0; bi < 4; bi++) {
      const bx = bridgeX + 7 + bi * (screenW / 4)
      g.beginFill([C.RED, C.AMBER, C.GREEN, C.CYAN][bi], 0.75)
      g.drawRect(bx, iy + 116, screenW / 4 - 4, 8)
      g.endFill()
    }

    // Section dividers
    g.lineStyle(1, C.HULL, 0.9)
    g.moveTo(ix + engW, iy); g.lineTo(ix + engW, iy + ih)
    g.moveTo(bridgeX,   iy); g.lineTo(bridgeX,   iy + ih)
    g.lineStyle(0)

    // Crew space ambient glow
    g.beginFill(C.CYAN, 0.015)
    g.drawRect(ix + engW, iy, iw - engW - this.bridgeW, ih)
    g.endFill()

    // Rivets
    g.beginFill(C.RIVET)
    for (let rx = this.sx + 6; rx < this.sx + this.sw - 6; rx += 28) {
      g.drawRect(rx, this.sy + 4, 4, 4)
      g.drawRect(rx, this.sy + this.sh - 8, 4, 4)
    }
    g.endFill()

    // ── Hazard floor markings near engine ─────────────────────────────────
    const hzX = ix + engW; const hzW = 36
    for (let hyi = 0; hyi < 5; hyi++) {
      const on = hyi % 2 === 0
      g.beginFill(on ? 0xffcc00 : 0x110800, 0.55)
      g.drawRect(hzX + 1, floorY + 2 + hyi * (floorH / 5), hzW, floorH / 5 - 1)
      g.endFill()
    }

    this.world.addChild(g)
  }

  // ── Crew nodes ────────────────────────────────────────────────────────────
  private buildPlayerNodes() {
    const { crewLeft, crewRight, crewBottom } = this
    const crewW = crewRight - crewLeft
    const container = new PIXI.Container()

    for (let i = 0; i < 6; i++) {
      const t  = (i + 0.5) / 6
      const bx = crewLeft + t * crewW
      const by = crewBottom

      const gfx = new PIXI.Graphics()
      gfx.x = bx
      gfx.y = by
      this.drawCrew(gfx, C.CYAN, true, false, false)
      container.addChild(gfx)

      const label = new PIXI.Text('CREW', {
        fontFamily: "'Press Start 2P', monospace",
        fontSize:   6,
        fill:       C.CYAN,
        align:      'center',
      })
      label.anchor.set(0.5, 1)
      label.x = bx
      label.y = by - 22
      container.addChild(label)

      this.playerNodes.push({ gfx, label, baseX: bx, baseY: by, playerId: `slot_${i}` })
    }
    this.world.addChild(container)
  }

  private drawCrew(g: PIXI.Graphics, color: number, alive: boolean, isAi: boolean, isLocal: boolean) {
    g.clear()
    if (!alive) {
      g.lineStyle(2, 0x444455)
      g.moveTo(-7, -10); g.lineTo(7, 10)
      g.moveTo(7, -10);  g.lineTo(-7, 10)
      g.lineStyle(0)
      return
    }
    // Local player highlight ring
    if (isLocal) {
      g.beginFill(color, 0.08)
      g.drawRect(-18, -28, 36, 52)
      g.endFill()
      g.lineStyle(1, color, 0.6)
      g.drawRect(-18, -28, 36, 52)
      g.lineStyle(0)
    } else {
      g.beginFill(color, 0.04)
      g.drawRect(-14, -22, 28, 40)
      g.endFill()
    }
    // Head
    g.beginFill(color)
    g.drawRect(-6, -18, 12, 10)
    g.endFill()
    // Eyes
    g.beginFill(isAi ? 0xff4444 : 0xffffff)
    g.drawRect(-4, -15, 3, 3)
    g.drawRect(1, -15, 3, 3)
    g.endFill()
    // Body
    g.beginFill(color, 0.85)
    g.drawRect(-6, -6, 12, 12)
    g.endFill()
    // Arms
    g.beginFill(color, 0.70)
    g.drawRect(-10, -5, 4, 8)
    g.drawRect(6, -5, 4, 8)
    g.endFill()
    // Legs
    g.beginFill(color, 0.80)
    g.drawRect(-5, 6, 4, 8)
    g.drawRect(1, 6, 4, 8)
    g.endFill()
    if (isAi) {
      g.beginFill(0xff2222, 0.55)
      g.drawRect(-6, -16, 12, 2)
      g.endFill()
    }
    // Local player arrow indicator
    if (isLocal) {
      g.beginFill(color, 0.9)
      g.drawRect(-3, -30, 6, 4)
      g.drawRect(-1, -34, 2, 4)
      g.endFill()
    }
  }

  // ── External update from React ────────────────────────────────────────────
  updateFromGameState(state: GameState) {
    const { players, ship } = state
    this.inDanger = ship.hull_integrity < 30

    players.slice(0, 6).forEach((p, i) => {
      const node = this.playerNodes[i]
      if (!node) return
      node.playerId = p.id
      const isHuman  = p.type === 'human'
      const isLocal  = p.id === this.localPlayerId
      const color    = isHuman ? C.CYAN : 0xef5350
      this.drawCrew(node.gfx, color, p.alive, !isHuman, isLocal)
      node.label.text = (isLocal ? '> ' : '') + p.name.slice(0, 7).toUpperCase()
      node.label.style.fill = !p.alive ? 0x444455 : isLocal ? 0xffffff : isHuman ? C.CYAN : 0xef5350
    })
  }

  // ── Local player lookup ───────────────────────────────────────────────────
  private getLocalNode(): PlayerNode {
    return (
      (this.localPlayerId
        ? this.playerNodes.find(n => n.playerId === this.localPlayerId)
        : undefined)
      ?? this.playerNodes[0]
    )
  }

  // ── Animation tick ────────────────────────────────────────────────────────
  private tick() {
    const t  = this.app.ticker.lastTime / 1000
    const dt = this.app.ticker.deltaTime   // ≈1 at 60fps

    // ── Stars (screen space, right → left) ───────────────────────────────
    for (const { g, spd, W, H } of this.stars) {
      g.x -= spd * dt
      if (g.x < -4) {
        g.x = W + Math.random() * 80
        g.y = Math.random() * H
      }
    }

    // ── Local player WASD movement ────────────────────────────────────────
    const localNode = this.getLocalNode()
    if (localNode) {
      const dx = (this.keys.has('d') ? 1 : 0) - (this.keys.has('a') ? 1 : 0)
      const dy = (this.keys.has('s') ? 1 : 0) - (this.keys.has('w') ? 1 : 0)
      const dt_s = dt / 60
      localNode.gfx.x = Math.max(this.crewLeft,  Math.min(this.crewRight,  localNode.gfx.x + dx * SPEED * dt_s))
      localNode.gfx.y = Math.max(this.crewTop,    Math.min(this.crewBottom, localNode.gfx.y + dy * SPEED * dt_s * 0.5))
      localNode.label.x = localNode.gfx.x
      localNode.label.y = localNode.gfx.y - 22
    }

    // ── Camera follow local player ────────────────────────────────────────
    if (localNode) {
      const targetX  = this.W / 2 - localNode.gfx.x
      const clamped  = Math.max(this.W - WORLD_W, Math.min(0, targetX))
      // Smooth lerp
      this.world.x += (clamped - this.world.x) * 0.12
    }

    // ── Engine core + exhaust ─────────────────────────────────────────────
    const { engCoreX, engCoreY, engCoreH, nozzleY1, nozzleY2, sx } = this
    const engCoreW = Math.floor(this.engW * 0.36)
    this.engineGfx.clear()

    for (const ny of [nozzleY1, nozzleY2]) {
      for (let seg = 1; seg <= 8; seg++) {
        const alpha = (1 - seg / 8) * (0.45 + Math.sin(t * 12 + seg) * 0.2)
        const segLen = 12 + seg * 9
        const pulse  = 0.5 + Math.sin(t * 10 + ny * 0.01) * 0.5
        const rr = Math.floor(0x22 + pulse * 0x44)
        const gg = Math.floor(0x22 + pulse * 0x22)
        const bb = Math.floor(0xaa + pulse * 0x55)
        const narrowing = seg * 1.5
        this.engineGfx.beginFill((rr << 16) | (gg << 8) | bb, alpha)
        this.engineGfx.drawRect(sx - 18 - seg * 12, ny - 7 + narrowing / 2, segLen, 14 - narrowing)
        this.engineGfx.endFill()
      }
    }

    for (let seg = 0; seg < 6; seg++) {
      const alpha = 0.15 + Math.sin(t * 6 + seg * 0.8) * 0.10
      const pulse = 0.5 + Math.sin(t * 8 - seg * 0.5) * 0.5
      const rr = Math.floor(0x11 + pulse * 0x33)
      const bb = Math.floor(0xcc + pulse * 0x33)
      const inset = seg * 1.5
      this.engineGfx.beginFill((rr << 16) | (0x11 << 8) | bb, alpha + 0.3)
      this.engineGfx.drawRect(engCoreX + inset, engCoreY + (engCoreH * seg) / 6, engCoreW - inset * 2, engCoreH / 6)
      this.engineGfx.endFill()
    }

    // ── Ceiling LED strip ─────────────────────────────────────────────────
    const { ix, iy, iw, ih } = this
    const ledStripX = ix + iw * 0.05
    const ledStripW = iw * 0.90
    const ledY      = iy + Math.floor(ih * 0.07) + 18
    const ledCount  = 36
    const ledW      = Math.floor(ledStripW / ledCount) - 2
    this.statusGfx.clear()
    for (let li = 0; li < ledCount; li++) {
      const lx = ledStripX + li * (ledStripW / ledCount)
      if (this.inDanger) {
        const on = Math.floor(t * 4 + li * 0.3) % 2 === 0
        this.statusGfx.beginFill(on ? C.RED : 0x220000)
        this.statusGfx.drawRect(lx, ledY, ledW, 5)
        this.statusGfx.endFill()
      } else {
        const brightness = 0.5 + Math.sin(t * 1.5 + li * 0.4) * 0.15
        this.statusGfx.beginFill(C.GREEN, brightness)
        this.statusGfx.drawRect(lx, ledY, ledW, 5)
        this.statusGfx.endFill()
      }
    }

    // ── Bridge screens ────────────────────────────────────────────────────
    const { bridgeX, bridgeW } = this
    const screenW2 = bridgeW - 10
    const scanClr  = [C.CYAN, C.GREEN, C.GOLD]
    this.screenGfx.clear()
    for (let si = 0; si < 3; si++) {
      const sy2   = iy + 14 + si * 32
      const scanY = sy2 + ((t * 22 + si * 9) % 26)
      this.screenGfx.beginFill(scanClr[si], 0.18)
      this.screenGfx.drawRect(bridgeX + 5, sy2, screenW2, 26)
      this.screenGfx.endFill()
      this.screenGfx.beginFill(scanClr[si], 0.55)
      this.screenGfx.drawRect(bridgeX + 5, scanY, screenW2, 2)
      this.screenGfx.endFill()
      for (let di = 0; di < 4; di++) {
        const dx    = bridgeX + 7 + di * (screenW2 / 4)
        const dy    = sy2 + 6 + Math.floor(Math.sin(t * 2 + di + si) * 5)
        this.screenGfx.beginFill(scanClr[si], 0.3 + Math.sin(t * 3 + di) * 0.2)
        this.screenGfx.drawRect(dx, dy, screenW2 / 4 - 4, 4)
        this.screenGfx.endFill()
      }
    }

    // ── Non-local crew bob ────────────────────────────────────────────────
    this.playerNodes.forEach((node, i) => {
      const isLocal = this.localPlayerId
        ? node.playerId === this.localPlayerId
        : i === 0
      if (isLocal) return
      const bob = Math.sin(t * 0.9 + i * 1.1) * 3
      node.gfx.y  = node.baseY + bob
      node.label.x = node.gfx.x
      node.label.y = node.gfx.y - 22
    })

    // ── Danger vignette (screen space) ────────────────────────────────────
    this.dangerGfx.clear()
    if (this.inDanger) {
      const alpha  = Math.abs(Math.sin(t * 3.5)) * 0.08
      const bAlpha = Math.abs(Math.sin(t * 3.5)) * 0.80
      this.dangerGfx.beginFill(0xff0000, alpha)
      this.dangerGfx.drawRect(0, 0, this.W, this.H)
      this.dangerGfx.endFill()
      this.dangerGfx.lineStyle(6, 0xff0000, bAlpha)
      this.dangerGfx.drawRect(3, 3, this.W - 6, this.H - 6)
      this.dangerGfx.lineStyle(0)
    }

    // ── WASD hint (screen space, fades after first keypress) ──────────────
  }

  resize(w: number, h: number) {
    this.W = w; this.H = h
    this.app.renderer.resize(w, h)
  }

  dispose() {
    window.removeEventListener('keydown', this.onKD)
    window.removeEventListener('keyup',   this.onKU)
    this.app.destroy(false, { children: true })
  }
}
