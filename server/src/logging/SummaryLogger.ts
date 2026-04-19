import * as fs from 'fs'
import * as path from 'path'
import { FullGameState } from '../game/types'
import { endGameMetrics } from '../metrics/deterministicMetrics'
import { buildAllGraphs } from '../metrics/socialGraphs'
import { buildAggregateVoteMatrix6x6, buildAggregateDonationMatrix6x6, exportRoundMatrices } from '../metrics/matrixExport'

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'games')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export interface GameSummary {
  gameId: string
  gameMode: string
  config: object
  rounds: number
  isHumanRun: boolean
  endMetrics: ReturnType<typeof endGameMetrics>
  roundSummaries: FullGameState['roundSummaries']
  roundMatrixExports: ReturnType<typeof exportRoundMatrices>[]
  aggregateVoteMatrix6x6: number[][]
  aggregateDonationMatrix6x6: number[][]
  graphs: ReturnType<typeof buildAllGraphs>
  winnerSummary: FullGameState['winnerSummary']
  maxSurvivablePlayersTrajectory: number[]
}

export function buildGameSummary(state: FullGameState): GameSummary {
  const isHumanRun = state.players.some(p => p.type === 'human')
  const roundMatrixExports = state.roundSummaries.map(s => exportRoundMatrices(state, s.round))

  return {
    gameId:    state.gameId,
    gameMode:  state.config.gameMode,
    config:    state.config,
    rounds:    state.round,
    isHumanRun,
    endMetrics:     endGameMetrics(state),
    roundSummaries: state.roundSummaries,
    roundMatrixExports,
    aggregateVoteMatrix6x6:     buildAggregateVoteMatrix6x6(state),
    aggregateDonationMatrix6x6: buildAggregateDonationMatrix6x6(state),
    graphs:          buildAllGraphs(state),
    winnerSummary:   state.winnerSummary,
    maxSurvivablePlayersTrajectory: state.maxSurvivablePlayersTrajectory,
  }
}

export function writeSummary(summary: GameSummary): string {
  ensureDir(LOG_DIR)
  const fp = path.join(LOG_DIR, `${summary.gameId}.json`)
  fs.writeFileSync(fp, JSON.stringify(summary, null, 2))
  return fp
}
