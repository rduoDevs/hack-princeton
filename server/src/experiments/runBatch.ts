/**
 * Headless AI-only batch experiment runner.
 * Usage: ts-node server/src/experiments/runBatch.ts [--sweep <name>] [--n <count>]
 *
 * All AI execution flows through Dedalus Runner SDK.
 * Writes per-game summaries to logs/games/ and per-turn JSONL to logs/turns/.
 * Writes aggregate JSON to logs/batch/<batchId>/aggregate.json.
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { GameEngine } from '../game/GameEngine'
import { GameConfig } from '../game/config'
import { SweepConfig, SCARCITY_SWEEPS, STRESS_SWEEPS, ROLE_SWEEPS, MONITOR_SWEEPS } from './sweeps'
import { buildGameSummary } from '../logging/SummaryLogger'

const BATCH_LOG_DIR = path.resolve(process.cwd(), 'logs', 'batch')

interface BatchResult {
  gameId:  string
  label:   string
  survivors: number
  rounds:  number
  totalOxygenRemaining: number
  configSnapshot: Partial<GameConfig>
}

async function runOne(label: string, cfg: Partial<GameConfig>, seed: number): Promise<BatchResult> {
  const engine = new GameEngine({
    ...cfg,
    headless: true,
    gameMode: 'all_ai_observer',
    rngSeed: seed,
  })
  engine.fillWithAI()
  await engine.start()

  const state    = engine.getFullState()
  const survivors = state.players.filter(p => p.alive).length
  const totalOxy  = state.publicOxygen
    + state.players.filter(p => p.alive).reduce((s, p) => s + p.privateOxygen, 0)

  return { gameId: engine.gameId, label, survivors, rounds: state.round, totalOxygenRemaining: totalOxy, configSnapshot: cfg }
}

async function runSweep(sweep: SweepConfig[], n: number): Promise<BatchResult[]> {
  const results: BatchResult[] = []
  let seed = Date.now()

  for (const s of sweep) {
    console.log(`[batch] Running sweep "${s.label}" x${n}`)
    for (let i = 0; i < n; i++) {
      try {
        const r = await runOne(s.label, { ...s.configOverrides }, seed++)
        results.push(r)
        console.log(`  [${s.label}] ${i + 1}/${n}: survivors=${r.survivors}, O2=${r.totalOxygenRemaining}`)
      } catch (err) {
        console.error(`  [${s.label}] game ${i + 1} error:`, err)
      }
    }
  }
  return results
}

async function main() {
  const args     = process.argv.slice(2)
  const sweepArg = args[args.indexOf('--sweep') + 1] ?? 'scarcity'
  const nGames   = parseInt(args[args.indexOf('--n') + 1] ?? '10', 10)

  const sweepMap: Record<string, SweepConfig[]> = {
    scarcity: SCARCITY_SWEEPS,
    stress:   STRESS_SWEEPS,
    roles:    ROLE_SWEEPS,
    monitor:  MONITOR_SWEEPS,
  }

  const sweep = sweepMap[sweepArg]
  if (!sweep) {
    console.error(`Unknown sweep: ${sweepArg}. Available: ${Object.keys(sweepMap).join(', ')}`)
    process.exit(1)
  }

  const batchId = `${sweepArg}_${Date.now()}`
  const outDir  = path.join(BATCH_LOG_DIR, batchId)
  fs.mkdirSync(outDir, { recursive: true })

  console.log(`[batch] Starting ${batchId}, sweep=${sweepArg}, n=${nGames}`)
  const results = await runSweep(sweep, nGames)

  const byLabel: Record<string, BatchResult[]> = {}
  for (const r of results) {
    if (!byLabel[r.label]) byLabel[r.label] = []
    byLabel[r.label].push(r)
  }

  const aggregate = Object.entries(byLabel).map(([label, rr]) => {
    const n            = rr.length
    const avgSurvivors = rr.reduce((s, r) => s + r.survivors, 0) / n
    const avgOxy       = rr.reduce((s, r) => s + r.totalOxygenRemaining, 0) / n
    return { label, n, avgSurvivors, avgOxy }
  })

  const outPath = path.join(outDir, 'aggregate.json')
  fs.writeFileSync(outPath, JSON.stringify({ batchId, sweep: sweepArg, aggregate, results }, null, 2))
  console.log(`[batch] Done. Aggregate → ${outPath}`)
}

main().catch(e => { console.error(e); process.exit(1) })
