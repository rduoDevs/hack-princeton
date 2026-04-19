import { GameConfig } from './config'
import { PlayerState } from './types'

export function stressForRound(schedule: number[], round: number): number {
  return schedule[round - 1] ?? 0
}

export function roundDemand(
  aliveCount: number,
  config: GameConfig,
  stressExtra: number,
): number {
  return aliveCount * config.baseConsumptionPerAlivePlayerPerRound + stressExtra
}

/**
 * Apply oxygen consumption. Public oxygen drawn first; remaining deficit
 * split evenly across alive players. Remainder distributed by ascending seatIndex.
 */
export function applyConsumption(
  publicOxygen: number,
  players: PlayerState[],
  demand: number,
): { publicOxygen: number; players: PlayerState[] } {
  const ps = players.map(p => ({ ...p }))
  let pub = publicOxygen

  const fromPublic = Math.min(pub, demand)
  pub -= fromPublic
  const deficit = demand - fromPublic

  if (deficit > 0) {
    const alive = ps.filter(p => p.alive).sort((a, b) => a.seatIndex - b.seatIndex)
    const n   = alive.length
    const base = Math.floor(deficit / n)
    const rem  = deficit - base * n

    alive.forEach((p, i) => {
      const owe = base + (i < rem ? 1 : 0)
      p.privateOxygen = Math.max(0, p.privateOxygen - owe)
    })
  }

  return { publicOxygen: pub, players: ps }
}

export function applyOxygenDeaths(
  players: PlayerState[],
  deathThreshold: number,
  round: number,
): { players: PlayerState[]; died: string[] } {
  const died: string[] = []
  const ps = players.map(p => {
    if (p.alive && p.privateOxygen <= deathThreshold) {
      died.push(p.id)
      return { ...p, alive: false, deathRound: round, deathReason: 'oxygen' as const }
    }
    return { ...p }
  })
  return { players: ps, died }
}

/**
 * Max players survivable to end-of-game from current state.
 * rounds_remaining_inclusive = totalRounds - currentRound + 1 (inclusive).
 */
export function maxSurvivablePlayers(
  publicOxygen: number,
  players: PlayerState[],
  config: GameConfig,
  currentRound: number,
  stressSchedule: number[],
): number {
  const roundsRemaining = config.totalRounds - currentRound
  if (roundsRemaining <= 0) return players.filter(p => p.alive).length

  const alive      = players.filter(p => p.alive)
  const totalOxygen = publicOxygen + alive.reduce((s, p) => s + p.privateOxygen, 0)

  let remainingStress = 0
  for (let r = currentRound + 1; r <= config.totalRounds; r++) {
    remainingStress += stressSchedule[r - 1] ?? 0
  }

  const needPerSurvivor = config.baseConsumptionPerAlivePlayerPerRound * roundsRemaining
  if (needPerSurvivor <= 0) return alive.length

  const affordableOxygen = Math.max(0, totalOxygen - remainingStress)
  return Math.min(alive.length, Math.floor(affordableOxygen / needPerSurvivor))
}

export function sampleStressSchedule(totalRounds: number, seed: number): number[] {
  const POOL = [0, 0, 1, 2]
  const rng  = seededRng(seed)
  return Array.from({ length: totalRounds }, () => POOL[Math.floor(rng() * POOL.length)])
}

function seededRng(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0x100000000
  }
}
