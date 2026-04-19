import { FullGameState, VoteRecord, DonationRecord, PaddedRoundExport } from '../game/types'

const SLOTS = 6

/**
 * Build a padded 6x6 vote matrix for a single round.
 * voting_matrix[i][j] = 1 if player at slot i voted for player at slot j.
 */
export function buildVotingMatrix6x6(
  votes: VoteRecord[],
  players: { id: string; seatIndex: number }[],
): number[][] {
  const mat = Array.from({ length: SLOTS }, () => new Array<number>(SLOTS).fill(0))
  for (const v of votes) {
    if (!v.targetPlayerId) continue
    const voter  = players.find(p => p.id === v.voterPlayerId)
    const target = players.find(p => p.id === v.targetPlayerId!)
    if (voter && target && voter.seatIndex < SLOTS && target.seatIndex < SLOTS) {
      mat[voter.seatIndex][target.seatIndex] = 1
    }
  }
  return mat
}

/**
 * Build a padded 6x6 donation matrix for a single round.
 * donation_matrix[i][j] = oxygen donated from slot i to slot j.
 */
export function buildDonationMatrix6x6(
  donations: DonationRecord[],
  players: { id: string; seatIndex: number }[],
): number[][] {
  const mat = Array.from({ length: SLOTS }, () => new Array<number>(SLOTS).fill(0))
  for (const d of donations) {
    if (!d.applied) continue
    const from = players.find(p => p.id === d.fromPlayerId)
    const to   = players.find(p => p.id === d.toPlayerId)
    if (from && to && from.seatIndex < SLOTS && to.seatIndex < SLOTS) {
      mat[from.seatIndex][to.seatIndex] += d.amount
    }
  }
  return mat
}

/**
 * Build survivability vector of length 6.
 * survivability_vector[i] = 1 if player at slot i is alive.
 */
export function buildSurvivabilityVector6x1(
  players: { id: string; seatIndex: number; alive: boolean }[],
): number[] {
  const vec = new Array<number>(SLOTS).fill(0)
  for (const p of players) {
    if (p.seatIndex < SLOTS) vec[p.seatIndex] = p.alive ? 1 : 0
  }
  return vec
}

/**
 * Export all padded matrices for a single round from the full game state.
 */
export function exportRoundMatrices(
  state: FullGameState,
  round: number,
): PaddedRoundExport {
  const roundVotes = state.voteHistory.filter(v => v.round === round)
  const roundDonations = state.donationHistory.filter(d => d.round === round)
  const players = state.players

  // Use players as-of end of round (from roundSummary)
  const summary = state.roundSummaries.find(s => s.round === round)
  const survivabilityPlayers = players.map(p => ({
    id: p.id,
    seatIndex: p.seatIndex,
    alive: summary ? (summary.privateOxygenByPlayerEnd[p.id] !== undefined ? p.deathRound === null || p.deathRound > round : false) : p.alive,
  }))
  // Simpler: use elimination history to determine alive status after this round
  const deadAfterRound = new Set(
    state.eliminationHistory.filter(e => e.round <= round).map(e => e.playerId)
  )
  const survPlayers = players.map(p => ({
    id: p.id,
    seatIndex: p.seatIndex,
    alive: !deadAfterRound.has(p.id),
  }))

  const publicOxygenAmount = summary?.publicOxygenEnd ?? state.publicOxygen

  return {
    round,
    votingMatrix6x6:         buildVotingMatrix6x6(roundVotes, players),
    donationMatrix6x6:       buildDonationMatrix6x6(roundDonations, players),
    survivabilityVector6x1:  buildSurvivabilityVector6x1(survPlayers),
    publicOxygenAmount,
  }
}

/**
 * Build aggregate vote matrix (sum across all rounds).
 */
export function buildAggregateVoteMatrix6x6(state: FullGameState): number[][] {
  const mat = Array.from({ length: SLOTS }, () => new Array<number>(SLOTS).fill(0))
  for (const v of state.voteHistory) {
    if (!v.targetPlayerId) continue
    const voter  = state.players.find(p => p.id === v.voterPlayerId)
    const target = state.players.find(p => p.id === v.targetPlayerId!)
    if (voter && target && voter.seatIndex < SLOTS && target.seatIndex < SLOTS) {
      mat[voter.seatIndex][target.seatIndex]++
    }
  }
  return mat
}

/**
 * Build aggregate donation matrix (sum across all rounds).
 */
export function buildAggregateDonationMatrix6x6(state: FullGameState): number[][] {
  const mat = Array.from({ length: SLOTS }, () => new Array<number>(SLOTS).fill(0))
  for (const d of state.donationHistory) {
    if (!d.applied) continue
    const from = state.players.find(p => p.id === d.fromPlayerId)
    const to   = state.players.find(p => p.id === d.toPlayerId)
    if (from && to && from.seatIndex < SLOTS && to.seatIndex < SLOTS) {
      mat[from.seatIndex][to.seatIndex] += d.amount
    }
  }
  return mat
}
