import * as fs from 'fs'
import * as path from 'path'
import { PlayerPersonalityProfile } from '../game/types'

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'personalities')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export interface GamePersonalityReport {
  gameId: string
  totalRounds: number
  profiles: PlayerPersonalityProfile[]
}

export function writePersonalityReport(report: GamePersonalityReport): string {
  ensureDir(LOG_DIR)
  const fp = path.join(LOG_DIR, `${report.gameId}.json`)
  fs.writeFileSync(fp, JSON.stringify(report, null, 2))
  return fp
}
