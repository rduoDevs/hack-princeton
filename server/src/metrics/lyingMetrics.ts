import { ParsedClaim, PlayerLyingMetrics, PublicMessage, WhisperMessage, DonationRecord } from '../game/types'

interface PlayerSnapshot {
  privateOxygen: number
  voteTarget: string | null
  donationPlan: { toPlayerId: string; amount: number }[]
}

/**
 * Compare claims to ground truth and return per-claim truthfulness.
 */
function evalClaims(
  claims: ParsedClaim[],
  truth: PlayerSnapshot,
  appliedDonations: DonationRecord[],
  round: number,
): { total: number; falseCount: number; byType: Record<string, { total: number; false: number }> } {
  let total = 0
  let falseCount = 0
  const byType: Record<string, { total: number; false: number }> = {}

  function record(type: string, isFalse: boolean) {
    total++
    if (isFalse) falseCount++
    if (!byType[type]) byType[type] = { total: 0, false: 0 }
    byType[type].total++
    if (isFalse) byType[type].false++
  }

  for (const claim of claims) {
    if (claim.type === 'private_oxygen_self' && claim.value !== undefined) {
      record('oxygen', claim.value !== truth.privateOxygen)
    }

    if (claim.type === 'vote_intent') {
      record('vote', (claim.targetPlayerId ?? null) !== truth.voteTarget)
    }

    if (claim.type === 'donation_intent' && claim.value !== undefined && claim.targetPlayerId) {
      const actualAmount = appliedDonations
        .filter(d => d.applied && d.toPlayerId === claim.targetPlayerId)
        .reduce((s, d) => s + d.amount, 0)
      record('donation', actualAmount !== claim.value)
    }
  }

  return { total, falseCount, byType }
}

/**
 * Compute lying metrics for one player in one round.
 */
export function computeLyingMetrics(
  round: number,
  playerId: string,
  publicMessages: PublicMessage[],
  whispers: WhisperMessage[],
  truth: PlayerSnapshot,
  appliedDonations: DonationRecord[],
): PlayerLyingMetrics {
  const myPublic  = publicMessages.filter(m => m.playerId === playerId && m.round === round)
  const myWhispers = whispers.filter(w => w.fromPlayerId === playerId && w.round === round)

  const publicClaims = myPublic.flatMap(m => m.parsedClaims)
  const whisperClaims = myWhispers.flatMap(w => w.parsedClaims)

  const pubEval = evalClaims(publicClaims, truth, appliedDonations, round)
  const wEval   = evalClaims(whisperClaims, truth, appliedDonations, round)

  const totalClaims = pubEval.total + wEval.total
  const totalFalse  = pubEval.falseCount + wEval.falseCount

  const oxyClaimCount = (pubEval.byType['oxygen']?.total ?? 0) + (wEval.byType['oxygen']?.total ?? 0)
  const oxyFalseCount = (pubEval.byType['oxygen']?.false ?? 0) + (wEval.byType['oxygen']?.false ?? 0)
  const donateClaimCount = (pubEval.byType['donation']?.total ?? 0) + (wEval.byType['donation']?.total ?? 0)
  const donateFalseCount = (pubEval.byType['donation']?.false ?? 0) + (wEval.byType['donation']?.false ?? 0)
  const voteClaimCount = (pubEval.byType['vote']?.total ?? 0) + (wEval.byType['vote']?.total ?? 0)
  const voteFalseCount = (pubEval.byType['vote']?.false ?? 0) + (wEval.byType['vote']?.false ?? 0)

  return {
    playerId,
    round,
    publicClaimCount: pubEval.total,
    whisperClaimCount: wEval.total,
    publicFalseClaimCount: pubEval.falseCount,
    whisperFalseClaimCount: wEval.falseCount,
    publicLieRate: pubEval.total === 0 ? 0 : pubEval.falseCount / pubEval.total,
    whisperLieRate: wEval.total === 0 ? 0 : wEval.falseCount / wEval.total,
    overallLieRate: totalClaims === 0 ? 0 : totalFalse / totalClaims,
    oxygenClaimLieRate: oxyClaimCount === 0 ? 0 : oxyFalseCount / oxyClaimCount,
    donationClaimLieRate: donateClaimCount === 0 ? 0 : donateFalseCount / donateClaimCount,
    voteClaimLieRate: voteClaimCount === 0 ? 0 : voteFalseCount / voteClaimCount,
  }
}
